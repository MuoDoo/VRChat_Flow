.PHONY: install install-server install-client server client dev clean \
       server-start server-stop server-restart server-status server-log

PORT ?= 8080
SERVER_PID = server/.server.pid
SERVER_LOG = server/.server.log

# Install all dependencies
install: install-server install-client

install-server:
	cd server && python3 -m venv .venv && . .venv/bin/activate && \
		pip install -r requirements.txt -q

install-client:
	cd client && npm install

# Run server foreground
server: server-stop
	cd server && . .venv/bin/activate && python main.py

# Run server in background
server-start: server-stop
	@cd server && . .venv/bin/activate && \
		nohup python main.py > .server.log 2>&1 & echo $$! > $(SERVER_PID)
	@sleep 1
	@if [ -f $(SERVER_PID) ] && kill -0 $$(cat $(SERVER_PID)) 2>/dev/null; then \
		echo "Server started (pid $$(cat $(SERVER_PID)), port $(PORT))"; \
	else \
		echo "Server failed to start. Check: make server-log"; \
		rm -f $(SERVER_PID); exit 1; \
	fi

# Stop server
server-stop:
	@if [ -f $(SERVER_PID) ]; then \
		PID=$$(cat $(SERVER_PID)); \
		kill $$PID 2>/dev/null || true; \
		rm -f $(SERVER_PID); \
	fi
	@sleep 0.3; \
	PIDS=$$(lsof -ti tcp:$(PORT) 2>/dev/null || true); \
	if [ -n "$$PIDS" ]; then \
		echo $$PIDS | xargs kill 2>/dev/null || true; \
		sleep 0.3; \
		PIDS=$$(lsof -ti tcp:$(PORT) 2>/dev/null || true); \
		if [ -n "$$PIDS" ]; then echo $$PIDS | xargs kill -9 2>/dev/null || true; fi; \
	fi
	@echo "Server stopped"

# Restart server (background)
server-restart: server-stop server-start

# Show server status
server-status:
	@if [ -f $(SERVER_PID) ] && kill -0 $$(cat $(SERVER_PID)) 2>/dev/null; then \
		echo "Running (pid $$(cat $(SERVER_PID)), port $(PORT))"; \
	else \
		PID=$$(lsof -ti tcp:$(PORT) 2>/dev/null); \
		if [ -n "$$PID" ]; then \
			echo "Running (pid $$PID on port $(PORT), unmanaged)"; \
		else \
			echo "Stopped"; \
		fi; \
	fi

# Tail server log
server-log:
	@if [ -f $(SERVER_LOG) ]; then \
		tail -50 $(SERVER_LOG); \
	else \
		echo "No log file. Start with: make server-start"; \
	fi

# Run client (Electron + Vite dev)
client:
	cd client && npm run dev

# Run both
dev: server-start
	cd client && npm run dev

# Clean
clean: server-stop
	rm -rf client/dist client/dist-electron client/node_modules
	rm -rf server/.venv server/__pycache__ server/routers/__pycache__ server/vrcflow.db
	rm -f $(SERVER_PID) $(SERVER_LOG)
