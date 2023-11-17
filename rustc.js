#!/usr/bin/env node

const { run, install: maybeInstall } = require("./binary");
run("rustc");