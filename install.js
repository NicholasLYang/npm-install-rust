#!/usr/bin/env node

const { install } = require("./binary");
const fs = require("fs");
const path = require("path");
const commandExistsSync = require('command-exists').sync;

const home = require("os").homedir();
const rustcPath = path.join(home, ".cargo", "bin", "rustc");

switch (process.env.RUST_INSTALL_MODE) {
  case "force":
    console.log("forcing install");
    install(false);
    break;
  case "skip":
    console.log("skipping install");
    break;
  default:
    console.log("checking for rustc");
    if (!fs.existsSync(rustcPath) && !commandExistsSync("rustc")) {
      console.log("rustc doesn't exist, installing");
      install(false);
    } else {
      console.log("rustc exists, skipping install")
    }
}

