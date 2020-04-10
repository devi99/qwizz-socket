var _ws;
var gameSocket;
//var db;
var db = require('./db');
var async = require('async');
let rooms = [];

/**
 * This function is called by index.js to initialize a new game instance.
 *
 * @param sio The Socket.IO library
 * @param socket The socket object for the connected client.
 */
exports.initGame = function(ws, request){
    _ws = ws;
    gameSocket = request;

    _ws.on('message', function incoming(message) {
        console.log('received: %s', message);
        let _message = JSON.parse(message);
        _message.event == "hostCreateNewGame" && hostCreateNewGame(_message.data)
        _message.event == "playerJoinGame" && playerJoinGame(_message.data)
        _message.event == "hostRoomFull" && hostPrepareGame(_message.data)
        _message.event == "hostCountdownFinished" && hostStartGame(_message.data)
        _message.event == "hostNextRound" && hostNextRound(_message.data)
        _message.event == "playerAnswer" && playerAnswer(_message.data)
        _message.event == "playerRestart" && playerRestart(_message.data)
    });

    //gameSocket.emit('connected', { message: "You are connected!" });

    //common event
    //gameSocket.on('findLeader',findLeader);
}

/* *******************************
   *                             *
   *       HOST FUNCTIONS        *
   *                             *
   ******************************* */
/**
 * The 'START' button was clicked and 'hostCreateNewGame' event occurred.
 */
function hostCreateNewGame() {
    console.log("hostCreateNewGame...");
    // Create a unique Socket.IO Room
    var thisGameId = ( Math.random() * 100000 ) | 0;

    let room = {
        "gameId":thisGameId,
        "host":_ws,
        "users":[]
    }
    rooms.push(room);

    // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
    let returnJson = 
        [
         'newGameCreated',
        { 'gameId' : thisGameId}
        ]
    ;
    _ws.send(JSON.stringify(returnJson));    
};

/*
 * All players have joined. Alert the host!
 * @param gameId The game ID / room ID
 */
async function hostPrepareGame(hostData) {
    console.log("All Players Present. Preparing game...");

    var arrGenresForQuery = new Array();   
    hostData.selectedGenres.forEach(function(element) {
        arrGenresForQuery.push("'" + element + "' = ANY(genres)" );
      });

    var whereClauseGenres;
    if(arrGenresForQuery.length > 0) whereClauseGenres = "where " + arrGenresForQuery.join('OR');

    try {
        const findQuestionsQuery = 'select id from questions ' + whereClauseGenres + ' order by random() limit ' + hostData.numQuestions;
        const { rows, rowCount } = await db.query(findQuestionsQuery);

        var arrQuestionIds = new Array();        
        for (item in rows) {
            arrQuestionIds.push(rows[item].id);
          };

        var game = 
        [ hostData.gameId,
           0,
           hostData.gameType,
           hostData.numberOfPlayers,
           arrQuestionIds
        ];    
        const createGameQuery = 'INSERT INTO games(gameid, status,  type,  numberofplayers ,  questions ) VALUES($1, $2, $3, $4, $5) returning *';
        var values = game;    
        const { row } = await db.query(createGameQuery, values);
      } 
      catch(error) {
        return console.log('error: ' + error);
      };  

      let room = rooms.filter(game => game.gameId === parseInt(hostData.gameId));
      let returnJson = ['beginNewGame',{ 'gameId' : hostData.gameId}];
      let host = room[0].host;
      host.send(JSON.stringify(returnJson));
      room[0].users.forEach(function(user){
        user.client.send(JSON.stringify(returnJson));
      });
    //io.sockets.in(data.gameId).emit('beginNewGame', data);
};

/*
 * The Countdown has finished, and the game begins!
 * @param gameId The game ID / room ID
 */
function hostStartGame(gameId) {
    console.log('Game with gameId ' + gameId + ' started.');
    sendQuestion(0,gameId);
};

/**
 * A player answered correctly. Time for the next word.
 * @param data Sent from the client. Contains the current round and gameId (room)
 */
function hostNextRound(data) {
    //console.log('round' + data.round);
    if(!data.gameOver ){
        // Send a new set of words back to the host and players.
        sendQuestion(data.round, data.gameId);
    } else {

      if(!data.done)
      {
/*         //updating players win count
        db.all("SELECT * FROM player WHERE player_name=?",data.winner, function(err, rows) {
        rows.forEach(function (row) {
            win=row.player_win;
            win++;
            console.log(win);
            db.run("UPDATE player SET player_win = ? WHERE player_name = ?", win, data.winner);
            console.log(row.player_name, row.player_win);
        })
        }); */
        data.done++;
      }
        // If the current round exceeds the number of words, send the 'gameOver' event.
        let room = rooms.filter(game => game.gameId === parseInt(data.gameId));
        let returnJson = ['gameOver',data];
        let host = room[0].host;
        host.send(JSON.stringify(returnJson));
        room[0].users.forEach(function(user){
            user.client.send(JSON.stringify(returnJson));
          });
      //io.sockets.in(data.gameId).emit('gameOver',data);
    }
};

// function for finding leader
function findLeader()
{
  console.log("finding leader");
    var sock=this;
    var i=0;
    leader={};
    db.all("SELECT * FROM player ORDER BY player_win DESC LIMIT 10",function(err,rows)
    {
      if(rows!=undefined)
      {
        rows.forEach(function (row)
        {
          leader[i]={};
          leader[i]['name']=row.player_name;
          leader[i]['win']=row.player_win;
          console.log(row.player_name);
          console.log(row.player_win);
          i++;
        })
      }
      console.log("found leader");
      sock.emit('showLeader',leader);
    });

};

/* *****************************
   *                           *
   *     PLAYER FUNCTIONS      *
   *                           *
   ***************************** */

/**
 * A player clicked the 'START GAME' button.
 * Attempt to connect them to the room that matches
 * the gameId entered by the player.
 * @param data Contains data entered via player's input - playerName and gameId.
 */
function playerJoinGame(data) {
    console.log('Player ' + data.playerName + ' attempting to join game: ' + data.gameId );

    let room = rooms.filter(game => game.gameId === parseInt(data.gameId));
    // If the room exists...
    if( room != undefined ){

        // Join the room
        let user = {
            "username":data.playerName,
            "client":_ws
        }
        room[0].users.push(user);

        console.log('Player ' + data.playerName + ' joined game: ' + data.gameId );

        // Emit an event notifying the clients that the player has joined the room.
        //io.sockets.in(data.gameId).emit('playerJoinedRoom', data);

        let returnJson = ['playerJoinedRoom',
            { 
            'playerName': data.playerName,
            'playerId': data.playerId,
            'playerScore': 0, 
            'gameId' : data.gameId
            }];
        let host = room[0].host;
        host.send(JSON.stringify(returnJson));
        _ws.send(JSON.stringify(returnJson));

    } else {
        console.log('No room found while Player ' + data.playerName + ' tried to join with gameId: ' + data.gameId );
        // Otherwise, send an error message back to the player.
        this.emit('error',{message: "This room does not exist."} );
    }
};

/**
 * A player has tapped a word in the word list.
 * @param data gameId
 */
function playerAnswer(data) {
    console.log('gameId:' + data.gameId 
        + ':Player ID: ' + data.playerId 
        + ' answer: ' + data.answer
        + ' round: ' + data.round);

    // The player's answer is attached to the data object.  \
    // Emit an event with the answer so it can be checked by the 'Host'
    let room = rooms.filter(game => game.gameId === parseInt(data.gameId));
    // If the room exists...
    if( room != undefined ){
        let returnJson = ['hostCheckAnswer',
            { 'playerId': data.playerId
            ,'gameId' : data.gameId
            ,'answer' : data.answer
            ,'round' : data.round
            }];
        let host = room[0].host;
        host.send(JSON.stringify(returnJson));
    }
    //io.sockets.in(data.gameId).emit('hostCheckAnswer', data);
};

/**
 * The game is over, and a player has clicked a button to restart the game.
 * @param data
 */
function playerRestart(data) {
    console.log('Player: ' + data.playerName + ' ready for new game.');
    console.log('playerId: ' + this.id );

    // Emit the player's data back to the clients in the game room.
    data.playerId = this.id;
    io.sockets.in(data.gameId).emit('playerJoinedRoom',data);
};

/* *************************
   *                       *
   *      GAME LOGIC       *
   *                       *
   ************************* */

/**
 * Get a word for the host, and a list of words for the player.
 *
 * @param wordPoolIndex
 * @param gameId The room identifier
 */
async function sendQuestion(wordPoolIndex, gameId) {
    //console.log("sendWord#" + wordPoolIndex + "#" + gameId )
    var data = await getQuestionData(wordPoolIndex, gameId);
    console.log('gameId:' + gameId + ':round' + data.round + ' sent question ' + data.word);

    let room = rooms.filter(game => game.gameId === parseInt(gameId));
    let returnJson = ['newWordData',data];
    let host = room[0].host;
    host.send(JSON.stringify(returnJson));
    room[0].users.forEach(function(user){
        user.client.send(JSON.stringify(returnJson));
      });
    //io.sockets.in(gameId).emit('newWordData', data);
}
/**
 * This function does all the work of getting a new words from the pile
 * and organizing the data to be sent back to the clients.
 *
 * @param i The index of the wordPool.
 * @returns {{round: *, word: *, answer: *, list: Array}}
 */
async function getQuestionData(i, id){
    //console.log("getwordData");
    var wordData;
    var roundForSql = i+1;
    const text = 'SELECT questions.* FROM games JOIN questions ON questions.id = games.questions[$1] WHERE games.gameid=$2';
    const { rows } = await db.query(text, [roundForSql,id]);
 
    var answerList = [
        rows[0].fakeanswer1, 
        rows[0].fakeanswer2, 
        rows[0].fakeanswer3,
        rows[0].fakeanswer4,
        rows[0].fakeanswer5
    ];

    rnd = Math.floor(Math.random() * 5);
    answerList.splice(rnd, 0, rows[0].correctanswer); 
        // Package the words into a single object.
    wordData = {
        round: i,
        typeQuestion:rows[0].typequestion,
        word : rows[0].title,   // Displayed Word
        subText : rows[0].subtext,
        answer : rows[0].correctanswer, //question_list[i].correctAnswer, Correct Answer
        typeMedia : rows[0].typemedia,
        urlMedia : rows[0].urlmedia,
        list : answerList      // Word list for player (decoys and answer)
    };     

    return wordData;

}
 
/*
 * Javascript implementation of Fisher-Yates shuffle algorithm
 * http://stackoverflow.com/questions/2450954/how-to-randomize-a-javascript-array
 */
function shuffle(array) {
    var currentIndex = array.length;
    var temporaryValue;
    var randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

