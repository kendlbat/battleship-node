/*
 * A simple HTTP Wrapper written by Tobias Kendlbacher
 * (c) Tobias Kendlbacher 2022 - MIT License
 */

const http = require("http");
const fs = require("fs");

/**
 * Pre-written fallback function for 404 errors
 */
const NOTFOUNDFALLBACK = (req, res) => {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.write("Error 404 - The page you requested was not found!");
    res.end();
}

const DEFAULTmimeTypesForFileExtension = {
    "aac": "audio/aac",
    "abw": "application/x-abiword",
    "arc": "application/x-freearc",
    "avif": "image/avif",
    "avi": "video/x-msvideo",
    "azw": "application/vnd.amazon.ebook",
    "bin": "application/octet-stream",
    "bmp": "image/bmp",
    "bz": "application/x-bzip",
    "bz2": "application/x-bzip2",
    "cda": "application/x-cdf",
    "csh": "application/x-csh",
    "css": "text/css",
    "csv": "text/csv",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "eot": "application/vnd.ms-fontobject",
    "epub": "application/epub+zip",
    "gz": "application/gzip",
    "gif": "image/gif",
    "htm": "text/html",
    "html": "text/html",
    "ico": "image/vnd.microsoft.icon",
    "ics": "text/calendar",
    "jar": "application/java-archive",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "js": "text/javascript",
    "json": "application/json",
    "jsonld": "application/ld+json",
    "mid": "audio/midi",
    "midi": "audio/midi",
    "mjs": "text/javascript",
    "mp3": "audio/mpeg",
    "mp4": "video/mp4",
    "mpeg": "video/mpeg",
    "mpkg": "application/vnd.apple.installer+xml",
    "odp": "application/vnd.oasis.opendocument.presentation",
    "ods": "application/vnd.oasis.opendocument.spreadsheet",
    "odt": "application/vnd.oasis.opendocument.text",
    "oga": "audio/ogg",
    "ogv": "video/ogg",
    "ogx": "application/ogg",
    "opus": "audio/opus",
    "otf": "font/otf",
    "png": "image/png",
    "pdf": "application/pdf",
    "php": "application/x-httpd-php",
    "ppt": "application/vnd.ms-powerpoint",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "rar": "application/vnd.rar",
    "rtf": "application/rtf",
    "sh": "application/x-sh",
    "svg": "image/svg+xml",
    "tar": "application/x-tar",
    "tif": "image/tiff",
    "tiff": "image/tiff",
    "ts": "video/mp2t",
    "ttf": "font/ttf",
    "txt": "text/plain",
    "vsd": "application/vnd.visio",
    "wav": "audio/wav",
    "weba": "audio/webm",
    "webm": "video/webm",
    "webp": "image/webp",
    "woff": "font/woff",
    "woff2": "font/woff2",
    "xhtml": "application/xhtml+xml",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "xml": "application/xml",
    "xul": "application/vnd.mozilla.xul+xml",
    "zip": "application/zip",
    "7z": "application/x-7z-compressed"
};

const DEFAULTfallbackMimeType = "application/octet-stream";

class ServerManager {
    defaultFallback = () => undefined;
    defaultPrecall = () => undefined;

    /**
     * ### Options:
     *  * `fallback` : `Function | undefined` -> Fallback function, executed if no Requestable is found on a requested path  
     *  * `precall` : `Function | undefined` -> Executed prior to handling a request  
     *  * `address` : `string | undefined` -> Server listening address; Default:&nbsp;`127.0.0.1`  
     *  * `port` : `number | undefined` -> Server listening port; Default:&nbsp;`8080`
     * @param {object | undefined} options
     */
    constructor(options = {}, configFile = undefined) {
        if (configFile) {
            // Check if the config file exists
            if (!fs.existsSync(configFile))
                throw new Error(`Config file '${configFile}' does not exist!`);

            // Read the config file
            let config = JSON.parse(fs.readFileSync(configFile, "utf-8"));
            options = { ...config, ...options };
        }

        this.paths = {};
        this.fallback = options.fallback || this.defaultFallback;
        this.precall = options.precall || this.defaultPrecall;
        this.listening = false;
        this.address = options.address || "0.0.0.0";
        this.port = options.port || 8080;
        this.server = null;
        this.config = options;
    }

    /**
     * Registers the given Requestable to be called when the path of a request matches the path of the Requestable
     * @param {Requestable} requestable 
     * @returns {Requestable | null} the Requestable (or null if none) which was replaced by this register call.
     */
    register(requestable) {
        let replaced = null;
        let sub;

        if (requestable.path instanceof RegExp) {
            sub = "REGEXP " + requestable.path;
        } else if (requestable.path.match(/.*@@@.*/g)) {
            if (requestable.path.match(/.*@@@.*/g).length != 1)
                throw new Error("Too many @@@ in requestable path");
            sub = requestable.path.split("?")[0].split("#")[0];
        } else {
            sub = requestable.method + "@@@" + requestable.path.split("?")[0].split("#")[0];
        }
        if (this.paths[sub]) replaced = this.paths[sub];
        this.paths[sub] = requestable;

        requestable.setServerManager(this);

        return replaced;
    }

    /**
     * 
     * @param {ServerManager} router 
     * @param {string} path 
     */
    registerRouter(router, path) {
        if (!(router instanceof ServerManager))
            throw new Error("Router must be an instance of ServerManager");
        if (path.match(/.*@@@.*/g))
            throw new Error("Router path cannot contain @@@");
        if (path.match(/.*\?.*/g))
            throw new Error("Router path cannot contain ?");
        if (path.match(/.*#.*/g))
            throw new Error("Router path cannot contain #");
        if (typeof path !== "string")
            throw new Error("Router path must be a string");

        if (!path.startsWith("/")) path = "/" + path;
        this.register(new Requestable((req, res) => {
            // Remove path from the beginning of req.url
            req.url = String(req.url).substring(path.length);
            if (!req.url.startsWith("/")) req.url = "/" + req.url;
            router.precall(req, res);

            let regexPathMatched = false;

            Object.keys(router.paths).forEach((path) => {
                if (path.startsWith("REGEXP /")) {
                    let pathexp = new RegExp(path.replace(/^REGEXP \/(.*)\/$/g, "$1"));
                    if (pathexp.test(req.method + "@@@" + req.url)) {
                        if (regexPathMatched)
                            throw new Error("Multiple Requestables registered to overlapping paths!");
                        regexPathMatched = true;
                        router.paths[path].call(req, res);
                    }
                }
            });

            if (!regexPathMatched) {
                if (Object.keys(router.paths).includes(req.method + "@@@" + req.url.split("?")[0].split("#")[0])) {
                    router.paths[req.method + "@@@" + req.url.split("?")[0].split("#")[0]].call(req, res);
                } else if (Object.keys(router.paths).includes("ANY@@@" + req.url.split("?")[0].split("#")[0])) {
                    router.paths["ANY@@@" + req.url.split("?")[0].split("#")[0]].call(req, res);
                } else {
                    router.fallback(req, res);
                }
            }

        }, "ANY", new RegExp("/?" + path + "/?.*")));
    }

    /**
     * Starts listening for requests
     * @returns {Promise<object>} Details about the server
     */
    listen() {
        return new Promise((resolve, reject) => {
            this.listening = true;
            this.server = http.createServer(async (req, res) => {
                console.log(req.url);
                this.precall(req, res);

                let regexPathMatched = false;

                Object.keys(this.paths).forEach((path) => {
                    if (path.startsWith("REGEXP /")) {
                        let pathexp = new RegExp(path.replace(/^REGEXP \/(.*)\/$/g, "$1"));
                        if (pathexp.test(req.method + "@@@" + req.url)) {
                            if (regexPathMatched)
                                throw new Error("Multiple Requestables registered to overlapping paths!");
                            regexPathMatched = true;
                            this.paths[path].call(req, res);
                        }
                    }
                });

                if (!regexPathMatched) {
                    if (Object.keys(this.paths).includes(req.method + "@@@" + req.url.split("?")[0].split("#")[0])) {
                        this.paths[req.method + "@@@" + req.url.split("?")[0].split("#")[0]].call(req, res);
                    } else if (Object.keys(this.paths).includes("ANY@@@" + req.url.split("?")[0].split("#")[0])) {
                        this.paths["ANY@@@" + req.url.split("?")[0].split("#")[0]].call(req, res);
                    } else {
                        this.fallback(req, res);
                    }
                }
            });
            this.server.listen(this.port, this.address, () => resolve({ url: `http://${this.address}:${this.port}`, paths: this.paths, config: this.config }));
        });

    }
}

class Requestable {
    /**
     * 
     * @param {string} method 
     * @param {string | RegExp} path 
     * @param {Function} callback 
     */
    constructor(callback, method = "GET", path = "/") {
        this.method = method;
        this.path = path;
        this.call = callback;
        this.registeredTo = undefined;
    }

    /**
     * 
     * @param {string} filepath 
     * @param {string} contentType 
     * @param {string} urlpath 
     * @returns 
     */
    static fromStaticFile(filepath, contentType = undefined, urlpath) {
        return new Requestable(function (req, res) {
            let mimeTypeByFileExtension = {};
            let fallbackMimeType;

            if (this.registeredTo?.config?.contentTypes) {
                Object.keys(this.registeredTo.config.contentTypes).forEach((ext) => {
                    mimeTypeByFileExtension[ext] = this.registeredTo.config.contentTypes[ext];
                });
            } else {
                mimeTypeByFileExtension = {...DEFAULTmimeTypesForFileExtension};
            }
    
            if (this.registeredTo?.config?.fallbackMimeType) {
                fallbackMimeType = this.registeredTo?.config?.fallbackMimeType || DEFAULTfallbackMimeType;
            }

            res.writeHead(200, { "Content-Type": contentType || mimeTypeByFileExtension[filepath.split(".").pop()] || DEFAULTfallbackMimeType });
            res.write(fs.readFileSync(filepath));
            res.end();
        }, "GET", urlpath);
    }

    /**
     * Generates a Requestable for a given folder to be served statically
     * @param {string} folderpath The local path of the folder
     * @param {string} urlpath The path the folder should be accessible from
     * @returns {Requestable}
     */
    static fromStaticFolder(folderpath, urlpath) {
        if (urlpath.match(/.*@@@.*/g))
            throw new Error("Reserved characters used in URL path!");
        if (urlpath.match(/.*\\.*/g))
            throw new Error("Backslashes not allowed in URL path!");
        if (folderpath.match(/.*\.\..*/g))
            throw new Error("Double dots are not currently supported in folder paths");


        if (urlpath.startsWith("/")) urlpath = urlpath.substring(1);
        if (urlpath.endsWith("/")) urlpath = urlpath.substring(0, urlpath.length - 1);

        let basepath = urlpath.split("?")[0].split("#")[0].split("/");
        if (basepath.length === 1 && basepath[0] === '') basepath.shift();
        if (folderpath.startsWith("/")) folderpath = folderpath.replace(/^\.?\/?/g, "");

        let checkFolder;

        try {
            checkFolder = fs.statSync(folderpath);
        } catch (e) {
            console.log(e);
            throw new Error("Local folder does not exist!");
        }

        if (!checkFolder.isDirectory())
            throw new Error("Local folder path does not point to a folder!");


        return new Requestable(function (req, res) {  // DO NOT USE AN ARROW FUNCTION HERE - The this context won't work as intended
            let mimeTypeByFileExtension = {};
            let fallbackMimeType;


            if (this.registeredTo?.config?.contentTypes) {
                Object.keys(this.registeredTo.config.contentTypes).forEach((ext) => {
                    mimeTypeByFileExtension[ext] = this.registeredTo.config.contentTypes[ext];
                });
            }
    
            if (this.registeredTo?.config?.fallbackMimeType) {
                fallbackMimeType = this.registeredTo.config.fallbackMimeType || "application/octet-stream";
            }

            let path = String(req.url).split("?")[0].split("#")[0].split("/");
            path.shift();
            basepath.forEach(() => path.shift());

            // Redirect if path is root and url does not end with a slash
            if (path.length === 0) {
                res.writeHead(302, {
                    "Location": req.url + "/"
                });
                res.end();
                return;
            }

            let filepath = folderpath + "/" + path.join("/");
            if (filepath.startsWith("/")) filepath = "." + filepath;

            if (req.method != "GET") {
                res.writeHead(405, { "Content-Type": "text/plain" });
                res.write("405 Method Not Allowed");
                res.end();
                return;
            }

            let stats;

            try {
                stats = fs.statSync(filepath);
            } catch (e) {
                ;
            }

            console.log(filepath);

            if (stats == undefined) {
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.write("404 - The page you requested was not found!");
            } else {
                if (stats.isDirectory()) {
                    // Get all contained files
                    let files = fs.readdirSync(filepath);

                    res.writeHead(200, { "Content-Type": "text/html" });

                    // Check for registeredTo.config.indexPages
                    let indexPage = undefined;
                    if (this.registeredTo?.config?.indexPages) {
                        for (let page of this.registeredTo.config.indexPages) {
                            if (files.includes(page)) {
                                indexPage = page;
                                break;
                            }
                        }
                    }

                    if (indexPage) {
                        res.write(fs.readFileSync(filepath + "/" + indexPage));
                    } else {
                        if (!this.registeredTo?.config?.allowDirectoryListing) {
                            res.write("403 - Directory listing not allowed!");
                        } else {
                            let html = `
                        <!DOCTYPE html>
                        <html>
                            <head>
                                <style>
                                    .file, .dir {
                                        list-style: none;
                                    }

                                    .file::before, .dir::before {
                                        content: '';
                                        display: inline-block;
                                        height: 1.1em;
                                        width: 1.1em;
                                        background-size: contain;
                                        margin: 3px 3px -3px 0px;
                                    }

                                    .dir::before {
                                        background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADb0lEQVRYR+2Wv2tUQRDHd98FzWEwJIIIEiIW/v7FEUgdRC0EwcLKf0PBQsydIFgIiogoWAQsRLBIsNAiGgQL7bQRwV+nBhHl8EeEaHK368zuzL7ZfS82Bq7JkbuXt2935zPfmZ03WnX5o7tsX60ABAXso7Xj1lbqyir8ox+trLv306y1zUxXGj37v04sV+gCgJkZcHY12OwY/HV3DsAb10pn1hoDCMYc7TnUmlwOiADQeYgA7LE37tUAw8RiOlqTOt/sqkqtOva5+b8QAaD9YJB81coErxEDpiCXBeM2A4WMU0Eqk6FqQIrIBuZlMLVjcKl3CFcaUNWv0SrLVL3/8GyD3PQ+LE6vg8VKuc1wscrQKoWBrjCGqmTVIbV6+JjSvevRJHw7MA++pu2vOBbu8TmMu2f+/9+tl6o6OkXCkoa/7g+aBZjTbkOo0UEw5HPBOi8qFRjTa3TfxjFV3TCqtF2Azf6QMYwVbo6G6YrBMgyD4zSHnustl2KAuecnbN/QgZw+eIYLgQy9dJ7MA+UcjQmDuLE0YuhZYtirBRJvvRID2C+3rWr/yL3ghdIr9q6wKRv3m/ujI+DcWaYQsALbriUAn66D1kJGNsabFUBwUzQYSxsBhDUMxldQYPuNBGD2KgYtj2EAKMYvxJnnO7nJawnqwsahoGSle71jIgW47LPNGS7zrCTRlgxJ0eMAzQA7byYAHy/6ECy1Kcf2n7JjsqIT5Hm0Xzymd91KAD5cSADksRJxdjEvUYiym7M85FOYS6oQnN59JwF4fz4PQRr/6J7BCCQYZvUYLlEhqELHcM9kAtA8Vx6CKIlkokkDItmi+sEwGJo4wfXeuwnAu7P+FEQVreQ8UzmNN0QADo0MnUjG5IjrffcSgLfjOUDhCFKtx/hjeQ1Vr8xzPkUCBNdwaeYcqE0nAG9OFwHCiSjJaplcUcHhuWmiijDgS742kwC8PkUAshYkL5hCYZE1QxqAcVZKJqkA1SOPE4BXJ6kS8ssnrYqp3PycX7MJrCKgqDLiGjoFI09igPmnR2zvwGZRRPK6XUxOhJFAYi73AjKPuF+gE/Lz+6LqP/gsBmhNbapDG3DGdS7UhmBHg20YtgzcnPoOh1o3nAi9Il5c7wQtg+shaD42Na6dgk4nb2xdT9QYPv6i7ld1+bMCsKJA1xX4C6Rnh05PSBWRAAAAAElFTkSuQmCC');
                                    }

                                    .file::before {
                                        background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAB70lEQVQ4T4WTy1IaQRSGf2VwnzfhFVLFLmZcGwioCA6hyoh4Iagk2SQSRGC4eEExEFnEiingFfAB8hRs2LClGOakZ6ZnoKNlejHd013n62/OmTMHPlqtFulEIF0HsVnX2Zp02HvG7JqfH45Go5exWOyPHTdnL37c3tKb5WX7FWSszIc17u5+wuPxoPfwMNTGYwfiAJrNJvl8PkyYgRHI7uezBfh9/wterxeDwQC9Xm+oKMoLY98BNBoN8vv9aLfb02v56tXiIgPco9/vmzvSwgK2NjfNWAdwc/OdAoG30CYTK8wS4GNqI7lcKFcqiG+9FwH1ep0CwSA6TxjMKsnyEtRyCYl4XARcXV/TSnAFE2YwkztThRXAMZFcEoqqip3Etgio1Wq0urqGTudxDv41KBSL2N1JiICLy0sKrYVYDrQncmCImHWBW5Jwms9jf29XBJyfX9D6eogZdB5VQTSQkTvNI7m/JwKqZ2cUDoehabwKvBTT77csJLeEk1wOqWRSBFSqVYpEIuj+x+C1LCObPcFB6oMIKJUrpGxsYKzxHMz8A7MWbmaQ+ZbF0UFKBKilEkWVKLrd53NgGBxnMkgfHoqAgqrSu2j02QTah1++HuNT+kgE5AtF1s6slc02NtqZtzXfM9vaaG9+/vlj2gT8BRtD/BG4NqabAAAAAElFTkSuQmCC');
                                    }
                                </style>
                                <title>Index of ${req.url}</title>
                            </head>
                        <body>
                            <h1>Index of ${req.url}</h1>
                            <ul>
                        `;
                            files.forEach((file) => {
                                html += "<li class=\"" + (fs.statSync(filepath + "/" + file).isDirectory() ? "dir" : "file") + "\"><a href=\"" + req.url.replace(/\/$/g, "") + "/" + file.replace(/(^\/|\/$)/g, "") + "\">" + file + "</a></li>";
                            });
                            html += "</ul></body></html>";
                            res.write(html);
                        }
                    }
                } else if (stats.isFile()) {
                    // Get file length in bytes

                    res.writeHead(200, { "Content-Type": mimeTypeByFileExtension[filepath.split(".").pop()] || "application/octet", "Content-Length": stats.size, "Last-Modified": stats.mtime.toUTCString() });
                    res.write(fs.readFileSync(filepath));
                }
            }

            res.end();
        }, "ANY", new RegExp(`^[^@]+@@@/${basepath.join("/")}/?.*$`))
    }

    /**
     * Requires a password to access the requestable
     * This may interfere with some functionality - e.g. loading images
     * Writes a cookie to the users browser for remembering login state
     * 
     * @todo Support multiple different AUTH-Cookies
     * @todo Don't write the plain password as cookie
     * 
     * @param {Requestable} requestable The Requestable to protect
     * @param {string} correct_password The correct password to access the Requestable
     * @returns {Requestable} A Requestable which replaces the given Requestable and handles logins
     */
    static requirePassword(requestable, correct_password) {
        return new Requestable((req, res) => {
            let loginpage = `
                <!DOCTYPE html>
                <html>
                    <head>
                        <title>Password required!</title>
                    </head>
                    <body>
                        <h1>Password required!</h1>
                        <form method="POST">
                            <input type="password" name="password" placeholder="Password" />
                            <input type="submit" value="Submit" />
                            <input type="hidden" name="origmethod" value="${req.method}" />
                        </form>
                    </body>
                </html>
            `;
            // Get cookie
            let cookies = req.headers.cookie;
            if (cookies) {
                cookies = cookies.split(";").map((c) => c.split("=")).reduce((obj, cookie) => {
                    obj[cookie[0]] = cookie[1];
                    return obj;
                }, {});
                if (cookies.password === correct_password) {
                    requestable.call(req, res);
                }
            } else if (req.method === "POST") {
                // Get the password and origmethod from the request
                // Parse the body
                let body = "";
                req.on("data", (chunk) => {
                    body += chunk;
                });
                req.on("end", () => {
                    let password = body.split("&").find((pair) => pair.startsWith("password=")).split("=")[1];
                    let origmethod = body.split("&").find((pair) => pair.startsWith("origmethod=")).split("=")[1];
                    if (password === correct_password) {
                        res.setHeader("Set-Cookie", "password=" + password);
                        // If the password is correct, then we can run the requestable
                        req.method = origmethod;
                        requestable.call(req, res);
                    } else {
                        // If the password is incorrect, then we can just send the loginpage
                        res.writeHead(401, { "Content-Type": "text/html" });
                        res.write(loginpage);
                        res.end();
                    }
                });
            } else {
                res.writeHead(401, { "Content-Type": "text/html" });
                res.write(loginpage);
                res.end();
            }
        }, requestable.method, requestable.path);
    }

    setServerManager(sm) {
        this.registeredTo = sm;
    } 
}

module.exports = {
    ServerManager,
    Requestable,
    NOTFOUNDFALLBACK
};

