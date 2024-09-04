import { printDebugModeOn } from "./output.js";

// manage debug mode
let DEBUG = false;

const activateDebug = (debug) => {
  if (debug) {
    DEBUG = true;
    printDebugModeOn();
  }
};

const isDebug = () => {
  return DEBUG;
};

const getDateTime = () => {
  let date = new Date();

  let hour = date.getHours();
  hour = (hour < 10 ? "0" : "") + hour;
  let min = date.getMinutes();
  min = (min < 10 ? "0" : "") + min;
  let sec = date.getSeconds();
  sec = (sec < 10 ? "0" : "") + sec;
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  month = (month < 10 ? "0" : "") + month;
  let day = date.getDate();
  day = (day < 10 ? "0" : "") + day;

  return (
    "[" +
    year +
    ":" +
    month +
    ":" +
    day +
    ":" +
    hour +
    ":" +
    min +
    ":" +
    sec +
    "]"
  );
};

export { activateDebug, isDebug, getDateTime };
