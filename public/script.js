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

/**
 * 
 * @param {string} title 
 * @param {string} message 
 * @param {"error" | "warn" | "success" | "info" | undefined} type Type of notification (color) - if undefined: info 
 */
async function showNotification(title, message, type="info") {
    let notifyBox = document.querySelector("#notifyBox");
    let notification = document.createElement("div");
    notification.classList.add("notification");

    let titleElement = document.createElement("h1");
    titleElement.innerText = title;
    notification.appendChild(titleElement);

    let messageElement = document.createElement("p");
    messageElement.innerText = message;
    notification.appendChild(messageElement);

    notification.classList.add(type);
    notifyBox.appendChild(notification);
    setTimeout(() => {
        notification.classList.add("notify-fadeout");
        setTimeout(() => {
            notifyBox.removeChild(notification);
        }, 500);
    }, 5000);
}

async function main() {
    copyrightLog();
    APIHandler = await import("./apiHandler.js");
    window.x.APIHandler = APIHandler;
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

    window.x.pollingInterval = 2000;
    window.x.statusPoll = () => { return undefined };
    window.x.statusPollInterval = setInterval(() => window.x.statusPoll(), window.x.pollingInterval);

    statusPrint(status);
}

window.x = {};
window.x.changeStatusPollingInterval = (ms) => {
    clearInterval(window.x.statusPollInterval);
    window.x.pollingInterval = ms;
    window.x.statusPollInterval = setInterval(() => window.x.statusPoll(), window.pollingInterval);
}
window.x.loadComponent = loadComponent;
window.x.statusPrint = statusPrint;
window.x.showNotification = showNotification;

document.addEventListener("DOMContentLoaded", () => main());