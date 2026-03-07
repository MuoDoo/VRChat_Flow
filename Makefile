.PHONY: install install-server install-client server client dev clean

# Install all dependencies
install: install-server install-client

install-server:
	cd server && python3 -m venv .venv && . .venv/bin/activate && \
		pip install -r requirements.txt -q

install-client:
	cd client && npm install

# Run server (port 8080)
server:
	cd server && . .venv/bin/activate && python main.py

# Run client (Electron + Vite dev)
client:
	cd client && npm run dev

# Run both server and client
dev:
	@echo "Starting server and client..."
	@cd server && . .venv/bin/activate && python main.py &
	@sleep 2
	@cd client && npm run dev

# Remove generated files
clean:
	rm -rf client/dist client/dist-electron client/node_modules
	rm -rf server/.venv server/__pycache__ server/routers/__pycache__ server/vrcflow.db
