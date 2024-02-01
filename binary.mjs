import { Binary } from "binary-install";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { $ } from "zx";
import { fileURLToPath } from "node:url";

async function getToolchain(dirname) {
  const packageJsonPath = path.join(dirname, "package.json");
  const packageJsonText = await fs.readFile(packageJsonPath, "utf-8");
  const packageJson = JSON.parse(packageJsonText);
  if (packageJson.version.endsWith("-nightly")) {
    return "nightly";
  } else if (packageJson.version.endsWith("-beta")) {
    return "beta";
  } else if (packageJson.version.endsWith("-stable")) {
    return "stable";
  } else if (/1\.\d+\.\d+/.test(packageJson.version)) {
    return packageJson.version;
  } else {
    throw new Error("unknown toolchain");
  }
}

const getTargetName = (toolchain) => {
  const rawOsType = os.type();
  const rawArchitecture = os.arch();

  // We want to use rust-style target triples as the canonical key
  // for a platform, so translate the "os" library's concepts into rust ones
  let osType = "";
  switch (rawOsType) {
    case "Windows_NT":
      throw new Error("Windows is not supported");
    case "Darwin":
      osType = "apple-darwin";
      break;
    case "Linux":
      osType = "unknown-linux-gnu";
      break;
  }

  let arch = "";
  switch (rawArchitecture) {
    case "x64":
      arch = "x86_64";
      break;
    case "arm64":
      arch = "aarch64";
      break;
  }

  // Assume the above succeeded and build a target triple to look things up with.
  // If any of it failed, this lookup will fail and we'll handle it like normal.
  return `${toolchain}-${arch}-${osType}`;
};

const install = async () => {
  let installGlobally;
  if (!process.env.RUST_INSTALL_LOCATION) {
    installGlobally = true;
  } else if (process.env.RUST_INSTALL_LOCATION === "global") {
    installGlobally = true;
  } else if (process.env.RUST_INSTALL_LOCATION === "local") {
    installGlobally = false;
  } else {
    throw new Error(
      `unknown install location: ${process.env.RUST_INSTALL_LOCATION}`
    );
  }

  console.log("downloading rustup");

  const resp = await fetch("https://sh.rustup.rs");
  const text = await resp.text();

  const __filename = fileURLToPath(import.meta.url);
  const dirname = path.dirname(__filename);
  const rustupPath = path.join(dirname, "node_modules", "rustup.sh");
  const toolchain = await getToolchain(dirname);

  await fs.mkdir(path.join(dirname, "node_modules"), { recursive: true });

  await fs.writeFile(rustupPath, text);
  await $`chmod +x ${rustupPath}`;
  const installDir = path.join(dirname, "node_modules", ".rustup");

  console.log("installing rust");

  // In some cases like pnpm, there's a wonky directory structure,
  // so we can't install the rust toolchain locally, instead we
  // install it globally. This isn't ideal, but it works
  // well enough for deployment situations like Vercel.
  if (installGlobally) {
    await $`${rustupPath} -y --default-toolchain ${toolchain}`;
  } else {
    const envVar = `RUSTUP_HOME=${installDir}`;
    await $`${envVar} ${rustupPath} -y --default-toolchain ${toolchain}`;
  }

  const targetTriple = getTargetName(toolchain);

  const binPath = path.join(
    dirname,
    "node_modules",
    ".rustup",
    "toolchains",
    targetTriple,
    "bin"
  );

  console.log(`linking binaries in ${binPath}`);

  await fs.mkdir(path.join(dirname, "..", ".bin"), { recursive: true });
  console.log("created .bin directory");
  // We link manually because we may not install the binaries, so we don't want symlinks pointing to nowhere.
  await Promise.all([
    fs.symlink(
      path.join(binPath, "cargo"),
      path.join(dirname, "..", ".bin", "cargo")
    ),
    fs.symlink(
      path.join(binPath, "rustc"),
      path.join(dirname, "..", ".bin", "rustc")
    ),
    fs.symlink(
      path.join(binPath, "rustdoc"),
      path.join(dirname, "..", ".bin", "rustdoc")
    ),
  ]);
};

export { install };
