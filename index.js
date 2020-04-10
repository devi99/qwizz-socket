//import * as express from 'express';
//import * as WebSocket from 'ws';
const express = require('express');
const WebSocket = require('ws');

// Import the game file.
var guizlogic = require('./gameserverlogic');
 
const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new WebSocket.Server({ server });

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
