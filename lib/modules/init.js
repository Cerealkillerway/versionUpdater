import * as fs from "fs";
import { exec } from "child_process";

import { STANDARD_FILES_LIST } from "../constants.js";
import { sendProcessError, sendError, print } from "../output.js";
import { updateConfigurationFile } from "./config.js";
import { discoverVersion } from "./discover.js";

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

export { isInit, onlyInit, revertInit, init };
