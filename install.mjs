#!/usr/bin/env node

import { install } from "./binary.mjs";
import fs from "node:fs";
import path from "node:path";
import commandExists from "command-exists";

import os from "node:os";

const home = os.homedir();
const rustcPath = path.join(home, ".cargo", "bin", "rustc");

switch (process.env.RUST_INSTALL_MODE) {
  case "force":
    console.log("forcing install");
    install();
    break;
  case "skip":
    console.log("skipping install");
    break;
  default:
    console.log("checking for rustc");
    if (!fs.existsSync(rustcPath) || !(await commandExists("rustc"))) {
      console.log("rustc doesn't exist, installing");
      install();
    } else {
      console.log("rustc exists, skipping install");
    }
}
