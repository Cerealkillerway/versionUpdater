#!/usr/bin/env node
/*
* versionUpdater v3.0.8
* Licensed under MIT (https://raw.githubusercontent.com/Cerealkillerway/versionUpdater/master/license.txt)
*/

// require system modules
var fs = require('fs');
var exec = require('child_process').exec;

// require additional modules
var program = require('commander');
var jsonReader = require('read-json-sync');
var chalk = require('chalk');

var pjson = require(__dirname + '/../package.json');
var configuration;
var spacer22 = "                      ";
var spacer15 = "               ";

var DEBUG = false;
var standardList = [
    "package.json",
    "bower.json",
    "README.md",
    "index.html"
];
var supportedVersioningTypes = [
    "normal",
    "package"
];
var fileTypeExtensions = {
    package: ['json']
};

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
        description: "Package name and/or currentVersion missing in .versionFilesList",
        text: "Version is not able to understand package name and/or its current version\n" + spacer15 + "Please fill .versionFilesList.json with the missing informations"
    },
    "E002": {
        description: "Configuration file (.versionFilesList.json) corrupted",
        text: "It seems that your .versionFilesList.json is corrupted\n" + spacer15 + "It is required to re-init the folder (version init -f)"
    },
    "E003": {
        description: "Invalid command or options",
        text: "The command you typed is wrong or invalid\n" + spacer15 + "If you are using 'version init -a/-r with multiple files, please\n" + spacer15 + "insert them comma separated and not space separated"
    }
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
        text: "there is already a .versionFilesList.json in this folder\n" + spacer15 + "if you want to re-init, run 'version init -f'; this will overwrite existing .versionFilesList.json"
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
    if (fs.existsSync('./.versionFilesList.json')) return true;
    if (fs.existsSync('./versionFilesList.json')) {
        updateConfigurationFile();
        return true;
    }
    else {
        return false;
    }
}


// exit with error if not initialized
function onlyInit() {
    if (!isInit()) {
        sendError("E000");
    }
}


// delete files list
function revertInit(reinit, list, prefix, name, currentVersion) {
    exec("rm -Rf ./.versionFilesList.json", function(error, stdout, stderr) {
        if (error) sendProcessError(stdout, stderr);

        print("Deleted previous .versionFilesList.json", 'important', 'date');
        if (reinit) init(list, prefix, name, currentVersion);
    });
}


// load configuration file; fallback to global if is not an initialized folder
function loadConfiguration() {
    var configuration;

    if (isInit()) {
        configuration = jsonReader('./.versionFilesList.json');

        // check configuration file's integrity
        if (!configuration.name || !configuration.currentVersion || !configuration.filesList || !configuration.versionPrefix) {
            sendError("E002");
        }

        // check .versionFilesList.json for missing informations
        if (configuration.name.length === 0 || configuration.currentVersion.length === 0) {
            sendError("E001");
        }
    }
    return configuration;
}

function updateConfigurationFile() {
    // check if .versionFilesList.json is correct version
    // missing currentVersion in configuration file (.versionFilesList.json)
    var warningDisplayed = false;
    var updateConfWarning = "It seems that your version configuration file comes from an older version of versionUpdater.\nWill now try to update it to latest standard required by current versionUpdater";

    var oldData = jsonReader('versionFilesList.json');

    print(updateConfWarning, "msgWarning", "spaced22");

    if (!oldData.currentVersion || !oldData.name) {
        var discoveredData = discoverVersion();

        oldData.name = discoveredData.name;
        oldData.currentVersion = discoveredData.currentVersion;
    }

    if (!oldData.versionPrefix) {
        oldData.versionPrefix = "v";
    }

    // if .gitignore exists in current folder, check if it is needed to change versionFilesList.json to .versionFilesList.json
    if (fs.existsSync(".gitignore")) {
        var gitIgnore = fs.readFileSync(".gitignore");
        var ignoreList = gitIgnore.toString().split("\n");

        // add configuration file to gitignore only if it is not already there
        var foundIndex = ignoreList.indexOf("versionFilesList.json");
        if (foundIndex >= 0) {
            ignoreList.splice(foundIndex, 1);
            ignoreList.push(".versionFilesList.json");
            gitIgnore = ignoreList.join("\n");
            fs.writeFileSync(".gitignore", gitIgnore);

            print("Added .versionFilsList.json to .gitignore", "completed", "date");
        }
    }

    // save new configuration file
    fs.writeFileSync("./.versionFilesList.json", JSON.stringify(oldData, null, 2));
    //delete old one
    fs.unlinkSync("./versionFilesList.json");

    print("New configuration file (.versionFilesList.json) has been saved correctly", "completed", "spaced22");
}


// discover project version
function discoverVersion() {
    // try to understand package name and current version
    // from package.json or bower.json
    var packageFile;
    var results = {
        name: "",
        currentVersion: ""
    };

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

        results.name = packageData.name;
        results.currentVersion = packageData.version;
    }
    else {
        print("Can't discover package name and/or currentVersion automatically", "msgWarning", "spaced22");
        print('Please fill .versionFilesList.json with the missing informations', "msgWarning", "spaced22");
    }

    return results;
}

// initialization
function init(list, prefix, name, currentVersion) {

    print("Initializing folder...", "important", "date");

    var configuration = {
        name: "",
        currentVersion: "",
        versionPrefix: "v"
    };

    var confirmedFiles = [];

    // if specified, set custom version prefix for non json files
    if (prefix) {
        configuration.versionPrefix = prefix;
    }

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
        print("The file list is empty, please fill it manually in .versionFilesList.json", "strongWarning", "spaced22");
    }
    else {
        print(confirmedFiles.length + " files added to list", "completed", "spaced22");
    }

    // discover projcet name and current version or use the ones manually specified
    if (name) {
        configuration.name = name;
    }
    if (currentVersion) {
        configuration.currentVersion = currentVersion;
    }
    if (!name || !currentVersion) {
        var discoveredData = discoverVersion();

        if (!name) {
            configuration.name = discoveredData.name;
        }
        if (!currentVersion) {
            configuration.currentVersion = discoveredData.currentVersion;
        }
    }

    fs.writeFileSync("./.versionFilesList.json", JSON.stringify(configuration, null, 2));
    print(".versionFilesList.json created", "completed", "date");

    // if .gitignore exists in current folder, add .versionFilesList.json to it
    if (fs.existsSync(".gitignore")) {
        var gitIgnore = fs.readFileSync(".gitignore");
        var ignoreList = gitIgnore.toString().split("\n");

        // add configuration file to gitignore only if it is not already there
        if (ignoreList.indexOf(".versionFilesList.json") < 0) {
            ignoreList.push(".versionFilesList.json");
            gitIgnore = ignoreList.join("\n");
            fs.writeFileSync(".gitignore", gitIgnore);

            print("Added .versionFilsList.json to .gitignore", "completed", "date");
        }
    }

    print("folder initialized", "completed", "date");

    console.log("");
    process.exit(0);
}

// add and remove files from filesList without re-init
function updateFilesList(adds, removes, prefix, name, currentVersion) {
    var configuration = loadConfiguration();
    var filesList = configuration.filesList;
    var modified = false;

    // manage custom prefix
    if (prefix) {
        configuration.versionPrefix = prefix;
        modified = true;
        print("new custom version prefix: " + prefix, "completed", "spaced22");
    }

    // manage custom name and currentVersion
    if (name) {
        configuration.name = name;
        modified = true;
        print("new project name: " + name, "completed", "spaced22");
    }
    if (currentVersion) {
        configuration.currentVersion = currentVersion;
        modified = true;
        print("new project currentVersion: " + currentVersion, "completed", "spaced22");
    }

    function findFileInList(fileName) {
        for(i = 0; i < configuration.filesList.length; i++) {
            if (configuration.filesList[i].indexOf(fileName) === 0) {
                return i;
            }
        }
        return -1;
    }

    // manage additions
    if (adds) {
        var addArray = adds.split(',');

        addArray.forEach(function(a, index) {
            var fileData = a.split(':');
            var fileName = fileData[0];
            var fileType = fileData[1];

            var fileString;
            var fileTypeString;

            if (fileType) {
                fileString = a;
                fileTypeString = fileType;
            }
            else {
                // autodetect file type
                var ext = fileName.split('.');
                    ext = ext[ext.length - 1];

                for (var key in fileTypeExtensions) {
                    if (fileTypeExtensions.hasOwnProperty(key)) {
                        var extList = fileTypeExtensions[key];

                        if (extList.indexOf(ext) >= 0) {
                            fileType = key;
                            break;
                        }
                    }
                }

                if (fileType) {
                    fileString = fileName + ':' + fileType;
                    fileTypeString = fileType;
                }
                else {
                    fileString = fileName;
                    fileTypeString = "normal";
                }
            }

            if (fileTypeString !== "normal" && supportedVersioningTypes.indexOf(fileTypeString) < 0) {
                print("The versioning type: " + fileTypeString + "is unknown -> file skipped", "strongWarning", "date");
            }
            else {
                if (fs.existsSync(fileName)) {
                    var isInFileList = findFileInList(fileName);

                    if (isInFileList < 0) {
                        if (!modified) {
                            modified = true;
                        }

                        filesList.push(fileString);
                        print("file " + fileName + " added to list, type of file: " + fileTypeString, "completed", "date");
                    }
                    else {
                        var oldFileType = configuration.filesList[isInFileList].split(':')[1];

                        if (oldFileType !== fileType) {
                            if (!modified) {
                                modified = true;
                            }

                            filesList[isInFileList] = fileString;
                            print("file " + fileName + " is already in list but the type has been changed to: " + fileTypeString, "completed", "date");
                        }
                        else {
                            print("file " + fileName + " is already in versionFilesList.json with same type -> discarded", "msgWarning", "date");
                        }
                    }
                }
                else {
                    print("file " + a[0] + " does not exists -> discarded", "msgWarning", "date");
                }
            }
        });
    }

    //manage removals
    if (removes) {
        console.log("");
        var remArray = removes.split(',');

        remArray.forEach(function(r, index) {
            var isInFileList = findFileInList(r);

            if (isInFileList >= 0) {
                if (!modified) {
                    modified = true;
                }

                filesList.splice(isInFileList, 1);
                print("file " + r + " removed from list", "completed", "date");
            }
            else {
                print("file " + r + " is not in list -> nothing to remove", "msgWarning", "date");
            }
        });
    }

    if (modified) {
        configuration.filesList = filesList;

        fs.writeFileSync("./.versionFilesList.json", JSON.stringify(configuration, null, 2));
        print(".versionFilesList.json updated", "completed", "date");
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
    var vOldVersion = configuration.versionPrefix + oldVersion;

    // update all files from .versionFilesList.json
    filesList.forEach(function(file, index) {
        var fileData = file.split(':');
        var fileName = fileData[0];
        var fileType = fileData[1];
        var STOP = false;

        if (!fileType) {
            fileType = 'normal';
        }

        var data, lines;
        var fileOccurencies = 0;
        var versionToReplace;
        var operations = {
            normal: function(line) {
                return replaceAll(line, vOldVersion, "v" + newVersion);
            },
            package: function(line) {
                if (line.indexOf("version") >= 0) {
                    STOP = true;
                    return line.replace(oldVersion, newVersion);
                }
            }
        };

        switch (fileType) {
            case 'package':
            versionToReplace = oldVersion;
            break;

            default:
            versionToReplace = vOldVersion;
        }

        debugLog("updating [" + fileType + "] file: " + fileName);

        data = fs.readFileSync(fileName);
        lines = data.toString().split("\n");

        for (var i = 0; i < lines.length; i++) {
            if (lines[i].indexOf(versionToReplace) >= 0) {
                occurencies++;
                fileOccurencies++;

                lines[i] = operations[fileType](lines[i]);

                if (STOP) {
                    break;
                }
            }
        }
        lines = lines.join("\n");

        fs.writeFileSync(fileName, lines);

        var replacementWord = "replacement";

        if (fileOccurencies === 0 || fileOccurencies > 1) {
            replacementWord = replacementWord + "s";
        }
        print("processed file: " + fileName + " [" + fileType + "] - made " + fileOccurencies + " " + replacementWord, 'completed', 'date');
    });

    // update configuration file
    configuration.currentVersion = newVersion;
    fs.writeFileSync('.versionFilesList.json', JSON.stringify(configuration, null, 2));

    var fileWord = "file";
    var numberWord = "number";

    if (filesList.length > 1) {
        fileWord = "files";
    }
    if (occurencies > 1) {
        numberWord = "numbers";
    }
    print("updated " + occurencies + " version " + numberWord + " across " + filesList.length + " " + fileWord, "completed", "spaced22");
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
    .description('Initialize folder with standard file list')
    .option('-f, --force', 're-init overwriting current file list')
    .option('-p, --prefix <versionPrefix>', 'specify a custom version number prefix for non json files')
    .option('-a --add <files>', 'add files to files list')
    .option('-r --remove <files>', 'remove files from files list')
    .option('--projectName <name>', 'manually specify name for current project')
    .option('--currentVersion <version>', 'manually specify current version of the project')
    .action(function(options) {
        if (!options.parent) {
            sendError('E003');
        }
        isDebug(options.parent.debug);
        // if already initialized, and -f option not provided, send warning and exit
        // otherwise re-initialize or update
        if (isInit()) {
            if (options.force) {
                revertInit(true, options.add, options.prefix, options.projectName, options.currentVersion);
            }
            else {
                if (options.add || options.remove || options.prefix || options.projectName || options.currentVersion) {
                    updateFilesList(options.add, options.remove, options.prefix, options.projectName, options.currentVersion);
                }
                else {
                    sendWarning('W001');
                }
            }
        }
        // if not initialized before, init now
        else {
            init(options.add, options.prefix, options.projectName, options.currentVersion);
        }
    });

// echo filesList
program
    .command('list')
    .description('Echo all files currently in filesList')
    .option('--current', 'echo also current version of the project')
    .action(function(options) {
        onlyInit();

        var configuration = loadConfiguration();
        var filesCounter = 0;

        print("Loaded .versionFilesList.json; current filesList:\n", "completed", "date");

        // manage echo of current version of the project
        if (options.current) {
            print("Current version of " + configuration.name + ": " + configuration.currentVersion, "completed", "spaced22");
        }

        var textLength;
        var spaces;
        var spacesLength;

        configuration.filesList.forEach(function(file, index) {
            var fileData = file.split(':');
            var fileName = fileData[0];
            var fileType = fileData[1];

            if (!fileType) {
                fileType = 'normal';
            }

            spaces = "";
            textLength = (index + 1).toString().length + fileName.length;
            spacesLength = 50 - textLength;

            if (spacesLength > 0) {
                while (spacesLength > 0) {
                    spaces = spaces + " ";
                    spacesLength--;
                }
            }
            else {
                spaces = " ";
            }

            print((index + 1) + " - " + fileName + spaces + '[' + fileType + ']', "important", "spaced22");
            filesCounter++;
        });

        var fileWord = "file";

        if (filesCounter === 0 || filesCounter > 1) {
            fileWord = fileWord + "s";
        }

        console.log("");
        print("There are " + filesCounter + " " + fileWord + " in filesList", "completed", "spaced22");
        console.log("");
        process.exit(0);
    });

// update
program
    .command('update [newVersion]')
    .description('Update version number')
    .option('-M, --major [howMany]', 'Increase Major version number (X+1.0.0)')
    .option('-m, --minor [howMany]', 'Increase minor version number (x.X+1.0)')
    .option('-p, --patch [howMany]', 'Increase patch version number (x.x.X+1)')
    .action(function(newVersion, options) {
        onlyInit();

        if (!newVersion && !options.major && !options.minor && !options.patch) {
            print("You must specify newVersion parameter or auto-increment option (-M, -m or -p)", "strongWarning");
            console.log("");
            process.exit(1);
        }

        isDebug(options.parent.debug);

        var configuration = loadConfiguration();

        print("loaded configuration (.versionFilesList.json)\n", 'completed', 'date');

        // manage quick incerment options
        if (!newVersion) {
            var currentVersionArray = configuration.currentVersion.split('.');
            var Mincrement = 1, mIncrement = 1, pIncrement = 1;

            if (options.major) {
                if (options.major !== true) {
                    Mincrement = parseInt(options.major);
                }
                currentVersionArray[0] = parseInt(currentVersionArray[0]) + Mincrement;
                currentVersionArray[1] = 0;
                currentVersionArray[2] = 0;
            }
            if (options.minor) {
                if (options.minor !== true) {
                    mIncrement = parseInt(options.minor);
                }
                currentVersionArray[1] = parseInt(currentVersionArray[1]) + mIncrement;
                currentVersionArray[2] = 0;
            }
            if (options.patch) {
                if (options.patch !== true) {
                    pIncrement = parseInt(options.patch);
                }
                currentVersionArray[2] = parseInt(currentVersionArray[2]) + pIncrement;
            }

            newVersion = currentVersionArray.join('.');
        }

        print("will now update project to version " + newVersion, 'important', 'date');

        updateFiles(configuration, newVersion);
        console.log("");
        process.exit(0);
    });



program.parse(process.argv);

// no command -> print project's current version
if (process.argv.length === 2) {
    onlyInit();

    var configuration = loadConfiguration();

    print("current: " + configuration.currentVersion, 'completed', 'date');
    console.log("");
    process.exit(0);
}
