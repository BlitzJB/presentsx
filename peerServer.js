const { PeerServer } = require('peer');

const peerServer = PeerServer({ port: 8000, path: '/myapp' });

peerServer.on('connection', (client) => {
  console.log('Client connected:', client.getId());
});

peerServer.on('disconnect', (client) => {
  console.log('Client disconnected:', client.getId());
});

console.log('PeerServer running on port 8000');