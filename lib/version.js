#!/usr/bin/env node
/*
 * versionUpdater v6.0.1
 * Licensed under MIT (https://raw.githubusercontent.com/Cerealkillerway/versionUpdater/master/license.txt)
 */

import * as fs from "fs";

import { Command } from "commander";
import chalk from "chalk";

const program = new Command();

import {
  SUPPORTED_VERSION_TYPES,
  MSG_TYPES,
  SPACER_22,
  FILE_TYPE_EXTENSIONS,
  CUSTOM_SEPARATOR_REGEX,
  CUSTOM_SEPARATOR,
} from "./constants.js";
import { print, debugLog, sendWarning } from "./output.js";
import { getDateTime, activateDebug } from "./util.js";
import { isInit, onlyInit, revertInit, init } from "./modules/init.js";
import { loadConfiguration } from "./modules/config.js";

const packageJSON = JSON.parse(
  fs.readFileSync(`${import.meta.dirname}/../package.json`, "utf-8")
);

process.stdin.setEncoding("utf8");

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
    activateDebug(options?.parent?.debug);
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
