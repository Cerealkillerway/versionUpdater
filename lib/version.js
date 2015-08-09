#!/usr/bin/env node
// require system modules
var fs = require('fs');
var exec = require('child_process').exec;

// require additional modules
var program = require('commander');
var jsonReader = require('read-json-sync');
var chalk = require('chalk');

var pjson = require(__dirname + '/../package.json');
var configuration, gConf;
var spacer22 = "                      ";
var spacer15 = "               ";

var DEBUG = false;

process.stdin.setEncoding('utf8');



// display debug logs
function debugLog(message) {
    if (DEBUG) console.log(spacer22 + "DEBUG: " + message);
}


// DateTime
function getDateTime() {
    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;
    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;
    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;
    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return "[" + year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec + "]";
}


// stdout templates
function print(text, type, layout, param) {
    msgTypes = {
        error: chalk.bgRed.bold,
        warning: chalk.bgYellow.bold,

        date: chalk.magenta.bold,
        msgWarning: chalk.yellow.bold,
        strongWarning: chalk.red.bold,
        completed: chalk.green.bold,
        important: chalk.cyan.bold,
        question: chalk.inverse.bold,
        stdout: chalk.bgBlack.bold
    };

    if (param === undefined) param = "";

    switch (layout) {
        case "date":
        var now = new Date();
        console.log(msgTypes.date(getDateTime()) + " " + msgTypes[type](text), param);
        break;

        case "spaced22":
        console.log(msgTypes[type](spacer22 + text), param);
        break;

        default:
        console.log(msgTypes[type](text), param);
    }
}


// make all the lines of a text as long as terminal's width
function fullWidth(text, param) {
    var cols = process.stdout.columns;
    var lines = text.split('\n');
    
    for (i = 0; i < lines.length; i++) {
        var size = cols;
        if (i === 0) size = size - 15;
        if ((lines[i].indexOf('%') > 0) && (param !== undefined)) size = size - param.length + 2;
        while (lines[i].length < size) {
            lines[i] = lines[i] + " ";
        }
    }
    text = lines.join('\n');

    return text;
}


// ERRORS
var Errors = {
    "E000": {
        description: "The current folder has not been initialized for the use with version",
        text: "You are not in a version initialized folder\n" + spacer15 + "Please run 'version init' first"
    },
    "E001": {
        description: "Package name and/or currentVersion missing in versionFilesList",
        text: "Version is not able to understand package name and/or its current version\n" + spacer15 + "Please fill versionFilesList.json with the missing informations"
    },
};
function sendError(code, param) {
    var text = fullWidth(Errors[code].text, param);

    print("[ERROR - " + code + "] " + text + "\n", 'error', 'default', param);
    process.exit(1);
}
function sendProcessError(stdout, stderr, callback) {
    var text = spacer15 + 'ERROR while executing operations:\n' + spacer15 + "--- STDOUT: ---\n" + spacer15 + stdout + "\n";
    text = text + spacer15 + "--- STDERR ---\n" + spacer15 + stderr + "\n";

    print(text + "\n", 'error', 'default');
    if (callback) callback();
    process.exit(1);
}


// WARNINGS
var Warnings = {
    "W001": {
        description: "You are trying to re-initialize alredy initialized folder, is this really what you want?",
        text: "there is already a versionFilesList.json in this folder\n" + spacer15 + "if you want to re-init, run 'version init -f'; this will overwrite existing versionFilesList.json"
    }
};
function sendWarning(code, param) {
    var text = fullWidth(Warnings[code].text, param);

    print("[!WARN - " + code + "] " + text + "\n", 'warning', 'default', param);
    process.exit(1);
}


// manage debug mode
function isDebug(debug) {
    if (debug) {
        DEBUG = true;
        print("\nDEBUG MODE ON\n", "msgWarning", "spaced22");
    }
}


// check if initialized
function isInit() {
    if (fs.existsSync('./versionFilesList.json')) return true;

    return false;
}


// exit with error if not initialized
function onlyInit() {
    if (!isInit()) {
        sendError("E000");
    }
}


// delete files list
function revertInit(reinit, list) {
    exec("rm -Rf ./versionFilesList.json", function(error, stdout, stderr) {
        if (error) sendProcessError(stdout, stderr);

        print("Deleted previous versionFilesList.json", 'important', 'date');
        if (reinit) init(list);
    });
}


// load configuration file; fallback to global if is not an initialized folder
function loadConfiguration() {
    var configuration;

    if (isInit()) {
        configuration = jsonReader('./versionFilesList.json');

        if (configuration.name.length === 0 || configuration.currentVersion.length === 0) {
            sendError("E001");
        }
    }
    return configuration;
}


// initialization
function init(list) {

    print("Initializing folder...", "important", "date");

    var configuration = {
        name: "",
        currentVersion: ""
    };
    var standardList = [
        "package.json",
        "bower.json",
        "README.md",
        "index.html"
    ];
    var confirmedFiles = [];

    standardList.forEach(function(file, index) {
        if (fs.existsSync(file)) {
            confirmedFiles.push(file);
            print("file " + file + " added to list", "completed", "date");
        } 
    });

    if (list) {
        var addedFiles = list.split(',');

        addedFiles.forEach(function(file, index) {
            if (fs.existsSync(file)) {
                confirmedFiles.push(file);
                print("file " + file + " added to list", "completed", "date");
            }
            else {
                print("file " + file + " does not exists -> discarded", "msgWarning", "date");
            }
        });
    }

    configuration.filesList = confirmedFiles;
    if (confirmedFiles.length === 0) {
        print("The file list is empty, please fill it manually in versionFilesList.json", "strongWarning", "spaced22");
    }
    else {
        print(confirmedFiles.length + " files added to list", "completed", "spaced22");
    }

    // try to understand package name and current version
    // from package.json or bower.json
    var packageFile;

    if (fs.existsSync("package.json")) {
        packageFile = "package.json";
    }
    else if (fs.existsSync("bower.json")) {
        packageFile = "bower.json";
    }

    if (packageFile) {
        var packageData = jsonReader(packageFile);

        debugLog("Reading packageFile for init:");
        debugLog("Discovered pacakge name: " + packageData.name + " - discovered package version " + packageData.version);
        
        configuration.name = packageData.name;
        configuration.currentVersion = packageData.version;
    }
    else {
        print("Can't discover package name and currentVersion automatically", "msgWarning", "spaced22");
        print('Please fill versionFilesList.json with "name" and "currentVersion"', "msgWarning", "spaced22");
    }

    fs.writeFileSync("./versionFilesList.json", JSON.stringify(configuration, null, 2));
    print("versionFilesList.json created", "completed", "date");

    print("folder initialized", "completed", "date");
    
    if (packageFile) {
        print("now it is possible to use version command", "completed", "spaced22");
    }

    console.log("\n");
    process.exit(0);
}

// add and remove files from filesList without re-init
function updateFileList(adds, removes) {
    var configuration = jsonReader('versionFilesList.json');
    var filesList = configuration.filesList;
    var modified = false;

    // manage additions
    if (adds) {
        var addArray = adds.split(',');

        addArray.forEach(function(a, index) {
            if (fs.existsSync(a)) {
                if (!modified) modified = true;

                filesList.push(a);
                print("file " + a + " added to list", "completed", "date");
            }
            else {
                print("file " + a + " does not exists -> discarded", "msgWarning", "date");
            }
        });
    }

    //manage removals
    if (removes) {
        console.log("");
        var remArray = removes.split(',');

        remArray.forEach(function(r, index) {
            var found = filesList.indexOf(r);

            if (found >= 0) {
                if (!modified) modified = true;

                filesList.splice(found, 1);
                print("file " + r + " removed from list", "completed", "date");
            }
            else {
                print("file " + r + " is not in list -> nothing to remove", "msgWarning", "date");
            }
        });
    }

    if (modified) {
        configuration.filesList = filesList;

        fs.writeFileSync("./versionFilesList.json", JSON.stringify(configuration, null, 2));
        print("versionFilesList.json updated", "completed", "date");
    }

    process.exit(0);
}


// update version in every file
function escapeRegExp(string) {
    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}
function replaceAll(string, find, replace) {
    return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}
function updateFiles(configuration, newVersion) {
    var occurencies = 0;
    var filesList = configuration.filesList;
    var oldVersion = configuration.currentVersion;
    var vOldVersion = "v" + oldVersion;

    // update all files from versionFilesList
    filesList.forEach(function(file, index) {
        var ext = file.substring(file.lastIndexOf('.') + 1, file.length);
        var data, lines;

        if (ext === "json") {
            debugLog("updating json file: " + file);

            data = jsonReader(file);
            if (data.version) {
                data.version = newVersion;
                lines = JSON.stringify(data, null, 2);
                occurencies++;
            }
        }
        else {
            debugLog("updating not json file: " + file);

            data = fs.readFileSync(file);
            lines = data.toString().split("\n");

            for (var i = 0; i < lines.length; i++) {
                if (lines[i].indexOf(vOldVersion) >= 0) {
                    occurencies++;
                    lines[i] = replaceAll(lines[i], vOldVersion, "v" + newVersion);
                }
            }
            lines = lines.join("\n");
        }
        
        fs.writeFileSync(file, lines);

        print("processed file: " + file, 'completed', 'date');
    });

    // update configuration file
    configuration.currentVersion = newVersion;
    fs.writeFileSync('versionFilesList.json', JSON.stringify(configuration, null, 2));
    
    var fileWord = "file";
    var numberWord = "number";

    if (filesList.length > 1) {
        fileWord = "files";
    }
    if (occurencies > 1) {
        numberWord = "numbers";
    }
    print("updated " + occurencies + " version " + numberWord + " across " + filesList.length + " " + fileWord, "completed", "date");
}





// ================================================================================================
// ======= MAIN FLOW ============ MAIN FLOW ============ MAIN FLOW ============ MAIN FLOW =========
// ================================================================================================
console.log("");
print('======================== VersionUpdater ========================', 'stdout');

program
    .version(pjson.version)
    .description("Automatically update version number in all specified files of your project")
    .usage('[options] command [command-options]')
    .option('-d --debug', 'activate debug mode');

// init
program
    .command('init')
    .description('Initialize folder with starndard file list')
    .option('-f, --force', 're-init overwriting current file list')
    .option('-a --add <files>', 'add files to files list')
    .option('-r --remove <files>', 'remove files from files list')
    .action(function(options) {
        isDebug(options.parent.debug);
        // if already initialized, and -f option not provided, send warning and exit
        // otherwise re-initialize
        if (isInit()) {
            if (options.force) {
                revertInit(true, options.add);
            }
            else {
                if (options.add || options.remove) {
                    updateFileList(options.add, options.remove);
                }
                else {
                    sendWarning('W001');
                }
            }
        }
        // if not initialized before, init now
        else {
            init(options.add);
        }
    });

// update
program
    .command('update [newVersion]')
    .description('Update version number')
    .option('-M, --major', 'Increase Major version number (X+1.x.x)')
    .option('-m, --minor', 'Increase minor version number (x.X+1.x)')
    .option('-p, --patch', 'Increase patch version number (x.x.X+1)')
    .action(function(newVersion, options) {
        onlyInit();

        if (!newVersion && !options.major && !options.minor && !options.patch) {
            print("You must specify newVersion parameter or auto-increment option (-M, -m or -p)", "strongWarning");
            console.log("");
            process.exit(1);
        }

        isDebug(options.parent.debug);

        var configuration = loadConfiguration();

        print("loaded configuration (versionFilesList.json)\n", 'completed', 'date');

        // manage quick incerment options
        if (!newVersion) {
            var currentVersionArray = configuration.currentVersion.split('.');

            if (options.major) {
                currentVersionArray[0] = parseInt(currentVersionArray[0]) + 1;
            }
            if (options.minor) {
                currentVersionArray[1] = parseInt(currentVersionArray[1]) + 1;
            }
            if (options.patch) {
                currentVersionArray[2] = parseInt(currentVersionArray[2]) + 1;
            }

            newVersion = currentVersionArray.join('.');
        }

        print("will now update project to version " + newVersion, 'important', 'date');

        updateFiles(configuration, newVersion);
        console.log("");
        process.exit(0);
    });



program.parse(process.argv);

// no command
if (process.argv.length === 2) {
    print('Missing command - What should I do for you???\n' + spacer22 + 'Use version --help if you don\'t know what to do...\n', 'strongWarning', 'spaced22');
}