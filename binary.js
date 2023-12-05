const { Binary } = require("binary-install");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { configureProxy } = require("axios-proxy-builder");
const fs = require("fs/promises");

const artifact_download_url = "https://static.rust-lang.org/dist";

function isNightly() {
  const packageJsonPath = path.join(__dirname, "package.json");
  const packageJson = require(packageJsonPath);
  return packageJson.version.endsWith("-nightly");
}

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
      os_type = "unknown-linux-gnu";
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
  if (isNightly()) {
    return `rust-nightly-${target_triple}.tar.gz`;
  } else {
    return `rust-1.74.0-${target_triple}.tar.gz`;
  }
};

const getBinary = () => {
  const artifactName = getArtifactName();
  const url = `${artifact_download_url}/${artifactName}`;

  return new Binary("install.sh", url);
};

const install = async (suppressLogs) => {
  console.log("installing rust");
  const installScript = getBinary();
  const proxy = configureProxy(installScript.url);

  console.log(
    `installing at ${installScript.binaryPath} with __dirname ${__dirname}`
  );
  await installScript.install(proxy, suppressLogs);
  console.log("executing install script");
  const options = { cwd: __dirname, stdio: "inherit" };
  const result = spawnSync(
    installScript.binaryPath,
    ["--destdir=node_modules/.cargo"],
    options
  );
  console.log("finished installing rust");

  console.log("linking binaries");
  const binPath = path.join(
    __dirname,
    "node_modules",
    ".cargo",
    "usr",
    "local",
    "bin"
  );

  await fs.mkdir(path.join(__dirname, "..", ".bin"), { recursive: true });
  console.log("created .bin directory");
  // We link manually because we may not install the binaries, so we don't want symlinks pointing to nowhere.
  await Promise.all([
    fs.symlink(
      path.join(binPath, "cargo"),
      path.join(__dirname, "..", ".bin", "cargo")
    ),
    fs.symlink(
      path.join(binPath, "rustc"),
      path.join(__dirname, "..", ".bin", "rustc")
    ),
    fs.symlink(
      path.join(binPath, "rustdoc"),
      path.join(__dirname, "..", ".bin", "rustdoc")
    ),
  ]);
};

module.exports = {
  install,
  getBinary,
};
