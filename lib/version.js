#!/usr/bin/env node
/*
 * versionUpdater v3.13.1
 * Licensed under MIT (https://raw.githubusercontent.com/Cerealkillerway/versionUpdater/master/license.txt)
 */

// require system modules
import * as fs from "fs";
import { exec } from "child_process";

// require additional modules
import { Command } from "commander";
import chalk from "chalk";

const program = new Command();

// require internal modules
import {
  POSSIBLE_PACKAGE_FILES,
  STANDARD_FILES_LIST,
  SUPPORTED_VERSION_TYPES,
  MSG_TYPES,
  SPACER_22,
  FILE_TYPE_EXTENSIONS,
  CUSTOM_SEPARATOR_REGEX,
  CUSTOM_SEPARATOR,
} from "./constants.js";
import {
  print,
  debugLog,
  sendError,
  sendProcessError,
  sendWarning,
} from "./output.js";
import { getDateTime, activateDebug } from "./util.js";

const packageJSON = JSON.parse(
  fs.readFileSync(`${import.meta.dirname}/../package.json`, "utf-8")
);

process.stdin.setEncoding("utf8");

// check if initialized
const isInit = () => {
  if (fs.existsSync("./.versionFilesList.json")) return true;
  if (fs.existsSync("./versionFilesList.json")) {
    updateConfigurationFile();
    return true;
  } else {
    return false;
  }
};

// exit with error if not initialized
const onlyInit = () => {
  if (!isInit()) {
    sendError("E000");
  }
};

// delete files list
const revertInit = (reinit, list, prefix, name, currentVersion) => {
  exec("rm -Rf ./.versionFilesList.json", function (error, stdout, stderr) {
    if (error) sendProcessError(stdout, stderr);

    print("Deleted previous .versionFilesList.json", "important", "date");
    if (reinit) init(list, prefix, name, currentVersion);
  });
};

// load configuration file; fallback to global if is not an initialized folder
const loadConfiguration = () => {
  let configuration;

  if (isInit()) {
    configuration = JSON.parse(
      fs.readFileSync("./.versionFilesList.json", "utf-8")
    );

    // check configuration file's integrity
    if (
      !configuration.name ||
      !configuration.currentVersion ||
      !configuration.filesList ||
      !configuration.versionPrefix
    ) {
      sendError("E002");
    }

    // check .versionFilesList.json for missing informations
    if (
      configuration.name.length === 0 ||
      configuration.currentVersion.length === 0
    ) {
      sendError("E001");
    }
  }
  return configuration;
};

const updateConfigurationFile = () => {
  // check if .versionFilesList.json is correct version
  // missing currentVersion in configuration file (.versionFilesList.json)
  let warningDisplayed = false;
  let updateConfWarning =
    "It seems that your version configuration file comes from an older version of versionUpdater.\nWill now try to update it to latest standard required by current versionUpdater";

  let oldData = JSON.parse(fs.readFileSync("versionFilesList.json", "utf-8"));

  print(updateConfWarning, "msgWarning", "spaced22");

  if (!oldData.currentVersion || !oldData.name) {
    let discoveredData = discoverVersion();

    oldData.name = discoveredData.name;
    oldData.currentVersion = discoveredData.currentVersion;
  }

  if (!oldData.versionPrefix) {
    oldData.versionPrefix = "v";
  }

  // if .gitignore exists in current folder, check if it is needed to change versionFilesList.json to .versionFilesList.json
  if (fs.existsSync(".gitignore")) {
    let gitIgnore = fs.readFileSync(".gitignore");
    let ignoreList = gitIgnore.toString().split("\n");

    // add configuration file to gitignore only if it is not already there
    let foundIndex = ignoreList.indexOf("versionFilesList.json");
    if (foundIndex >= 0) {
      ignoreList.splice(foundIndex, 1);
      ignoreList.push(".versionFilesList.json");
      gitIgnore = ignoreList.join("\n");
      fs.writeFileSync(".gitignore", gitIgnore);

      print("Added .versionFilsList.json to .gitignore", "completed", "date");
    }
  }

  // save new configuration file
  fs.writeFileSync(
    "./.versionFilesList.json",
    JSON.stringify(oldData, null, 2)
  );
  //delete old one
  fs.unlinkSync("./versionFilesList.json");

  print(
    "New configuration file (.versionFilesList.json) has been saved correctly",
    "completed",
    "spaced22"
  );
};

// discover project version
const discoverVersion = () => {
  // try to understand package name and current version
  // from package.json or bower.json
  let packageFileExtension;
  let results = {
    name: "",
    currentVersion: "",
  };

  const lookUpPackageFile = () => {
    for (const possiblePackageFile of POSSIBLE_PACKAGE_FILES) {
      if (fs.existsSync(possiblePackageFile)) {
        return possiblePackageFile;
      }
    }
  };

  const packageFile = lookUpPackageFile();

  packageFileExtension = packageFile.substr(packageFile.lastIndexOf(".") + 1);

  if (packageFile) {
    let packageData;

    if (packageFileExtension === "json") {
      packageData = JSON.parse(fs.readFileSync(packageFile, "utf-8"));
    }
    if (packageFileExtension === "js") {
      let tmpData = fs.readFileSync(packageFile).toString().split("\n");
      let nameFound = false;
      let versionFound = false;

      packageData = {};

      for (line of tmpData) {
        if (line.indexOf("name:") >= 0) {
          nameFound = true;
          packageData.name = line
            .split(" ")
            .pop()
            .replace(/'/g, "")
            .replace(/,/g, "");
        }
        if (line.indexOf("version:") >= 0) {
          versionFound = true;
          packageData.version = line
            .split(" ")
            .pop()
            .replace(/'/g, "")
            .replace(/,/g, "");
        }

        if (nameFound && versionFound) {
          break;
        }
      }
    }

    debugLog("Reading packageFile for init:");
    debugLog(
      "Discovered pacakge name: " +
        packageData.name +
        " - discovered package version " +
        packageData.version
    );

    if (packageData.name) {
      results.name = packageData.name;
    } else {
      print(
        "Can't discover package name automatically",
        "msgWarning",
        "spaced22"
      );
    }

    if (packageData.version) {
      results.currentVersion = packageData.version;
    } else {
      print(
        "Can't discover package's currentVersion automatically",
        "msgWarning",
        "spaced22"
      );
    }
  } else {
    print(
      "Can't discover package name and/or currentVersion automatically",
      "msgWarning",
      "spaced22"
    );
    print(
      "Please fill .versionFilesList.json with the missing informations",
      "msgWarning",
      "spaced22"
    );
  }

  return results;
};

// initialization
const init = (list, prefix, name, currentVersion) => {
  print("Initializing folder with version info...", "important", "date");

  let configuration = {
    name: "",
    currentVersion: "",
    versionPrefix: "v",
  };

  let confirmedFiles = [];

  // if specified, set custom version prefix for non json files
  if (prefix) {
    configuration.versionPrefix = prefix;
  }

  STANDARD_FILES_LIST.forEach(function (file, index) {
    if (fs.existsSync(file)) {
      if (file.endsWith(".json") || file === "package.js") {
        confirmedFiles.push(file + ":package");
      } else {
        confirmedFiles.push(file);
      }

      print("file " + file + " added to list", "completed", "date");
    }
  });

  if (list) {
    let addedFiles = list.split(",");

    for (const file of addedFiles) {
      if (fs.existsSync(file)) {
        confirmedFiles.push(file);
        print("file " + file + " added to list", "completed", "date");
      } else {
        print(
          "file " + file + " does not exists -> discarded",
          "msgWarning",
          "date"
        );
      }
    }
  }

  configuration.filesList = confirmedFiles;
  if (confirmedFiles.length === 0) {
    print(
      "The file list is empty, please fill it manually in .versionFilesList.json",
      "strongWarning",
      "spaced22"
    );
  } else {
    print(
      confirmedFiles.length + " files added to list",
      "completed",
      "spaced22"
    );
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
      print(
        `auto-discovered current version: ${discoveredData.currentVersion}`,
        "important",
        "date"
      );
    }
  }

  fs.writeFileSync(
    "./.versionFilesList.json",
    JSON.stringify(configuration, null, 2)
  );
  print(".versionFilesList.json created", "completed", "date");

  // if .gitignore exists in current folder, add .versionFilesList.json to it
  if (fs.existsSync(".gitignore")) {
    let gitIgnore = fs.readFileSync(".gitignore");
    let ignoreList = gitIgnore.toString().split("\n");

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
};

// add and remove files from filesList without re-init
const updateFilesList = (adds, removes, prefix, name, currentVersion) => {
  let configuration = loadConfiguration();
  let filesList = configuration.filesList;
  let modified = false;

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
    print(
      "new project currentVersion: " + currentVersion,
      "completed",
      "spaced22"
    );
  }

  const findFileInList = (fileName) => {
    for (i = 0; i < configuration.filesList.length; i++) {
      if (configuration.filesList[i].indexOf(fileName) === 0) {
        return i;
      }
    }
    return -1;
  };

  // manage additions
  if (adds) {
    let addArray = adds.split(",");

    addArray.forEach(function (a, index) {
      let fileData = a.split(":");
      let fileName = fileData[0];
      let fileType = fileData[1];

      let fileString;
      let fileTypeString;

      if (fileType) {
        fileString = a;
        fileTypeString = fileType;
      } else {
        // autodetect file type
        let ext = fileName.split(".");
        ext = ext[ext.length - 1];

        for (const extension in FILE_TYPE_EXTENSIONS) {
          if (extension.indexOf(ext) >= 0) {
            fileType = key;
            break;
          }
        }

        if (fileType) {
          fileString = fileName + ":" + fileType;
          fileTypeString = fileType;
        } else {
          fileString = fileName;
          fileTypeString = "normal";
        }
      }

      if (
        fileTypeString !== "normal" &&
        SUPPORTED_VERSION_TYPES.indexOf(fileTypeString) < 0
      ) {
        print(
          "The versioning type: " +
            fileTypeString +
            "is unknown -> file skipped",
          "strongWarning",
          "date"
        );
      } else {
        if (fs.existsSync(fileName)) {
          let isInFileList = findFileInList(fileName);

          if (isInFileList < 0) {
            if (!modified) {
              modified = true;
            }

            filesList.push(fileString);
            print(
              "file " +
                fileName +
                " added to list, type of file: " +
                fileTypeString,
              "completed",
              "date"
            );
          } else {
            let oldFileType =
              configuration.filesList[isInFileList].split(":")[1];

            if (oldFileType !== fileType) {
              if (!modified) {
                modified = true;
              }

              filesList[isInFileList] = fileString;
              print(
                "file " +
                  fileName +
                  " is already in list but the type has been changed to: " +
                  fileTypeString,
                "completed",
                "date"
              );
            } else {
              print(
                "file " +
                  fileName +
                  " is already in versionFilesList.json with same type -> discarded",
                "msgWarning",
                "date"
              );
            }
          }
        } else {
          print(
            "file " + a[0] + " does not exists -> discarded",
            "msgWarning",
            "date"
          );
        }
      }
    });
  }

  //manage removals
  if (removes) {
    console.log("");
    let remArray = removes.split(",");

    remArray.forEach(function (r, index) {
      let isInFileList = findFileInList(r);

      if (isInFileList >= 0) {
        if (!modified) {
          modified = true;
        }

        filesList.splice(isInFileList, 1);
        print("file " + r + " removed from list", "completed", "date");
      } else {
        print(
          "file " + r + " is not in list -> nothing to remove",
          "msgWarning",
          "date"
        );
      }
    });
  }

  if (modified) {
    configuration.filesList = filesList;

    fs.writeFileSync(
      "./.versionFilesList.json",
      JSON.stringify(configuration, null, 2)
    );
    print(".versionFilesList.json updated", "completed", "date");
  }

  process.exit(0);
};

// update version in every file
const escapeRegExp = (string) => {
  return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
};
const replaceAll = (string, find, replace) => {
  return string.replace(new RegExp(escapeRegExp(find), "g"), replace);
};
const updateFiles = (configuration, newVersion, options) => {
  let occurencies = 0;
  let filesList = configuration.filesList;
  let anyVersionRegex = {
    normal: /(v[0-9]+\.[0-9]+\.[0-9]+)/g,
    package: /"version": "([0-9]+\.[0-9]+\.[0-9]+)"/g,
  };

  // update all files from .versionFilesList.json
  filesList.forEach(function (file, index) {
    let fileData = file.split(":");
    let fileName = fileData[0];
    let fileType = fileData[1];
    let STOP = false;

    if (!fileType) {
      fileType = "normal";
    }

    let data, lines;
    let fileOccurencies = 0;
    let operations = {
      normal: function (line, oldVersion) {
        return replaceAll(
          line,
          configuration.versionPrefix + oldVersion,
          "v" + newVersion
        );
      },
      package: function (line, oldVersion) {
        if (line.indexOf("version") >= 0) {
          STOP = true;
          return line.replace(oldVersion, newVersion);
        }
      },
    };
    let wrongVersions = 0;
    let wrongLines = [];
    let versionToReplace;
    let replaced;
    switch (fileType) {
      case "package":
        versionToReplace = configuration.currentVersion;
        replaced = newVersion;
        break;

      default:
        versionToReplace =
          configuration.versionPrefix + configuration.currentVersion;
        replaced = "v" + newVersion;
    }

    debugLog("updating [" + fileType + "] file: " + fileName);

    data = fs.readFileSync(fileName);
    lines = data.toString().split("\n");

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
            wrongVersions: [],
          };

          match.forEach(function (currentMatch) {
            if (currentMatch != versionToReplace) {
              // there are wrong version numbers in this line
              wrongVersions++;

              if (fileType === "package") {
                currentMatch = currentMatch.match(
                  /([0-9]+\.[0-9]+\.[0-9]+)/g
                )[0];
              }

              if (options.verbose) {
                currentWrongLine.lineContent =
                  currentWrongLine.lineContent.replace(
                    currentMatch,
                    CUSTOM_SEPARATOR
                  );
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

        lines[i] = operations[fileType](
          lines[i],
          versionToReplace.replace(/^v/, "")
        );

        if (STOP) {
          break;
        }
      }

      // handle replacement of wrong version numbers
      if (versionsToReplace.length > 0) {
        replacedInFile = true;
        console.log(versionsToReplace);

        versionsToReplace.forEach(function (toReplace) {
          occurencies++;
          lines[i] = operations[fileType](
            lines[i],
            toReplace.replace(/^v/, "")
          );

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
    lines = lines.join("\n");

    fs.writeFileSync(fileName, lines);

    let replacementWord = "replacement";

    if (fileOccurencies === 0 || fileOccurencies > 1) {
      replacementWord = replacementWord + "s";
    }
    print(
      "processed file: " +
        fileName +
        " [" +
        fileType +
        "] - made " +
        fileOccurencies +
        " " +
        replacementWord,
      "completed",
      "date"
    );

    if (options.analyze) {
      if (options.verbose) {
        wrongLines.forEach(function (wrongLine) {
          let i = -1;
          let logString;

          if (options.fix) {
            let content = wrongLine.lineContent.replace(
              CUSTOM_SEPARATOR_REGEX,
              function () {
                i++;
                return (
                  chalk.white.bold.bgRed(wrongLine.wrongVersions[i]) +
                  chalk.white.bold.bgGreen(replaced)
                );
              }
            );
            logString =
              SPACER_22 +
              chalk.black.bgYellow(
                "[Line: " + wrongLine.lineNumber + "]   " + content
              );

            console.log(logString);
          } else {
            let content = wrongLine.lineContent.replace(
              CUSTOM_SEPARATOR_REGEX,
              function () {
                i++;
                return chalk.white.bold.bgRed(wrongLine.wrongVersions[i]);
              }
            );
            logString =
              SPACER_22 +
              chalk.black.bgYellow(
                "[Line: " + wrongLine.lineNumber + "]   " + content
              );

            console.log(logString);
          }
        });
      }
      if (wrongVersions > 0) {
        let numberString = "number";

        if (wrongVersions > 1) {
          numberString = numberString + "s";
        }

        if (options.fix) {
          console.log(
            SPACER_22 +
              chalk.white.bgGreen.bold(
                "fixed " +
                  wrongVersions +
                  " wrong version " +
                  numberString +
                  " in this file"
              )
          );
        } else {
          console.log(
            SPACER_22 +
              chalk.white.bgRed.bold(
                "found " +
                  wrongVersions +
                  " wrong version " +
                  numberString +
                  " in this file"
              )
          );
        }
      }
    }
  });

  // update configuration file
  configuration.currentVersion = newVersion;
  fs.writeFileSync(
    ".versionFilesList.json",
    JSON.stringify(configuration, null, 2)
  );

  let fileWord = "file";
  let numberWord = "number";

  if (filesList.length > 1) {
    fileWord = "files";
  }
  if (occurencies > 1) {
    numberWord = "numbers";
  }
  console.log(
    MSG_TYPES.date(getDateTime()) +
      " " +
      chalk.white.bold.bgBlue(
        "updated " +
          occurencies +
          " version " +
          numberWord +
          " across " +
          filesList.length +
          " " +
          fileWord
      )
  );
};

// ================================================================================================
// ======= MAIN FLOW ============ MAIN FLOW ============ MAIN FLOW ============ MAIN FLOW =========
// ================================================================================================
console.log("");
print(
  "======================== VersionUpdater ========================",
  "stdout"
);

program
  .version(packageJSON.version)
  .description(
    "Automatically update version number in all specified files of your project"
  )
  .usage("[options] command [command-options]")
  .option("-d --debug", "activate debug mode");

// init
program
  .command("init")
  .description("Initialize folder with standard file list")
  .option("-f, --force", "re-init overwriting current file list")
  .option(
    "-p, --prefix <versionPrefix>",
    "specify a custom version number prefix for non json files"
  )
  .option("-a --add <files>", "add files to files list")
  .option("-r --remove <files>", "remove files from files list")
  .option("--projectName <name>", "manually specify name for current project")
  .option(
    "--currentVersion <version>",
    "manually specify current version of the project"
  )
  .action(function (options) {
    if (!options.parent) {
      sendError("E003");
    }
    activateDebug(options.parent.debug);
    // if already initialized, and -f option not provided, send warning and exit
    // otherwise re-initialize or update
    if (isInit()) {
      if (options.force) {
        revertInit(
          true,
          options.add,
          options.prefix,
          options.projectName,
          options.currentVersion
        );
      } else {
        if (
          options.add ||
          options.remove ||
          options.prefix ||
          options.projectName ||
          options.currentVersion
        ) {
          updateFilesList(
            options.add,
            options.remove,
            options.prefix,
            options.projectName,
            options.currentVersion
          );
        } else {
          sendWarning("W001");
        }
      }
    }
    // if not initialized before, init now
    else {
      init(
        options.add,
        options.prefix,
        options.projectName,
        options.currentVersion
      );
    }
  });

// echo filesList
program
  .command("list")
  .description("Echo all files currently in filesList")
  .option("--current", "echo also current version of the project")
  .action(function (options) {
    onlyInit();

    let configuration = loadConfiguration();
    let filesCounter = 0;

    print(
      "Loaded .versionFilesList.json; current filesList:\n",
      "completed",
      "date"
    );

    // manage echo of current version of the project
    if (options.current) {
      print(
        "Current version of " +
          configuration.name +
          ": " +
          configuration.currentVersion,
        "completed",
        "spaced22"
      );
    }

    let textLength;
    let spaces;
    let spacesLength;

    configuration.filesList.forEach(function (file, index) {
      let fileData = file.split(":");
      let fileName = fileData[0];
      let fileType = fileData[1];

      if (!fileType) {
        fileType = "normal";
      }

      spaces = "";
      textLength = (index + 1).toString().length + fileName.length;
      spacesLength = 50 - textLength;

      if (spacesLength > 0) {
        while (spacesLength > 0) {
          spaces = spaces + " ";
          spacesLength--;
        }
      } else {
        spaces = " ";
      }

      print(
        index + 1 + " - " + fileName + spaces + "[" + fileType + "]",
        "important",
        "spaced22"
      );
      filesCounter++;
    });

    let fileWord = "file";

    if (filesCounter === 0 || filesCounter > 1) {
      fileWord = fileWord + "s";
    }

    console.log("");
    print(
      "There are " + filesCounter + " " + fileWord + " in filesList",
      "completed",
      "spaced22"
    );
    console.log("");
    process.exit(0);
  });

// update
program
  .command("update [newVersion]")
  .description("Update version number")
  .option("-M, --major [howMany]", "Increase Major version number (X+1.0.0)")
  .option("-m, --minor [howMany]", "Increase minor version number (x.X+1.0)")
  .option("-p, --patch [howMany]", "Increase patch version number (x.x.X+1)")
  .option("--analyze", "Search for wrong version numbers")
  .option(
    "--verbose",
    'Logs lines with wrong version numbers when used with "--analyze"'
  )
  .option("--fix", 'Fix wrong version numbers when used with "--analyze"')
  .action(function (newVersion, options) {
    onlyInit();

    if (!newVersion && !options.major && !options.minor && !options.patch) {
      print(
        "You must specify newVersion parameter or auto-increment option (-M, -m or -p)",
        "strongWarning"
      );
      console.log("");
      process.exit(1);
    }

    activateDebug(options.parent?.debug);

    let configuration = loadConfiguration();

    print(
      "loaded configuration (.versionFilesList.json)\n",
      "completed",
      "date"
    );

    // manage quick incerment options
    if (!newVersion) {
      let currentVersionArray = configuration.currentVersion.split(".");
      let Mincrement = 1,
        mIncrement = 1,
        pIncrement = 1;

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

      newVersion = currentVersionArray.join(".");
    }

    print(
      "will now update project to version " + newVersion,
      "important",
      "date"
    );

    updateFiles(configuration, newVersion, options);
    console.log("");
    process.exit(0);
  });

program.parse(process.argv);

// no command -> print project's current version
if (process.argv.length === 2) {
  onlyInit();

  let configuration = loadConfiguration();

  print("current: " + configuration.currentVersion, "completed", "date");
  console.log("");
  process.exit(0);
}
