# battleship-node
A battleship clone written in node.js

## Installation
It is heavily encouraged to use this project as a backend and build your own frontend.
Please submit your frontend either by creating a pull request or by sending an email to: [battleship@kendlbat.dev](mailto:battleship@kendlbat.dev)

### Standalone
```bash
docker pull ghcr.io/kendlbat/battleship-node:latest
docker run -p 8080:8080 ghcr.io/kendlbat/battleship-node:latest
```

### Dockerfile
```dockerfile
FROM ghcr.io/kendlbat/battleship-node:latest
EXPOSE 8080
```

### Docker Compose
```yaml
version: "3.9"
services:
  battleship-node:
    image: ghcr.io/kendlbat/battleship-node:latest
    ports:
      - "8080:8080" 
```

### Node
```bash
git clone https://github.com/kendlbat/battleship-node
cd battleship-node
node server.js
```