const { Binary } = require("binary-install");
const os = require("os");
const cTable = require("console.table");
const path = require("path");
const { spawnSync } = require("child_process");
const libc = require("detect-libc");
const { configureProxy } = require("axios-proxy-builder");

const error = (msg) => {
  console.error(msg);
  process.exit(1);
};

const name = "rust";
const artifact_download_url = "https://static.rust-lang.org/dist";

const builder_glibc_major_version = 2;
const builder_glibc_minor_version = 35;

const supportedPlatforms = {
  "x86_64-unknown-linux-gnu": {
    "artifact_name": "rust-1.73.0-x86_64-unknown-linux-gnu.tar.gz",
    "zip_ext": "tar.gz"
  },
  "aarch64-apple-darwin": {
    "artifact_name": "rust-1.73.0-aarch64-apple-darwin.tar.gz",
    "zip_ext": "tar.gz"
  }
};

const getPlatform = () => {
  const raw_os_type = os.type();
  const raw_architecture = os.arch();

  // We want to use rust-style target triples as the canonical key
  // for a platform, so translate the "os" library's concepts into rust ones
  let os_type = "";
  switch (raw_os_type) {
    case "Windows_NT":
      os_type = "pc-windows-msvc";
      break;
    case "Darwin":
      os_type = "apple-darwin";
      break;
    case "Linux":
      os_type = "unknown-linux-gnu"
      break;
  }

  let arch = "";
  switch (raw_architecture) {
    case "x64":
      arch = "x86_64";
      break;
    case "arm64":
      arch = "aarch64";
      break;
  }

  if (raw_os_type === "Linux") {
    if (libc.familySync() == 'musl') {
      os_type = "unknown-linux-musl-dynamic";
    } else if (libc.isNonGlibcLinuxSync()) {
        console.warn("Your libc is neither glibc nor musl; trying static musl binary instead");
        os_type = "unknown-linux-musl-static";
    } else {
      let libc_version = libc.versionSync();
      let split_libc_version = libc_version.split(".");
      let libc_major_version = split_libc_version[0];
      let libc_minor_version = split_libc_version[1];
      if (
        libc_major_version != builder_glibc_major_version ||
        libc_minor_version < builder_glibc_minor_version
      ) {
        // We can't run the glibc binaries, but we can run the static musl ones
        // if they exist
        console.warn("Your glibc isn't compatible; trying static musl binary instead");
        os_type = "unknown-linux-musl-static";
      }
    }
  }

  // Assume the above succeeded and build a target triple to look things up with.
  // If any of it failed, this lookup will fail and we'll handle it like normal.
  let target_triple = `${arch}-${os_type}`;
  let platform = supportedPlatforms[target_triple];

  if (!platform) {
    error(
      `Platform with type "${raw_os_type}" and architecture "${raw_architecture}" is not supported by ${name}.\nYour system must be one of the following:\n\n${Object.keys(supportedPlatforms).join(",")}`
    );
  }

  return platform;
};

const getBinary = () => {
  const platform = getPlatform();
  const url = `${artifact_download_url}/${platform.artifact_name}`;

  return new Binary("install.sh", url);
};

const install = (suppressLogs) => {
  const installScript = getBinary();
  const proxy = configureProxy(installScript.url);

  installScript.install(proxy, suppressLogs);
  const options = { cwd: process.cwd(), stdio: "inherit" };
  spawnSync(installScript.binaryPath, ["--destdir=node_modules/.cargo"], options);
};

const run = (name) => {
  const binary = path.join(__dirname, "node_modules", ".cargo", "usr", "local", "bin", name);
  const options = { cwd: process.cwd(), stdio: "inherit" };
  spawnSync(binary, process.argv.slice(2), options);
};

module.exports = {
  install,
  run,
  getBinary,
};
