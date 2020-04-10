const WebSocket = require('ws');
// Import the game file.
var guizlogic = require('./gameserverlogic');
 
let _port = process.env.PORT || '80';
console.log('listening on port ' + _port);
const wss = new WebSocket.Server({ port: 443 });

function noop() {}
 
function heartbeat() { this.isAlive = true;}

wss.on('connection', function connection(ws, request) {
    let id = request.headers['sec-websocket-key'];
    guizlogic.initGame(ws, request);
    ws.isAlive = true;
    ws.on('pong', heartbeat);
    console.log('client connected - ' + id);
});

const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
      if (ws.isAlive === false) return ws.terminate();
   
      ws.isAlive = false;
      ws.ping(noop);
    });
  }, 30000);
   
  wss.on('close', function close() {
    clearInterval(interval);
  });
