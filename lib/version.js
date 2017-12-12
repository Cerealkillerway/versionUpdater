#!/usr/bin/env node
/*
* versionUpdater v3.13.1
* Licensed under MIT (https://raw.githubusercontent.com/Cerealkillerway/versionUpdater/master/license.txt)
*/

// require system modules
let fs = require('fs');
let exec = require('child_process').exec;

// require additional modules
let program = require('commander');
let jsonReader = require('read-json-sync');
let chalk = require('chalk');

let pjson = require(__dirname + '/../package.json');
let configuration;
let spacer22 = '                      ';
let spacer15 = '               ';

let DEBUG = false;
let standardList = [
    'package.json',
    'bower.json',
    'README.md',
    'index.html',
    'composer.json'
];
let supportedVersioningTypes = [
    'normal',
    'package'
];
let fileTypeExtensions = {
    package: ['json']
};

process.stdin.setEncoding('utf8');



// display debug logs
function debugLog(message) {
    if (DEBUG) console.log(spacer22 + 'DEBUG: ' + message);
}


// DateTime
function getDateTime() {
    let date = new Date();

    let hour = date.getHours();
    hour = (hour < 10 ? '0' : '') + hour;
    let min  = date.getMinutes();
    min = (min < 10 ? '0' : '') + min;
    let sec  = date.getSeconds();
    sec = (sec < 10 ? '0' : '') + sec;
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    month = (month < 10 ? '0' : '') + month;
    let day  = date.getDate();
    day = (day < 10 ? '0' : '') + day;

    return '[' + year + ':' + month + ':' + day + ':' + hour + ':' + min + ':' + sec + ']';
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

    if (param === undefined) param = '';

    switch (layout) {
        case 'date':
        console.log(msgTypes.date(getDateTime()) + ' ' + msgTypes[type](text), param);
        break;

        case 'spaced22':
        console.log(msgTypes[type](spacer22 + text), param);
        break;

        default:
        console.log(msgTypes[type](text), param);
    }
}


// make all the lines of a text as long as terminal's width
function fullWidth(text, param) {
    let cols = process.stdout.columns;
    let lines = text.split('\n');

    for (i = 0; i < lines.length; i++) {
        let size = cols;
        if (i === 0) size = size - 15;
        if ((lines[i].indexOf('%') > 0) && (param !== undefined)) size = size - param.length + 2;
        while (lines[i].length < size) {
            lines[i] = lines[i] + ' ';
        }
    }
    text = lines.join('\n');

    return text;
}


// ERRORS
let Errors = {
    'E000': {
        description: 'The current folder has not been initialized for the use with version',
        text: 'You are not in a version initialized folder\n' + spacer15 + 'Please run "version init" first'
    },
    'E001': {
        description: 'Package name and/or currentVersion missing in .versionFilesList',
        text: 'Version is not able to understand package name and/or its current version\n' + spacer15 + 'Please fill .versionFilesList.json with the missing informations'
    },
    'E002': {
        description: 'Configuration file (.versionFilesList.json) corrupted',
        text: 'It seems that your .versionFilesList.json is corrupted\n' + spacer15 + 'It is required to re-init the folder (version init -f)'
    },
    'E003': {
        description: 'Invalid command or options',
        text: 'The command you typed is wrong or invalid\n' + spacer15 + 'If you are using "version init -a/-r" with multiple files, please\n' + spacer15 + 'insert them comma separated and not space separated'
    }
};
function sendError(code, param) {
    let text = fullWidth(Errors[code].text, param);

    print('[ERROR - ' + code + '] ' + text + '\n', 'error', 'default', param);
    process.exit(1);
}
function sendProcessError(stdout, stderr, callback) {
    let text = spacer15 + 'ERROR while executing operations:\n' + spacer15 + '--- STDOUT: ---\n' + spacer15 + stdout + '\n';
    text = text + spacer15 + "--- STDERR ---\n" + spacer15 + stderr + "\n";

    print(text + '\n', 'error', 'default');
    if (callback) callback();
    process.exit(1);
}


// WARNINGS
let Warnings = {
    'W001': {
        description: 'You are trying to re-initialize alredy initialized folder, is this really what you want?',
        text: 'there is already a .versionFilesList.json in this folder\n' + spacer15 + 'if you want to re-init, run "version init -f"; this will overwrite existing .versionFilesList.json'
    }
};
function sendWarning(code, param) {
    let text = fullWidth(Warnings[code].text, param);

    print('[!WARN - ' + code + '] ' + text + '\n', 'warning', 'default', param);
    process.exit(1);
}


// manage debug mode
function isDebug(debug) {
    if (debug) {
        DEBUG = true;
        print('\nDEBUG MODE ON\n', 'msgWarning', 'spaced22');
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
        sendError('E000');
    }
}


// delete files list
function revertInit(reinit, list, prefix, name, currentVersion) {
    exec('rm -Rf ./.versionFilesList.json', function(error, stdout, stderr) {
        if (error) sendProcessError(stdout, stderr);

        print('Deleted previous .versionFilesList.json', 'important', 'date');
        if (reinit) init(list, prefix, name, currentVersion);
    });
}


// load configuration file; fallback to global if is not an initialized folder
function loadConfiguration() {
    let configuration;

    if (isInit()) {
        configuration = jsonReader('./.versionFilesList.json');

        // check configuration file's integrity
        if (!configuration.name || !configuration.currentVersion || !configuration.filesList || !configuration.versionPrefix) {
            sendError('E002');
        }

        // check .versionFilesList.json for missing informations
        if (configuration.name.length === 0 || configuration.currentVersion.length === 0) {
            sendError('E001');
        }
    }
    return configuration;
}

function updateConfigurationFile() {
    // check if .versionFilesList.json is correct version
    // missing currentVersion in configuration file (.versionFilesList.json)
    let warningDisplayed = false;
    let updateConfWarning = 'It seems that your version configuration file comes from an older version of versionUpdater.\nWill now try to update it to latest standard required by current versionUpdater';

    let oldData = jsonReader('versionFilesList.json');

    print(updateConfWarning, 'msgWarning', 'spaced22');

    if (!oldData.currentVersion || !oldData.name) {
        let discoveredData = discoverVersion();

        oldData.name = discoveredData.name;
        oldData.currentVersion = discoveredData.currentVersion;
    }

    if (!oldData.versionPrefix) {
        oldData.versionPrefix = 'v';
    }

    // if .gitignore exists in current folder, check if it is needed to change versionFilesList.json to .versionFilesList.json
    if (fs.existsSync('.gitignore')) {
        let gitIgnore = fs.readFileSync('.gitignore');
        let ignoreList = gitIgnore.toString().split('\n');

        // add configuration file to gitignore only if it is not already there
        let foundIndex = ignoreList.indexOf('versionFilesList.json');
        if (foundIndex >= 0) {
            ignoreList.splice(foundIndex, 1);
            ignoreList.push('.versionFilesList.json');
            gitIgnore = ignoreList.join('\n');
            fs.writeFileSync('.gitignore', gitIgnore);

            print('Added .versionFilsList.json to .gitignore', 'completed', 'date');
        }
    }

    // save new configuration file
    fs.writeFileSync('./.versionFilesList.json', JSON.stringify(oldData, null, 2));
    //delete old one
    fs.unlinkSync('./versionFilesList.json');

    print('New configuration file (.versionFilesList.json) has been saved correctly', 'completed', 'spaced22');
}


// discover project version
function discoverVersion() {
    // try to understand package name and current version
    // from package.json or bower.json
    let packageFile;
    let results = {
        name: '',
        currentVersion: ''
    };

    if (fs.existsSync('package.json')) {
        packageFile = 'package.json';
    }
    else if (fs.existsSync('bower.json')) {
        packageFile = 'bower.json';
    }

    if (packageFile) {
        let packageData = jsonReader(packageFile);

        debugLog('Reading packageFile for init:');
        debugLog('Discovered pacakge name: ' + packageData.name + ' - discovered package version ' + packageData.version);

        if (packageData.name) {
            results.name = packageData.name;
        }
        else {
            print('Can\'t discover package name automatically', 'msgWarning', 'spaced22');
        }

        if (packageData.version) {
            results.currentVersion = packageData.version;
        }
        else {
            print('Can\'t discover package\'s currentVersion automatically', 'msgWarning', 'spaced22');
        }
    }
    else {
        print('Can\'t discover package name and/or currentVersion automatically', 'msgWarning', 'spaced22');
        print('Please fill .versionFilesList.json with the missing informations', 'msgWarning', 'spaced22');
    }

    return results;
}

// initialization
function init(list, prefix, name, currentVersion) {

    print('Initializing folder...', 'important', 'date');

    let configuration = {
        name: '',
        currentVersion: '',
        versionPrefix: 'v'
    };

    let confirmedFiles = [];

    // if specified, set custom version prefix for non json files
    if (prefix) {
        configuration.versionPrefix = prefix;
    }

    standardList.forEach(function(file, index) {
        if (fs.existsSync(file)) {
            if (file.endsWith('.json')) {
                confirmedFiles.push(file + ':package');
            }
            else {
                confirmedFiles.push(file);
            }

            print('file ' + file + ' added to list', 'completed', 'date');
        }
    });

    if (list) {
        let addedFiles = list.split(',');

        addedFiles.forEach(function(file, index) {
            if (fs.existsSync(file)) {
                confirmedFiles.push(file);
                print('file ' + file + ' added to list', 'completed', 'date');
            }
            else {
                print('file ' + file + ' does not exists -> discarded', 'msgWarning', 'date');
            }
        });
    }

    configuration.filesList = confirmedFiles;
    if (confirmedFiles.length === 0) {
        print('The file list is empty, please fill it manually in .versionFilesList.json', 'strongWarning', 'spaced22');
    }
    else {
        print(confirmedFiles.length + ' files added to list', 'completed', 'spaced22');
    }

    // discover projcet name and current version or use the ones manually specified
    if (name) {
        configuration.name = name;
    }
    if (currentVersion) {
        configuration.currentVersion = currentVersion;
    }
    if (!name || !currentVersion) {
        let discoveredData = discoverVersion();

        if (!name) {
            configuration.name = discoveredData.name;
        }
        if (!currentVersion) {
            configuration.currentVersion = discoveredData.currentVersion;
        }
    }

    fs.writeFileSync('./.versionFilesList.json', JSON.stringify(configuration, null, 2));
    print('.versionFilesList.json created', 'completed', 'date');

    // if .gitignore exists in current folder, add .versionFilesList.json to it
    if (fs.existsSync('.gitignore')) {
        let gitIgnore = fs.readFileSync('.gitignore');
        let ignoreList = gitIgnore.toString().split('\n');

        // add configuration file to gitignore only if it is not already there
        if (ignoreList.indexOf('.versionFilesList.json') < 0) {
            ignoreList.push('.versionFilesList.json');
            gitIgnore = ignoreList.join('\n');
            fs.writeFileSync('.gitignore', gitIgnore);

            print('Added .versionFilsList.json to .gitignore', 'completed', 'date');
        }
    }

    print('folder initialized', 'completed', 'date');

    console.log('');
    process.exit(0);
}

// add and remove files from filesList without re-init
function updateFilesList(adds, removes, prefix, name, currentVersion) {
    let configuration = loadConfiguration();
    let filesList = configuration.filesList;
    let modified = false;

    // manage custom prefix
    if (prefix) {
        configuration.versionPrefix = prefix;
        modified = true;
        print('new custom version prefix: ' + prefix, 'completed', 'spaced22');
    }

    // manage custom name and currentVersion
    if (name) {
        configuration.name = name;
        modified = true;
        print('new project name: ' + name, 'completed', 'spaced22');
    }
    if (currentVersion) {
        configuration.currentVersion = currentVersion;
        modified = true;
        print('new project currentVersion: ' + currentVersion, 'completed', 'spaced22');
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
        let addArray = adds.split(',');

        addArray.forEach(function(a, index) {
            let fileData = a.split(':');
            let fileName = fileData[0];
            let fileType = fileData[1];

            let fileString;
            let fileTypeString;

            if (fileType) {
                fileString = a;
                fileTypeString = fileType;
            }
            else {
                // autodetect file type
                let ext = fileName.split('.');
                    ext = ext[ext.length - 1];

                for (let key in fileTypeExtensions) {
                    if (fileTypeExtensions.hasOwnProperty(key)) {
                        let extList = fileTypeExtensions[key];

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
                    fileTypeString = 'normal';
                }
            }

            if (fileTypeString !== 'normal' && supportedVersioningTypes.indexOf(fileTypeString) < 0) {
                print('The versioning type: ' + fileTypeString + 'is unknown -> file skipped', 'strongWarning', 'date');
            }
            else {
                if (fs.existsSync(fileName)) {
                    let isInFileList = findFileInList(fileName);

                    if (isInFileList < 0) {
                        if (!modified) {
                            modified = true;
                        }

                        filesList.push(fileString);
                        print('file ' + fileName + ' added to list, type of file: ' + fileTypeString, 'completed', 'date');
                    }
                    else {
                        let oldFileType = configuration.filesList[isInFileList].split(':')[1];

                        if (oldFileType !== fileType) {
                            if (!modified) {
                                modified = true;
                            }

                            filesList[isInFileList] = fileString;
                            print('file ' + fileName + ' is already in list but the type has been changed to: ' + fileTypeString, 'completed', 'date');
                        }
                        else {
                            print('file ' + fileName + ' is already in versionFilesList.json with same type -> discarded', 'msgWarning', 'date');
                        }
                    }
                }
                else {
                    print('file ' + a[0] + ' does not exists -> discarded', 'msgWarning', 'date');
                }
            }
        });
    }

    //manage removals
    if (removes) {
        console.log('');
        let remArray = removes.split(',');

        remArray.forEach(function(r, index) {
            let isInFileList = findFileInList(r);

            if (isInFileList >= 0) {
                if (!modified) {
                    modified = true;
                }

                filesList.splice(isInFileList, 1);
                print('file ' + r + ' removed from list', 'completed', 'date');
            }
            else {
                print('file ' + r + ' is not in list -> nothing to remove', 'msgWarning', 'date');
            }
        });
    }

    if (modified) {
        configuration.filesList = filesList;

        fs.writeFileSync('./.versionFilesList.json', JSON.stringify(configuration, null, 2));
        print('.versionFilesList.json updated', 'completed', 'date');
    }

    process.exit(0);
}


// update version in every file
function escapeRegExp(string) {
    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
}
function replaceAll(string, find, replace) {
    return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}
function updateFiles(configuration, newVersion, options) {
    let customSeparator = 'òàù^ùàò';
    let customSeparatorRegex = /òàù\^ùàò/g;
    let occurencies = 0;
    let filesList = configuration.filesList;
    let anyVersionRegex = {
        normal: /(v[0-9]+\.[0-9]+\.[0-9]+)/g,
        package: /"version": "([0-9]+\.[0-9]+\.[0-9]+)"/g
    };

    // update all files from .versionFilesList.json
    filesList.forEach(function(file, index) {
        let fileData = file.split(':');
        let fileName = fileData[0];
        let fileType = fileData[1];
        let STOP = false;

        if (!fileType) {
            fileType = 'normal';
        }

        let data, lines;
        let fileOccurencies = 0;
        let operations = {
            normal: function(line, oldVersion) {
                return replaceAll(line, configuration.versionPrefix + oldVersion, 'v' + newVersion);
            },
            package: function(line, oldVersion) {
                if (line.indexOf('version') >= 0) {
                    STOP = true;
                    return line.replace(oldVersion, newVersion);
                }
            }
        };
        let wrongVersions = 0;
        let wrongLines = [];
        let versionToReplace;
        let replaced;
        switch (fileType) {
            case 'package':
            versionToReplace = configuration.currentVersion;
            replaced = newVersion;
            break;

            default:
            versionToReplace = configuration.versionPrefix + configuration.currentVersion;
            replaced = 'v' + newVersion;
        }

        debugLog('updating [' + fileType + '] file: ' + fileName);

        data = fs.readFileSync(fileName);
        lines = data.toString().split('\n');

        for (let i = 0; i < lines.length; i++) {
            let versionsToReplace = [];
            let replacedInFile = false;

            // search for wrong version numbers
            if (options.analyze) {
                let match = lines[i].match(anyVersionRegex[fileType]);

                if (match != null) {

                    let currentWrongLine = {
                        lineNumber: (i + 1).toString(),
                        lineContent: lines[i],
                        wrongVersions: []
                    };

                    match.forEach(function(currentMatch) {
                        if (currentMatch != versionToReplace) {
                            // there are wrong version numbers in this line
                            wrongVersions ++;

                            if (fileType === 'package') {
                                currentMatch = currentMatch.match(/([0-9]+\.[0-9]+\.[0-9]+)/g)[0];
                            }

                            if (options.verbose) {
                                currentWrongLine.lineContent = currentWrongLine.lineContent.replace(currentMatch, customSeparator);
                                currentWrongLine.wrongVersions.push(currentMatch);
                            }

                            if (options.fix) {
                                versionsToReplace.push(currentMatch);
                            }
                        }
                    });

                    wrongLines.push(currentWrongLine);
                }
            }

            // handle version numbers update
            if (lines[i].indexOf(versionToReplace) >= 0) {
                occurencies++;
                replacedInFile = true;

                lines[i] = operations[fileType](lines[i], versionToReplace.replace(/^v/, ''));

                if (STOP) {
                    break;
                }
            }

            // handle replacement of wrong version numbers
            if (versionsToReplace.length > 0) {
                replacedInFile = true;
                console.log(versionsToReplace);

                versionsToReplace.forEach(function(toReplace) {
                    occurencies++;
                    lines[i] = operations[fileType](lines[i], toReplace.replace(/^v/, ''));

                    if (STOP) {
                        return;
                    }
                });

                if (STOP) {
                    break;
                }
            }

            if (replacedInFile) {
                fileOccurencies++;
            }
        }
        lines = lines.join('\n');

        fs.writeFileSync(fileName, lines);

        let replacementWord = 'replacement';

        if (fileOccurencies === 0 || fileOccurencies > 1) {
            replacementWord = replacementWord + 's';
        }
        print('processed file: ' + fileName + ' [' + fileType + '] - made ' + fileOccurencies + ' ' + replacementWord, 'completed', 'date');

        if (options.analyze) {
            if (options.verbose) {
                wrongLines.forEach(function(wrongLine) {
                    let i = -1;
                    let logString;

                    if (options.fix) {
                        let content = wrongLine.lineContent.replace(customSeparatorRegex, function() {
                            i++;
                            return chalk.white.bold.bgRed(wrongLine.wrongVersions[i]) + chalk.white.bold.bgGreen(replaced);
                        });
                        logString = spacer22 + chalk.black.bgYellow('[Line: ' + wrongLine.lineNumber + ']   ' + content);

                        console.log(logString);
                    }
                    else {
                        let content = wrongLine.lineContent.replace(customSeparatorRegex, function() {
                            i++;
                            return chalk.white.bold.bgRed(wrongLine.wrongVersions[i]);
                        });
                        logString = spacer22 + chalk.black.bgYellow('[Line: ' + wrongLine.lineNumber + ']   ' + content);

                        console.log(logString);
                    }
                });
            }
            if (wrongVersions > 0) {
                let numberString = 'number';

                if (wrongVersions > 1) {
                    numberString = numberString + 's';
                }

                if (options.fix) {
                    console.log(spacer22 + chalk.white.bgGreen.bold('fixed ' + wrongVersions + ' wrong version ' + numberString + ' in this file'));
                }
                else {
                    console.log(spacer22 + chalk.white.bgRed.bold('found ' + wrongVersions + ' wrong version ' + numberString + ' in this file'));
                }
            }
        }
    });

    // update configuration file
    configuration.currentVersion = newVersion;
    fs.writeFileSync('.versionFilesList.json', JSON.stringify(configuration, null, 2));

    let fileWord = 'file';
    let numberWord = 'number';

    if (filesList.length > 1) {
        fileWord = 'files';
    }
    if (occurencies > 1) {
        numberWord = 'numbers';
    }
    console.log(msgTypes.date(getDateTime()) + ' ' + chalk.white.bold.bgBlue('updated ' + occurencies + ' version ' + numberWord + ' across ' + filesList.length + ' ' + fileWord));
}





// ================================================================================================
// ======= MAIN FLOW ============ MAIN FLOW ============ MAIN FLOW ============ MAIN FLOW =========
// ================================================================================================
console.log('');
print('======================== VersionUpdater ========================', 'stdout');

program
    .version(pjson.version)
    .description('Automatically update version number in all specified files of your project')
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

        let configuration = loadConfiguration();
        let filesCounter = 0;

        print("Loaded .versionFilesList.json; current filesList:\n", "completed", "date");

        // manage echo of current version of the project
        if (options.current) {
            print("Current version of " + configuration.name + ": " + configuration.currentVersion, "completed", "spaced22");
        }

        let textLength;
        let spaces;
        let spacesLength;

        configuration.filesList.forEach(function(file, index) {
            let fileData = file.split(':');
            let fileName = fileData[0];
            let fileType = fileData[1];

            if (!fileType) {
                fileType = 'normal';
            }

            spaces = '';
            textLength = (index + 1).toString().length + fileName.length;
            spacesLength = 50 - textLength;

            if (spacesLength > 0) {
                while (spacesLength > 0) {
                    spaces = spaces + ' ';
                    spacesLength--;
                }
            }
            else {
                spaces = ' ';
            }

            print((index + 1) + ' - ' + fileName + spaces + '[' + fileType + ']', 'important', 'spaced22');
            filesCounter++;
        });

        let fileWord = 'file';

        if (filesCounter === 0 || filesCounter > 1) {
            fileWord = fileWord + 's';
        }

        console.log('');
        print('There are ' + filesCounter + ' ' + fileWord + ' in filesList', 'completed', 'spaced22');
        console.log('');
        process.exit(0);
    });

// update
program
    .command('update [newVersion]')
    .description('Update version number')
    .option('-M, --major [howMany]', 'Increase Major version number (X+1.0.0)')
    .option('-m, --minor [howMany]', 'Increase minor version number (x.X+1.0)')
    .option('-p, --patch [howMany]', 'Increase patch version number (x.x.X+1)')
    .option('--analyze', 'Search for wrong version numbers')
    .option('--verbose', 'Logs lines with wrong version numbers when used with "--analyze"')
    .option('--fix', 'Fix wrong version numbers when used with "--analyze"')
    .action(function(newVersion, options) {
        onlyInit();

        if (!newVersion && !options.major && !options.minor && !options.patch) {
            print('You must specify newVersion parameter or auto-increment option (-M, -m or -p)', 'strongWarning');
            console.log('');
            process.exit(1);
        }

        isDebug(options.parent.debug);

        let configuration = loadConfiguration();

        print('loaded configuration (.versionFilesList.json)\n', 'completed', 'date');

        // manage quick incerment options
        if (!newVersion) {
            let currentVersionArray = configuration.currentVersion.split('.');
            let Mincrement = 1, mIncrement = 1, pIncrement = 1;

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

        print('will now update project to version ' + newVersion, 'important', 'date');

        updateFiles(configuration, newVersion, options);
        console.log('');
        process.exit(0);
    });



program.parse(process.argv);

// no command -> print project's current version
if (process.argv.length === 2) {
    onlyInit();

    let configuration = loadConfiguration();

    print('current: ' + configuration.currentVersion, 'completed', 'date');
    console.log('');
    process.exit(0);
}
