let APIHandler;

async function copyrightLog() {
    console.log("© 2022 Tobias Kendlbacher & Contributors - MIT License");
    console.log("https://github.com/kendlbat/battleship-node");
}

/**
 * 
 * @param {string} url 
 * @param {HTMLElement} parent 
 */
async function loadComponent(url, parent) {
    let comp = await (await fetch(url)).text();
    let scripts = comp.match(/<script>([\s\S]*?)<\/script>/g);
    let scriptless = comp.replace(/<script>([\s\S]*?)<\/script>/g, "");
    parent.innerHTML = scriptless;
    parent.classList.add("component");
    if (scripts) {
        for (let script of scripts) {
            let scriptContent = script.match(/<script>([\s\S]*?)<\/script>/)[1];
            let scriptElement = document.createElement("script");
            scriptElement.innerHTML = scriptContent;
            parent.appendChild(scriptElement);
        }
    }
}

async function statusPrint(status) {
    if (!status?.error)
        console.log([
            `Status:`,
            `  Request Status: ${status.status}`,
            `  Game State: ${status.state}`,
            `  Game ID: ${status.gameId}`
        ].join("\n"));
    else
        console.warn([
            `Status:`,
            `  Request Status: ${status.status}`,
            `  Error: ${status.error}`
        ].join("\n"));
}

async function main() {
    copyrightLog();
    APIHandler = await import("./apiHandler.js");
    window.x.APIHandler = APIHandler;
    x.loadComponent("components/loadScreen.html", document.querySelector("#componentContainer"));
    let status = await APIHandler.status();

    if (status.status == 400) {
        x.loadComponent("components/login.html", document.querySelector("#componentContainer"));
    } else if (status.status == 403 || status.status == 404) {
        APIHandler.quit();
        x.loadComponent("components/login.html", document.querySelector("#componentContainer"));
    } else if (status.status == "ok") {
        if (status.state == "starting") {
            x.loadComponent("components/pregame.html", document.querySelector("#componentContainer"));
        } else if (status.state == "playing") {
            x.loadComponent("components/playing.html", document.querySelector("#componentContainer"));
        } else if (status.state == "finished") {
            x.loadComponent("components/finished.html", document.querySelector("#componentContainer"));
        } else {
            x.loadComponent("components/login.html", document.querySelector("#componentContainer"));
        }
    }

    window.statusPoll = () => { return undefined };
    setInterval(() => window.statusPoll(), window.pollingInterval);

    x.statusPrint(status);

}

// window.x contains all globally available custom functions
window.x = {};
window.x.pollingInterval = 2000;
window.x.loadComponent = loadComponent;
window.x.statusPrint = statusPrint;

document.addEventListener("DOMContentLoaded", () => main());