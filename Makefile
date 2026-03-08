.PHONY: install client dev clean

# Install dependencies
install:
	cd client && npm install

# Run client (Electron + Vite dev)
client:
	cd client && npm run dev

# Alias
dev: client

# Clean
clean:
	rm -rf client/dist client/dist-electron client/node_modules
