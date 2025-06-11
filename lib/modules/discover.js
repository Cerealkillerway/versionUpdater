import * as fs from "fs";

import { POSSIBLE_PACKAGE_FILES } from "../constants.js";
import { debugLog } from "../output.js";

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

export { discoverVersion };
