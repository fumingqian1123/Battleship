const mongoose = require('mongoose');
const express = require('express');
const parser = require('body-parser');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const connection_string = 'mongodb+srv://andrewwaugaman:6kfTqr6fE0qV8Mu9@chatty.l3vkslu.mongodb.net/messages';
const port = 80;

mongoose.connect(connection_string, { useNewUrlParser: true });
mongoose.connection.on( 'error', () => {
    console.log('there is a problem');
})

var Schema = mongoose.Schema;
var user = new Schema({
    username: String,
    salt: String,	
    hash: String,
    friends: [String],
    waiting: Boolean,
    curBoardID: String,
    battlehistory: [{opponent: String, won: Boolean, score: Number}]
});
var UserMessage = mongoose.model('UserMessage', user);

var board = new Schema({
    //For each oceanGrid spot, 1=empty, 2=ship, 3=empty and shot, 4=ship and shot
    //For each targetGrid spot, 1=empty, 2=empty and shot, 3=ship and shot
    oceanGrid_1: [{type: Number, min: 1, max: 4}],
    targetGrid_1: [{type: Number, min: 1, max: 3}],
    oceanGrid_2: [{type: Number, min: 1, max: 4}],
    targetGrid_2: [{type: Number, min: 1, max: 3}],
    user1ID: String,
    user2ID: String,
    ships1: Number,
    ships2: Number,
    score1: Number,
    score2: Number,
    //For turn, 1 means it's player 1's turn, 2 means it's player 2's turn, and 0 means the game ended.
    turn: Number,
    //Keeps track of whether one of the players left prematurely.
    left: Boolean
});
var boardMessage = mongoose.model('boardMessage', board );

var leaderboardEntry = new Schema({
    username: String,
    score: String,
    mode: Number,
    place: Number
});
var leaderboardEntryMessage = mongoose.model('leaderboardEntryMessage', leaderboardEntry );

let sessions = {};

function addSession(user) {
    let sessionID = Math.floor(Math.random() * 10000);
    let sessionStart = Date.now();
    sessions[user] = {'sid': sessionID, 'start': sessionStart};
    return sessionID;
}

function doesUserHaveSession(user, sessionID) {
    let entry = sessions[user];
    if (entry != undefined) {
        return entry.sid == sessionID;
    }
    return false;
}

const SESSION_LENGTH = 1000000;

function cleanupSessions() {
    let currentTime = Date.now();
    for (i in sessions) {
        let sess = sessions[i];
        if (sess.start + SESSION_LENGTH < currentTime) {
            console.log('removing session for user: ' + i);
            delete sessions[i];
        }
    }
}

setInterval(cleanupSessions, 2000);

function authenticate(req, res, next) {
    let c = req.cookies;
    if (c != undefined && c.login != undefined) {
        let result = doesUserHaveSession(c.login.username, c.login.sid);
        console.log(result);
        if (result == true) {
            next();
            return;
        }
    } else {
        res.redirect('/index.html');
    }
}

const app = express();
app.use(cookieParser());
app.use('/index.html', express.static('public_html/index.html'));
app.use('/game.html',authenticate);
app.use('/home.html',authenticate);
app.use(express.static('public_html'));
app.use( parser.text({type: '*/*'}) );

app.post('/placeships', async (req, res) => {
    var username = req.cookies.login.username;
    var userQuery = await UserMessage.findOne({username: username}).exec();
    if (userQuery == null){
        res.end("User not found.");
        return;
    }
    var id = userQuery._id;
    var board = await boardMessage.findOne({user1ID: id}).exec();
    var player1 = true;
    if (board == null){
        board = await boardMessage.findOne({user2ID: id}).exec();
        player1 = false;
    }
    if (board == null){
        res.end("Game not found.");
        return;
    } else {
        var body = JSON.parse(req.body);
        var positions = body["positions"];
        for (var i=0; i<positions.length; i++){
            var x = (Number) (positions[i]["x"]);
            var y = (Number) (positions[i]["y"]);
            if (player1){
                if (board.oceanGrid_1[(y*10+x)] != 1){
                    console.log("P1 ship placement failed.");
                    res.end("P1 ship placement failed.");
                    return;
                }
                board.oceanGrid_1[(y*10+x)] = 2;
            } else {
                if (board.oceanGrid_2[(y*10+x)] != 1){
                    console.log("P2 ship placement failed.");
                    res.end("P2 ship placement failed.");
                    return;
                }
                board.oceanGrid_2[(y*10+x)] = 2;
            }
        }
        board.save();
        res.end("Success.");
    }
});

app.post('/move', async (req, res) => {
    var username = req.cookies.login.username;
    let userQuery = await UserMessage.findOne({username: username}).exec();
    if (userQuery == null){
        res.end("User not found.");
        return;
    }
    var id = userQuery._id;
    var battle = await boardMessage.findOne({user1ID: id}).exec();
    var player1 = true;
    if (battle == null){
        battle = await boardMessage.findOne({user2ID: id}).exec();
        player1 = false;
    }
    if (battle == null){
        res.end("Game not found.");
        return;
    } else if (player1 && battle.turn != 1 || !player1 && battle.turn != 2){
        res.end("Not your turn.");
        return;
    } else {
        var body = JSON.parse(req.body);
        var x = (Number) (body["x"]);
        var y = (Number) (body["y"]);
        if (player1){
            var space = (battle.oceanGrid_2)[(y*10+x)];
            if (space == 1){
                (battle.targetGrid_1)[(y*10+x)] = 2;
                (battle.oceanGrid_2)[(y*10+x)] = 3;
                battle.turn = 2;
                battle.score1 -= 10000;
                battle.save();
                res.end("Miss.");
                return;
            } else if (space == 2){
                (battle.targetGrid_1)[(y*10+x)] = 3;
                (battle.oceanGrid_2)[(y*10+x)] = 4;
                battle.ships2--;
                if (battle.ships2 == 0){
                    battle.turn = 0;
                } else {
                    battle.turn = 2;
                }
                battle.save();
                res.end("Hit!");
                return;
            } else {
                console.log("P1 move failed.");
                res.end("P1 move failed.");
                return;
            }
        } else {
            var space = (battle.oceanGrid_1)[(y*10+x)];
            if (space == 1){
                (battle.targetGrid_2)[(y*10+x)] = 2;
                (battle.oceanGrid_1)[(y*10+x)] = 3;
                battle.turn = 1;
                battle.score2 -= 10000;
                battle.save();
                res.end("Miss.");
                return;
            } else if (space == 2){
                (battle.targetGrid_2)[(y*10+x)] = 3;
                (battle.oceanGrid_1)[(y*10+x)] = 4;
                battle.ships1--;
                if (battle.ships1 == 0){
                    battle.turn = 0;
                } else {
                    battle.turn = 1;
                }
                battle.save();
                res.end("Hit!");
                return;
            } else {
                console.log("P2 move failed.");
                res.end("P2 move failed.");
                return;
            }
        }
    }
});

app.get('/gamestate', async (req, res) => {
    var username = req.cookies.login.username;
    var userQuery = await UserMessage.findOne({username: username}).exec();
    if (userQuery == null){
        res.end("User not found.");
        return;
    }
    var id = userQuery._id;
    var battle = await boardMessage.findOne({user1ID: id}).exec();
    var player1 = true;
    if (battle == null){
        battle = await boardMessage.findOne({user2ID: id}).exec();
        player1 = false;
    }
    if (battle == null){
        res.end("Game not found.");
        return;
    } else {
        if (battle.turn == 0){
            res.end("Game over.");
            return;
        }
        if ((player1 && battle.user2ID == "left" ) || (!player1 && battle.user1ID == "left" )){
            res.end("Opponent left.");
            return;
        }
        if (player1){
            var response = {turn: (battle.turn == 1), board: battle.oceanGrid_1, enemy: battle.targetGrid_1, gameover: (battle.turn == 0), score: battle.score1, left: battle.left};
            res.end(JSON.stringify(response));
        } else {
            var response = {turn: (battle.turn == 2), board: battle.oceanGrid_2, enemy: battle.targetGrid_2, gameover: (battle.turn == 0), score: battle.score2, left: battle.left};
            res.end(JSON.stringify(response));
        }
    }
});

app.get('/findgame', async (req, res) => {
    var p1 = await UserMessage.findOne({username: req.cookies.login.username}).exec();
    if (p1 == null){
        console.log(":(");
        res.end("Cookie or user not found.");
        return;
    } else if (p1.waiting == false && p1.curBoardID != null){
            res.end("Found game.");
            return;
    }
    var opponent = await UserMessage.findOne({'username': {'$ne': p1.username}, 'waiting': true, 'curBoardID': null}).exec();
    if (opponent != null){
        opponent.waiting = false;
        p1.waiting = false;
        var baseGrid = [];
        for (var i=0; i<100; i++){
            baseGrid[i] = 1;
        }
        var board = new boardMessage({user1ID: p1._id, user2ID: opponent._id, turn: 1, ships1: 17, ships2: 17, score1: 1000000, score2: 1000000,
            oceanGrid_1: baseGrid, oceanGrid_2: baseGrid, targetGrid_1: baseGrid, targetGrid_2: baseGrid, left: false});
        opponent.curBoardID = board._id;
        p1.curBoardID = board._id;
        opponent.save();
        p1.save();
        board.save();
        res.end("Found game.");
    } else {
        p1.waiting = true;
        p1.save();
        res.end("Waiting.");
    }
});

app.get('/ingame', async (req, res) => {	
    var p1 = await UserMessage.findOne({username: req.cookies.login.username}).exec();	
    if (p1 == null){	
        res.end("Cookie or user not found.");	
        return;	
    }	
    if (p1.curBoardID != null){	
        res.end("In game.");	
    } else {
        res.end("Not in game.");	
    }	
});

app.post('/leavegame', async (req, res) => {
    var username = req.cookies.login.username;
    var userQuery = await UserMessage.findOne({username: username}).exec();
    if (userQuery == null){
        res.end("User not found.");
        return;
    }
    var id = userQuery._id;
    var battle = await boardMessage.findOne({user1ID: id}).exec();
    var player1 = true;
    if (battle == null){
        battle = await boardMessage.findOne({user2ID: id}).exec();
        player1 = false;
    }
    if (battle == null){
        res.end("Game not found.");
        return;
    }
    var opponentQuery = null;
    if (player1){
        var opponentQuery = await UserMessage.findOne({_id: battle.user2ID}).exec();
    } else {
        var opponentQuery = await UserMessage.findOne({_id: battle.user1ID}).exec();
    }
    if (opponentQuery == null){
        res.end("Opponent not found.");
        userQuery.curBoardID = null;
        userQuery.save();
        battle.left = true;
        battle.turn = 0;
        if (player1){
            battle.user1ID = null;
        } else {
            battle.user2ID = null;
        }
        battle.save();
        return;
    } else {
        var opponent = opponentQuery.username;
    }
    if (battle.turn != 0){
        battle.left = true;
        battle.turn = 0;
        userQuery.battlehistory.push({opponent: opponent, won: false, score: 0});
    }
    userQuery.curBoardID = null;
    userQuery.save();
    if (player1){
        battle.user1ID = null;
    } else {
        battle.user2ID = null;
    }
    battle.save();
    res.end("Left game.");
});

app.post('/endgame/', async (req, res) => {
    var username = req.cookies.login.username;
    var body = JSON.parse(req.body);
    let userQuery = await UserMessage.findOne({username: username}).exec();
    if (userQuery == null){
        res.end("Player not found.");
        return;
    }
    var id = userQuery._id;
    var battle = await boardMessage.findOne({user1ID: id}).exec();
    var player1 = true;
    if (battle == null){
        battle = await boardMessage.findOne({user2ID: id}).exec();
        player1 = false;
    }
    if (battle == null){
        res.end("Game not found.");
        return;
    }
    var opponentQuery = null;
    var score = 0;
    if (player1){
        var opponentQuery = await UserMessage.findOne({_id: battle.user2ID}).exec();
        score = battle.score1;
    } else {
        var opponentQuery = await UserMessage.findOne({_id: battle.user1ID}).exec();
        score = battle.score2;
    }
    if (opponentQuery == null){
        res.end("Opponent not found.");
        return;
    } else {
        var opponent = opponentQuery.username;
    }
    if (battle.left || body.lost){
        userQuery.battlehistory.push({opponent: opponent, won: (!body.lost), score: 0});
    } else {
        userQuery.battlehistory.push({opponent: opponent, won: true, score: score});
    }
    userQuery.curBoardID = null;
    userQuery.save();
    res.end("Game ended.");
});

let loginUser = '';

app.post('/add/user/', async (req, res) => {
    var body = JSON.parse(req.body);
    var username = body["username"];
    var password = body["password"];
    let query = UserMessage.find({username: username}).exec();
    query.then( (results) => {
        if (results.length > 0){
            res.end("Username taken.");
        } else {
            let newSalt = Math.floor((Math.random() * 1000000));
            let toHash = password + newSalt;
            var hash = crypto.createHash('sha3-256');
            let data = hash.update(toHash, 'utf-8');
            let newHash = data.digest('hex');
            var newUser = new UserMessage( {
                username: username,
                waiting: false,
                curBoardID: null,
                salt: newSalt,
                hash: newHash,
                friends:[],
                battlehistory: []
            })
            let sid = addSession(username);
            res.cookie("login", {username: username, sid: sid}, {maxAge: 3000000});
            newUser.save().then( (doc) => {
                res.end('created new account');
            });
        }
    }).catch( (error) => {
        res.end("Account creation failed.");
    });
});

app.get('/account/login/:username/:password', (req, res) => {
    let u = req.params.username;
    let p = req.params.password;
    loginUser = u;
    let p1 = UserMessage.find({username: u}).exec();
    p1.then( (results) => {
        if (results.length == 1) {
            let existingSalt = results[0].salt;
            let toHash = p + existingSalt;
            var hash = crypto.createHash('sha3-256');
            let data = hash.update(toHash, 'utf-8');
            let newHash = data.digest('hex');
            if (newHash == results[0].hash) {
                let sid = addSession(u);
                res.cookie("login", {username: u, sid: sid}, {maxAge: 3000000});
                res.end('SUCCESS');
            } else {
                res.end('failed');
            }
        }
    });
    p1.catch( (error) => {
        res.end('login failed');
    });
});

app.get('/clear', async (req, res) => {
    var users = await UserMessage.find({}).exec();
    for (var i=0; i<users.length; i++){
        console.log(users[i]);
        users[i].waiting = false;
        users[i].curBoardID = null;
        users[i].save();
    }
    boardMessage.deleteMany({}).exec();
    res.end("A");
})

app.listen(port, () =>
  console.log('App listening at http://137.184.226.226:80:'));