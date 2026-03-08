import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";
import { viteStaticCopy } from "vite-plugin-static-copy";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ortDist = path.resolve(__dirname, "node_modules/onnxruntime-web/dist");
const vadDist = path.resolve(__dirname, "node_modules/@ricky0123/vad-web/dist");

// Dev-only: serve ONNX/VAD runtime files directly from node_modules as raw binary.
// Prevents Vite from transforming or corrupting these files.
function serveVadAssetsPlugin() {
  return {
    name: "serve-vad-assets",
    apply: "serve" as const,
    configureServer(server: { middlewares: { use: (fn: Function) => void } }) {
      return () => {
        server.middlewares.use(
          (
            req: { url?: string },
            res: { setHeader(k: string, v: string): void; end(data: Buffer): void },
            next: () => void
          ) => {
            const url = req.url?.split("?")[0];
            if (!url) return next();

            // Map URL to file in node_modules
            let filePath: string | null = null;
            let contentType = "application/octet-stream";

            if (url.startsWith("/ort-wasm") && url.endsWith(".wasm")) {
              filePath = path.join(ortDist, url.slice(1));
              contentType = "application/wasm";
            } else if (url.endsWith(".onnx")) {
              filePath = path.join(vadDist, url.slice(1));
            } else if (url === "/vad.worklet.bundle.min.js") {
              filePath = path.join(vadDist, "vad.worklet.bundle.min.js");
              contentType = "application/javascript";
            }

            if (filePath && fs.existsSync(filePath)) {
              res.setHeader("Content-Type", contentType);
              res.setHeader("Cache-Control", "no-cache");
              res.end(fs.readFileSync(filePath));
              return;
            }
            next();
          }
        );
      };
    },
  };
}

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf-8"));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    serveVadAssetsPlugin(),
    electron([
      {
        entry: "electron/main.ts",
        vite: {
          build: {
            outDir: "dist-electron",
            rollupOptions: {
              external: ["electron", "electron-store", "dgram", "ws"],
            },
          },
        },
      },
      {
        entry: "electron/preload.ts",
        onstart(args) {
          args.reload();
        },
        vite: {
          build: {
            outDir: "dist-electron",
            rollupOptions: {
              external: ["electron"],
            },
          },
        },
      },
    ]),
    renderer(),
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm",
          dest: ".",
        },
        {
          src: "node_modules/onnxruntime-web/dist/ort-wasm-simd.wasm",
          dest: ".",
        },
        {
          src: "node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js",
          dest: ".",
        },
        {
          src: "node_modules/@ricky0123/vad-web/dist/silero_vad_legacy.onnx",
          dest: ".",
        },
      ],
    }),
  ],
  build: {
    outDir: "dist",
  },
});
