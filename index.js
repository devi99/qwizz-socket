const WebSocket = require('ws');
// Import the game file.
var guizlogic = require('./gameserverlogic');
 
let _port = process.env.PORT || '80';
console.log('listening on port' + port);
const wss = new WebSocket.Server({ port: _port });
 
wss.on('connection', function connection(ws) {

    console.log('client connected')
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
  });
 
  ws.send('something');
});
