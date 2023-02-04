
const headline = 'BATTLESHIP';

async function copyrightLog() {
    console.log("© 2022 Tobias Kendlbacher & Contributors - MIT License");
    console.log("https://github.com/kendlbat/battleship-node");
}

async function main() {     // ong when this ain't statically declared within the html sheet it won't load half the time :|
    await copyrightLog();
    home();
    buildLoginUI();
}

function home(){
    [...document.body.children].forEach(c => document.body.removeChild(c));
    let h1 = document.createElement('h1');
    h1.innerText = headline;

    let homebtn = document.createElement('span');
    homebtn.addEventListener('click', () => {
        home();
        buildLoginUI();
    });
    homebtn.className = 'lgEntry';
    homebtn.style.float = 'right';
    homebtn.innerText = '🗿';            // Moyai

    document.body.append(h1, homebtn);
}

function buildLoginUI(tableData = loginData){
    clearLoginUI();
    let loginGrid = document.createElement('div');
    loginGrid.id = loginId;


    for (let tableDataKey in tableData) {
        let tableEntry = document.createElement('div');
        tableEntry.addEventListener('click', tableData[tableDataKey]);


        tableEntry.className = loginTableEntryClassName;
        tableEntry.appendChild(document.createTextNode(tableDataKey));

        loginGrid.appendChild(tableEntry);
    }



    document.body.appendChild(loginGrid);
}

function clearLoginUI(){
    return document.getElementById(loginId)?.remove();
}

function buildCreateGameUI(gameObject){
    let table = document.createElement('div'); // everything is a grid!!
    table.className = 'gridTable';

    for (let gameObjectKey in gameObject) {
        let key = document.createElement('span');
        key.appendChild(document.createTextNode(gameObjectKey));

        let val = document.createElement('span');
        val.appendChild(document.createTextNode(gameObject[gameObjectKey]));

        table.append(
            key, val
        );
    }
    document.body.appendChild(table);
    buildLoginUI({'start game': () => {
            fetch('/api/game/start');
        }});
}

function buildGameBoard(){

}

function getCookie(name){
    return document.cookie.split(';')
        ?.find(s => s.split('=')[0]?.trim() === name)
        ?.split('=')[1].trim();
}

document.addEventListener("DOMContentLoaded", () => main());