import * as fs from "fs";

import { sendError, print } from "../output.js";
import { discoverVersion } from "./discover.js";
import { isInit } from "./init.js";

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

export { loadConfiguration, updateConfigurationFile };
