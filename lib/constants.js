import chalk from "chalk";

const POSSIBLE_PACKAGE_FILES = ["package.json", "bower.json", "package.js"];
const STANDARD_FILES_LIST = [
  "package.json",
  "bower.json",
  "package.js",
  "README.md",
  "index.html",
  "composer.json",
];
const SUPPORTED_VERSION_TYPES = ["normal", "package"];

const MSG_TYPES = {
  error: chalk.bgRed.bold,
  warning: chalk.bgYellow.bold,

  date: chalk.magenta.bold,
  msgWarning: chalk.yellow.bold,
  strongWarning: chalk.red.bold,
  completed: chalk.green.bold,
  important: chalk.cyan.bold,
  question: chalk.inverse.bold,
  stdout: chalk.bgBlack.bold,
};

const SPACER_22 = "                      ";
const SPACER_15 = "               ";

const ERRORS = {
  E000: {
    description:
      "The current folder has not been initialized for the use with version",
    text:
      "You are not in a version initialized folder\n" +
      SPACER_15 +
      'Please run "version init" first!',
  },
  E001: {
    description:
      "Package name and/or currentVersion missing in .versionFilesList",
    text:
      "Version is not able to understand package name and/or its current version\n" +
      SPACER_15 +
      "Please fill .versionFilesList.json with the missing informations",
  },
  E002: {
    description: "Configuration file (.versionFilesList.json) corrupted",
    text:
      "It seems that your .versionFilesList.json is corrupted\n" +
      SPACER_15 +
      "It is required to re-init the folder (version init -f)",
  },
  E003: {
    description: "Invalid command or options",
    text:
      "The command you typed is wrong or invalid\n" +
      SPACER_15 +
      'If you are using "version init -a/-r" with multiple files, please\n' +
      SPACER_15 +
      "insert them comma separated and not space separated",
  },
};

const WARNINGS = {
  W001: {
    description:
      "You are trying to re-initialize alredy initialized folder, is this really what you want?",
    text:
      "there is already a .versionFilesList.json in this folder\n" +
      SPACER_15 +
      'if you want to re-init, run "version init -f"; this will overwrite existing .versionFilesList.json',
  },
};

const FILE_TYPE_EXTENSIONS = {
  package: ["json"],
};

const CUSTOM_SEPARATOR_REGEX = /òàù\^ùàò/g;

let CUSTOM_SEPARATOR = "òàù^ùàò";

export {
  POSSIBLE_PACKAGE_FILES,
  STANDARD_FILES_LIST,
  SUPPORTED_VERSION_TYPES,
  MSG_TYPES,
  SPACER_22,
  SPACER_15,
  ERRORS,
  FILE_TYPE_EXTENSIONS,
  WARNINGS,
  CUSTOM_SEPARATOR_REGEX,
  CUSTOM_SEPARATOR,
};
