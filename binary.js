const { Binary } = require("binary-install");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { configureProxy } = require("axios-proxy-builder");

const artifact_download_url = "https://static.rust-lang.org/dist";

const getArtifactName = () => {
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

  // Assume the above succeeded and build a target triple to look things up with.
  // If any of it failed, this lookup will fail and we'll handle it like normal.
  let target_triple = `${arch}-${os_type}`;
  return `rust-nightly-${target_triple}.tar.gz`;
};

const getBinary = () => {
  const artifactName = getArtifactName();
  const url = `${artifact_download_url}/${artifactName}`;

  return new Binary("install.sh", url);
};

const install = (suppressLogs) => {
  console.log("installing rust");
  const installScript = getBinary();
  const proxy = configureProxy(installScript.url);

  console.log(`installing at ${installScript.binaryPath} with __dirname ${__dirname}`);
  installScript.install(proxy, suppressLogs).then(() => {
    console.log("executing install script");
    const options = { cwd: __dirname, stdio: "inherit" };
    const result = spawnSync(installScript.binaryPath, ["--destdir=node_modules/.cargo"], options);
    console.log("finished installing rust");
    console.log(result);
  });
};

const run = (name) => {
    const binaryPath = path.join(__dirname, "node_modules", ".cargo", "usr", "local", "bin", name);
    const options = { cwd: __dirname, stdio: "inherit" };
    const result = spawnSync(binaryPath, process.argv.slice(2), options);
    process.exit(result.status);
};

module.exports = {
  install,
  run,
  getBinary,
};
