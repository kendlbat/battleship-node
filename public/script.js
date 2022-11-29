const loginId = 'login';
const loginTableEntryClassName = 'lgEntry';
const loginData = {
    'create game': () => {},
    'join game': () => {},
    'credits': () => {}
}

async function copyrightLog() {
    console.log("© 2022 Tobias Kendlbacher & Contributors - MIT License");
    console.log("https://github.com/kendlbat/battleship-node");
}

async function main() {     // ong when this ain't statically declared within the html sheet it won't load half the time :|
    await copyrightLog();
    buildLoginUI();
}

function buildLoginUI(){
    clearLoginUI();
    let loginGrid = document.createElement('div');
    loginGrid.id = loginId;

    for (let loginDataKey in loginData) {
        let tableEntry = document.createElement('div');
        tableEntry.addEventListener('click', loginData[loginDataKey]);


        tableEntry.className = loginTableEntryClassName;
        tableEntry.appendChild(document.createTextNode(loginDataKey));


        loginGrid.appendChild(tableEntry);
    }



    document.body.appendChild(loginGrid);
}

function clearLoginUI(){
    return document.getElementById(loginId)?.remove();
}

function buildGameBoard(){

}

