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

async function main() {
    copyrightLog();
    APIHandler = await import("./apiHandler.js");
    window.APIHandler = APIHandler;
    loadComponent("components/loadScreen.html", document.querySelector("#componentContainer"));
    let status = await APIHandler.status();

    if (status.status == 400) {
        loadComponent("components/login.html", document.querySelector("#componentContainer"));
    } else if (status.status == 403 || status.status == 404) {
        APIHandler.quit();
        loadComponent("components/login.html", document.querySelector("#componentContainer"));
    } else if (status.status == "ok") {
        if (status.state == "starting") {
            loadComponent("components/pregame.html", document.querySelector("#componentContainer"));
        } else if (status.state == "playing") {
            loadComponent("components/playing.html", document.querySelector("#componentContainer"));
        } else if (status.state == "finished") {
            loadComponent("components/finished.html", document.querySelector("#componentContainer"));
        } else {
            loadComponent("components/login.html", document.querySelector("#componentContainer"));
        }
    }

    window.statusPoll = () => { return undefined };
    setInterval(() => window.statusPoll(), window.pollingInterval);

    console.log(status);

}

window.pollingInterval = 2000;
window.loadComponent = loadComponent;

document.addEventListener("DOMContentLoaded", () => main());