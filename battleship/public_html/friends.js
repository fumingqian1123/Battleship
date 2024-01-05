function showFriends() {
    let url = '/*';
    let p1 = fetch(url);
    p1.then( (results) => {
        return results.text();
    }).then( (text) => {
        let listing = JSON.parse(text);
        let inner = '';
        for (let i = 0; i < Object.keys(listing).length; i++) {
        let content = listing[i].split(' ');
        let title = content[3].substring(1, content[3].length - 3);
        let desc = content[6].substring(1, content[6].length - 3);
        let img = content[9].substring(0, content[9].length - 2);
        let price = content[12].substring(0, content[12].length - 2);
        inner += ("<table> <tr> <th>" + title + "</th> </tr> <tr> <td>" + "<img id='img' src='/knife.png' alt='pict'>  </td> </tr> <tr> <td>" + desc 
        + "</td> </tr> <tr> <td>" + price + "</td> </tr> <tr> <td>sold</td></tr> <table> <br>")
        }
        document.getElementById('outputDiv').innerHTML = inner;
    });
    p1.catch( (err) => {
        console.log(err);
    });
}