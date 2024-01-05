var isTurn = false;
var rotation = [1, 0];
var inGame = false;
var madeMove = false;
var shipPlaces = [];

function login() {
    let u = document.getElementById('logUsername').value;
    let p = document.getElementById('logPassword').value;
    let url = '/account/login/' + u + '/' + p;
    let p1 = fetch(url);
    p1.then( (results) => {
      return results.text();
    }).then( (text) => {
      console.log(text);
      if (text == 'SUCCESS') {
        window.location = 'home.html'
        console.log('dfafds')
      } else {
        alert('incorrect username or password');
      }
    })
    p1.catch( (err) => {
      console.log(err);
    });
  }
  
  function createAccount() {
    let u = document.getElementById('signUsername').value;
    let p = document.getElementById('signPassword').value;
    let url = '/add/user/' + u + '/' + p;
    let p1 = fetch(url);
    p1.then( (results) => {
      return results.text();
    }).then( (text) => {
      if (text == 'SUCCESS') {
        alert('created a account')
      }
    });
    p1.catch( (err) => {
      console.log(err);
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
        if (res.text != "User not found." && res.text != "Game not found."){
            var response = await JSON.parse(res.text());
            if (isTurn && !response.turn){
                isTurn = false;
                madeMove = false;
            } else if (!isTurn && response.turn){
                isTurn = true;
            }
            for (var i=0; i<10; i++){
                for (var j=0; j<10; j++){
                    var x = "0" + (String) ((Number) (i+1));
                    var y = "0" + (String) ((Number) (j+1));
                    if (x == "010"){
                        x = "10";
                    }
                    if (y == "010"){
                        y = "10";
                    }
                    var remainingShips = 16;
                    if (response.board[x+y] == 3){
                        var square = document.getElementById("2square"+i+"-"+j);
                        square.className = "missed";
                    } else if (response.board[x+y] == 4){
                        var square = document.getElementById("2square"+i+"-"+j);
                        square.className = "destroyed";
                        remainingShips--;
                    }
                    if (response.enemy[x+y] == 2){
                        var square = document.getElementById("1square"+i+"-"+j);
                        square.className = "missed";
                    } else if (response.enemy[x+y] == 3){
                        var square = document.getElementById("1square"+i+"-"+j);
                        square.className = "destroyed";
                    }
                    if (remainingShips == 0){
                        //end game
                    }
                }
            }
        } else {
            console.log(res.text);
        }
    }).catch(err => {
        console.log(err.message);
    });
}

function startPrep(){
    shipQueue.enqueue(5);
    shipQueue.enqueue(4);
    shipQueue.enqueue(3);
    shipQueue.enqueue(3);
    shipQueue.enqueue(2);
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
    if (!isTurn || square.className != "targetedhighlighted"){
        return;
    }
    isTurn = false;
    fetch("http://137.184.226.226:80/move/", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: {x: x, y: y}
    }).then(async (res) => {
        if (res.text == "Hit!" || res.text == "Miss."){
            var square = document.getElementById("1square"+x+"-"+y);
            if (res.text == "Hit!"){
                square.className = "destroyed";
            } else {
                square.className = "missed";
            }
        } else {
            console.log(res.text);
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

function waitForGame(){
    if (inGame == false){
        setTimeout(waitForGame, 1000);
        fetch("http://137.184.226.226:80/findgame/", {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(async (res) => {
            if (res.text == "Found game."){
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
            body: {positions: shipPlaces}
        }).then(async (res) => {
            if (res.text != "Success."){
                console.log(res.text);
            }
        }).catch(err => {
            console.log(err.message);
        });
    }
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
  
  let q = new Queue();
  for (let i = 1; i <= 7; i++) {
    q.enqueue(i);
  }
  // get the current item at the front of the queue
  console.log(q.peek());
  
  // get the current length of queue
  console.log(q.length);
  
  // dequeue all elements
  while (!q.isEmpty) {
    console.log(q.dequeue());
  }
  
var shipQueue = new Queue;