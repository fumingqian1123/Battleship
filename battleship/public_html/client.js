var isTurn = false;
var rotation = [1, 0];
var inGame = false;
var madeMove = false;
var shipPlaces = [];

function addUser(){
    var params = {
        username: document.getElementById("cusername").value,
        password: document.getElementById("cpassword").value
    };
    fetch("http://137.184.226.226:80/add/user",{
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
    }).then(async (res) => {
        var response = await res.text();
        console.log(response);
        if (response == "Account created."){
            window.location.href = './home.html';
        }
    }).catch(err => {
        console.log(err.message);
    });
}

function login(){
    var username = document.getElementById("lusername").value;
    var password = document.getElementById("lpassword").value;
    fetch("http://137.184.226.226:80/account/login/" + username + "/" + password,{
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    }).then(async (res) => {
        var response = await res.text();
        if (response == "SUCCESS"){
            window.location.href = './home.html';
        }
    }).catch(err => {
        console.log(err.message);
    });
}

function checkGameStatus(){
    if (inGame == true){
        setTimeout(checkGameStatus, 1000);
    }
    fetch("http://137.184.226.226:80/gamestate/", {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    }).then(async (res) => {
        var response = await res.text();
        if (response != "User not found." && response != "Game not found."){
            if (response == "Game over."){
                inGame = false;
                var square = document.getElementById("opponent");
                square.innerText = "Game over.";
                return;
            }
            var parsedResponse = await JSON.parse(response);
            if (isTurn && !parsedResponse.turn){
                isTurn = false;
                madeMove = false;
            } else if (!isTurn && parsedResponse.turn){
                isTurn = true;
            }
            var score = parsedResponse.score;
            var scoretext = document.getElementById("scoretext");
            scoretext.innerText = "Score: " + score;
            for (var i=0; i<10; i++){
                for (var j=0; j<10; j++){
                    var remainingShips = 16;
                    if (parsedResponse.board[(i*10+j)] == 3){
                        var square = document.getElementById("2square"+j+"-"+i);
                        square.className = "missed";
                    } else if (parsedResponse.board[(i*10+j)] == 4){
                        var square = document.getElementById("2square"+j+"-"+i);
                        square.className = "destroyed";
                    }
                    if (parsedResponse.enemy[(i*10+j)] == 2){
                        var square = document.getElementById("1square"+j+"-"+i);
                        square.className = "missed";
                    } else if (parsedResponse.enemy[(i*10+j)] == 3){
                        var square = document.getElementById("1square"+j+"-"+i);
                        square.className = "destroyed";
                    }
                }
            }
            if (parsedResponse.gameover && parsedResponse.left == false){
                inGame = false;
                var square = document.getElementById("opponent");
                square.innerText = "Game over.";
            } else if (parsedResponse.left){
                var square = document.getElementById("opponent");
                square.innerText = "Opponent left.";
            }
        } else {
            console.log(parsedResponse);
        }
    }).catch(err => {
        console.log(err.message);
    });
}

function placeShip(x, y){
    if (shipQueue.isEmpty){
        return;
    }
    var placable = true;
    for (var iterator = 0; iterator < shipQueue.peek(); iterator++) {
        var xHighlight = (x+iterator*rotation[0]);
        var yHighlight = (y+iterator*rotation[1]);
        if (0 <= xHighlight && 9 >= xHighlight && 0 <= yHighlight && 9 >= yHighlight) {
            var square = document.getElementById("2square"+xHighlight+"-"+yHighlight);
            if (square.className != "shipplacehighlighted"){
                placable = false;
            }
        } else {
            placable = false;
        }
    }
    if (placable){
        for (var iterator = 0; iterator < shipQueue.peek(); iterator++) {
            var xHighlight = (x+iterator*rotation[0]);
            var yHighlight = (y+iterator*rotation[1]);
            if (0 <= xHighlight && 9 >= xHighlight && 0 <= yHighlight && 9 >= yHighlight) {
                var square = document.getElementById("2square"+xHighlight+"-"+yHighlight);
                if (square.className == "shipplacehighlighted"){
                    square.className = "ship";
                }
                shipPlaces.push({x: xHighlight, y: yHighlight});
            }
        }
        shipQueue.dequeue();
    }
    if (shipQueue.isEmpty){
        waitForGame();
    }
}

function highlightSpaces(x, y){
    if (shipQueue.isEmpty){
        return;
    }
    for (var row=0; row<10; row++) {
        for (var col=0; col<10; col++) {
            var square = document.getElementById("2square"+row+"-"+col);
            if (square.className == "shipplacehighlighted"){
                square.className = "unhighlighted";
            }
        }
    }
    for (var iterator = 0; iterator < shipQueue.peek(); iterator++) {
        var xHighlight = (x+iterator*rotation[0]);
        var yHighlight = (y+iterator*rotation[1]);
        if (0 <= xHighlight && 9 >= xHighlight && 0 <= yHighlight && 9 >= yHighlight) {
            var square = document.getElementById("2square"+xHighlight+"-"+yHighlight);
            if (square.className == "unhighlighted"){
                square.className = "shipplacehighlighted";
            }
        }
    }
}

function highlightEnemySpace(x, y){
    for (var row=0; row<10; row++) {
        for (var col=0; col<10; col++) {
            var square = document.getElementById("1square"+row+"-"+col);
            if (square.className == "targetedhighlighted"){
                square.className = "unhighlighted";
            }
        }
    }
    var square = document.getElementById("1square"+x+"-"+y);
    if (square.className == "unhighlighted" && isTurn){
        square.className = "targetedhighlighted";
    }
}

function makeMove(x, y){
    var square = document.getElementById("1square"+x+"-"+y);
    if (!isTurn || square.className != "targetedhighlighted" || !inGame){
        return;
    }
    isTurn = false;
    fetch("http://137.184.226.226:80/move/", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({x: x, y: y})
    }).then(async (res) => {
        var response = await res.text();
        if (response == "Hit!" || response == "Miss."){
            square = document.getElementById("1square"+x+"-"+y);
            if (response == "Hit!"){
                square.className = "destroyed";
            } else {
                square.className = "missed";
            }
        } else {
            console.log(response);
        }
    }).catch(err => {
        console.log(err.message);
    });
}

function rotate(){
    var xRot = rotation[1];
    var yRot = rotation[0]*-1;
    rotation[0] = xRot;
    rotation[1] = yRot;
}

function assignFunctions(){
    for (var i=0; i<10; i++){
        for (var j=0; j<10; j++){
            var element = document.getElementById("2square"+i+"-"+j);
            element.setAttribute("onclick", "javascript:placeShip("+i+", "+j+")");
            element.setAttribute("onmouseover", "javascript:highlightSpaces("+i+", "+j+")");
            element.className = "unhighlighted";
        }
    }
    for (var i=0; i<10; i++){
        for (var j=0; j<10; j++){
            var element = document.getElementById("1square"+i+"-"+j);
            element.setAttribute("onclick", "javascript:makeMove("+i+", "+j+")");
            element.setAttribute("onmouseover", "javascript:highlightEnemySpace("+i+", "+j+")");
            element.className = "unhighlighted";
        }
    }
    startPrep();
}

function startPrep(){
    fetch("http://137.184.226.226:80/ingame/", {	
        method: 'GET',
        headers: {	
            'Content-Type': 'application/json',	
        },	
    }).then(async (res) => {	
        var response = await res.text();	
        if (response == "In game."){
            inGame = true;
            checkGameStatus();
        } else {
            shipQueue.enqueue(5);	
            shipQueue.enqueue(4);	
            shipQueue.enqueue(3);	
            shipQueue.enqueue(3);	
            shipQueue.enqueue(2);	
        }	
    }).catch(err => {	
        console.log(err.message);	
    });
}

function waitForGame(){
    if (inGame == false){
        setTimeout(waitForGame, 1000);
        fetch("http://137.184.226.226:80/findgame/", {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(async (res) => {
            var response = await res.text();
            if (response == "Found game."){
                inGame = true;
            }
        }).catch(err => {
            console.log(err.message);
        });
    } else {
        fetch("http://137.184.226.226:80/placeships/", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({positions: shipPlaces})
        }).then(async (res) => {
            var response = await res.text();
            if (response != "Success."){
                console.log(response);
            } else {
                checkGameStatus();
            }
        }).catch(err => {
            console.log(err.message);
        });
    }
}

function leaveGame(){
    inGame = false;
    fetch("http://137.184.226.226:80/leavegame/", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    }).then(async (res) => {
        window.location.href = './home.html';
    }).catch(err => {
        console.log(err.message);
    });
}

class Queue {
    constructor() {
      this.elements = {};
      this.head = 0;
      this.tail = 0;
    }
    enqueue(element) {
      this.elements[this.tail] = element;
      this.tail++;
    }
    dequeue() {
      const item = this.elements[this.head];
      delete this.elements[this.head];
      this.head++;
      return item;
    }
    peek() {
      return this.elements[this.head];
    }
    get length() {
      return this.tail - this.head;
    }
    get isEmpty() {
      return this.length === 0;
    }
  }

var shipQueue = new Queue;