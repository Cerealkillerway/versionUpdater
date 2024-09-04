import {
  MSG_TYPES,
  SPACER_15,
  SPACER_22,
  ERRORS,
  WARNINGS,
} from "./constants.js";
import { isDebug, getDateTime } from "./util.js";

// stdout templates
const print = (text, type, layout, param) => {
  if (param === undefined) param = "";

  switch (layout) {
    case "date":
      console.log(
        MSG_TYPES.date(getDateTime()) + " " + MSG_TYPES[type](text),
        param
      );
      break;

    case "spaced22":
      console.log(MSG_TYPES[type](SPACER_22 + text), param);
      break;

    default:
      console.log(MSG_TYPES[type](text), param);
  }
};

const debugLog = (message) => {
  if (isDebug()) {
    console.log(SPACER_22 + "DEBUG: " + message);
  }
};

const printDebugModeOn = () => {
  print("\nDEBUG MODE ON\n", "msgWarning", "spaced22");
};

// make all the lines of a text as long as terminal's width
const fullWidth = (text, param) => {
  const cols = process.stdout.columns;
  const lines = text.split("\n");

  lines.map((line, index) => {
    let size = cols;

    if (index === 0) {
      size = size - 15;
    }
    if (lines.indexOf("%") > 0 && param !== undefined) {
      size = size - param.length + 2;
    }

    return `${line}${" ".repeat(size - line.length)}`;
  });

  text = lines.join("\n");

  return text;
};

const sendError = (code, param) => {
  let text = fullWidth(ERRORS[code].text, param);

  print("[ERROR - " + code + "] " + text + "\n", "error", "default", param);
  process.exit(1);
};

const sendProcessError = (stdout, stderr, callback) => {
  let text =
    SPACER_15 +
    "ERROR while executing operations:\n" +
    SPACER_15 +
    "--- STDOUT: ---\n" +
    SPACER_15 +
    stdout +
    "\n";
  text = text + SPACER_15 + "--- STDERR ---\n" + SPACER_15 + stderr + "\n";

  print(text + "\n", "error", "default");
  if (callback) callback();
  process.exit(1);
};

const sendWarning = (code, param) => {
  let text = fullWidth(WARNINGS[code].text, param);

  print("[!WARN - " + code + "] " + text + "\n", "warning", "default", param);
  process.exit(1);
};

export {
  print,
  debugLog,
  printDebugModeOn,
  fullWidth,
  sendError,
  sendProcessError,
  sendWarning,
};
