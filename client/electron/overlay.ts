/**
 * SteamVR Overlay via Koffi FFI → openvr_api.dll
 *
 * Uses the OpenVR flat C API (FnTable pattern) to create and manage
 * an overlay that displays translated text in VR.
 *
 * Windows-only. Gracefully degrades on other platforms.
 */

import path from "node:path";
import fs from "node:fs";
import { app } from "electron";

// Only load koffi on Windows where OpenVR is available
let koffi: typeof import("koffi") | null = null;

// ─── OpenVR FnTable slot indices (IVROverlay_028) ───
// Counted from openvr_capi.h struct VR_IVROverlay_FnTable
const SLOT = {
  FindOverlay: 0,
  CreateOverlay: 1,
  DestroyOverlay: 3,
  SetOverlayAlpha: 16,
  SetOverlayWidthInMeters: 22,
  SetOverlayTransformAbsolute: 33,
  SetOverlayTransformTrackedDeviceRelative: 35,
  ShowOverlay: 43,
  HideOverlay: 44,
  SetOverlayRaw: 62,
  SetOverlayFromFile: 63,
} as const;

// ─── State ───
let initialized = false;
let overlayHandle: bigint = 0n;
let lib: any = null;
let fnTable: any = null; // raw pointer to FnTable
let fnCache: Map<number, any> = new Map(); // decoded function pointers

// ─── Koffi proto declarations (lazily created) ───
let protos: Record<string, any> = {};

function ensureProtos() {
  if (protos.CreateOverlay) return;

  // HmdMatrix34_t: 12 floats (3 rows × 4 cols), flattened
  koffi!.struct("HmdMatrix34_t", {
    m: koffi!.array("float", 12),
  });

  protos.CreateOverlay = koffi!.proto(
    "int CreateOverlay(str key, str name, _Out_ uint64_t *handle)"
  );
  protos.DestroyOverlay = koffi!.proto(
    "int DestroyOverlay(uint64_t handle)"
  );
  protos.SetOverlayAlpha = koffi!.proto(
    "int SetOverlayAlpha(uint64_t handle, float alpha)"
  );
  protos.SetOverlayWidthInMeters = koffi!.proto(
    "int SetOverlayWidthInMeters(uint64_t handle, float width)"
  );
  protos.SetOverlayTransformTrackedDeviceRelative = koffi!.proto(
    "int SetOverlayTransformTrackedDeviceRelative(uint64_t handle, uint32_t device, HmdMatrix34_t *mat)"
  );
  protos.ShowOverlay = koffi!.proto("int ShowOverlay(uint64_t handle)");
  protos.HideOverlay = koffi!.proto("int HideOverlay(uint64_t handle)");
  protos.SetOverlayRaw = koffi!.proto(
    "int SetOverlayRaw(uint64_t handle, const uint8_t *buf, uint32_t w, uint32_t h, uint32_t bpp)"
  );
  protos.SetOverlayFromFile = koffi!.proto(
    "int SetOverlayFromFile(uint64_t handle, str path)"
  );
}

/** Read a function pointer from the FnTable at a given slot index */
function getFn(slot: number, proto: any): any {
  if (fnCache.has(slot)) return fnCache.get(slot);
  // Each slot is a pointer (8 bytes on x64)
  const fnPtr = koffi!.decode(fnTable, slot * 8, "void *");
  const fn = koffi!.decode(fnPtr, proto);
  fnCache.set(slot, fn);
  return fn;
}

function call(slot: number, protoName: string, ...args: any[]): number {
  const fn = getFn(slot, protos[protoName]);
  return fn(...args);
}

function findDllPath(): string | null {
  // In development: client/resources/openvr_api.dll
  const devPath = path.join(__dirname, "../../resources/openvr_api.dll");
  if (fs.existsSync(devPath)) return devPath;

  // In production (packaged): resources/openvr_api.dll
  const prodPath = path.join(process.resourcesPath || "", "openvr_api.dll");
  if (fs.existsSync(prodPath)) return prodPath;

  // Also check next to the exe
  const exePath = path.join(path.dirname(app.getPath("exe")), "openvr_api.dll");
  if (fs.existsSync(exePath)) return exePath;

  return null;
}

// ─── Public API ───

export function isOverlaySupported(): boolean {
  return process.platform === "win32";
}

export function initOverlay(): { ok: boolean; error?: string } {
  if (initialized) return { ok: true };
  if (process.platform !== "win32") {
    return { ok: false, error: "SteamVR overlay is only supported on Windows" };
  }

  try {
    koffi = require("koffi");
  } catch (e) {
    return { ok: false, error: `Failed to load koffi: ${e}` };
  }

  const dllPath = findDllPath();
  if (!dllPath) {
    return { ok: false, error: "openvr_api.dll not found" };
  }

  try {
    lib = koffi!.load(dllPath);
  } catch (e) {
    return { ok: false, error: `Failed to load openvr_api.dll: ${e}` };
  }

  // Declare top-level OpenVR functions
  const VR_InitInternal = lib.func(
    "intptr_t VR_InitInternal(_Out_ int *peError, int eType)"
  );
  const VR_GetGenericInterface = lib.func(
    "void *VR_GetGenericInterface(str pchVersion, _Out_ int *peError)"
  );

  // Initialize OpenVR as overlay application (type 2 = VRApplication_Overlay)
  const initErr = [0];
  VR_InitInternal(initErr, 2);
  if (initErr[0] !== 0) {
    return {
      ok: false,
      error: `VR_InitInternal failed (error ${initErr[0]}). Is SteamVR running?`,
    };
  }

  // Get IVROverlay FnTable
  const ifaceErr = [0];
  fnTable = VR_GetGenericInterface("FnTable:IVROverlay_028", ifaceErr);
  if (ifaceErr[0] !== 0 || !fnTable) {
    return {
      ok: false,
      error: `Failed to get IVROverlay interface (error ${ifaceErr[0]})`,
    };
  }

  ensureProtos();

  // Create the overlay
  const handleBuf = Buffer.alloc(8);
  const createErr = call(
    SLOT.CreateOverlay,
    "CreateOverlay",
    "vrcflow.speaker.overlay",
    "VRCFlow Translation",
    handleBuf
  );
  if (createErr !== 0) {
    return { ok: false, error: `CreateOverlay failed (error ${createErr})` };
  }
  overlayHandle = handleBuf.readBigUInt64LE();

  // Configure defaults
  call(SLOT.SetOverlayWidthInMeters, "SetOverlayWidthInMeters", overlayHandle, 0.4);
  call(SLOT.SetOverlayAlpha, "SetOverlayAlpha", overlayHandle, 0.85);

  // Position relative to HMD (device 0): slightly below and in front
  // HmdMatrix34_t flattened: [right, up, forward] rows, 4 cols each
  // Identity rotation, translate: x=0, y=-0.15m (below), z=-0.5m (in front)
  const transform = {
    m: [
      1, 0, 0, 0,      // right axis
      0, 1, 0, -0.15,   // up axis, shifted down
      0, 0, 1, -0.5,    // forward axis, in front
    ],
  };
  call(
    SLOT.SetOverlayTransformTrackedDeviceRelative,
    "SetOverlayTransformTrackedDeviceRelative",
    overlayHandle,
    0, // TrackedDeviceIndex 0 = HMD
    transform
  );

  initialized = true;
  return { ok: true };
}

export function updateOverlayImage(
  rgbaBuffer: Buffer,
  width: number,
  height: number
): boolean {
  if (!initialized) return false;
  const err = call(
    SLOT.SetOverlayRaw,
    "SetOverlayRaw",
    overlayHandle,
    rgbaBuffer,
    width,
    height,
    4
  );
  return err === 0;
}

export function updateOverlayFromFile(filePath: string): boolean {
  if (!initialized) return false;
  const err = call(
    SLOT.SetOverlayFromFile,
    "SetOverlayFromFile",
    overlayHandle,
    filePath
  );
  return err === 0;
}

export function showOverlay(): boolean {
  if (!initialized) return false;
  return call(SLOT.ShowOverlay, "ShowOverlay", overlayHandle) === 0;
}

export function hideOverlay(): boolean {
  if (!initialized) return false;
  return call(SLOT.HideOverlay, "HideOverlay", overlayHandle) === 0;
}

export function setOverlayAlpha(alpha: number): boolean {
  if (!initialized) return false;
  return (
    call(SLOT.SetOverlayAlpha, "SetOverlayAlpha", overlayHandle, alpha) === 0
  );
}

export function setOverlayWidth(meters: number): boolean {
  if (!initialized) return false;
  return (
    call(
      SLOT.SetOverlayWidthInMeters,
      "SetOverlayWidthInMeters",
      overlayHandle,
      meters
    ) === 0
  );
}

export function setOverlayPosition(
  trackerIndex: number,
  x: number,
  y: number,
  z: number
): boolean {
  if (!initialized) return false;
  const transform = {
    m: [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z],
  };
  return (
    call(
      SLOT.SetOverlayTransformTrackedDeviceRelative,
      "SetOverlayTransformTrackedDeviceRelative",
      overlayHandle,
      trackerIndex,
      transform
    ) === 0
  );
}

export function shutdownOverlay(): void {
  if (!initialized) return;

  try {
    call(SLOT.DestroyOverlay, "DestroyOverlay", overlayHandle);
    const VR_ShutdownInternal = lib.func("void VR_ShutdownInternal()");
    VR_ShutdownInternal();
  } catch {
    // Best-effort cleanup
  }

  initialized = false;
  overlayHandle = 0n;
  fnTable = null;
  fnCache.clear();
}
