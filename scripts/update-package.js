const { writeFile, readdir } = require("fs/promises");

if (!process.env.OCTOKIT_OPENAPI_VERSION) {
  throw new Error("OCTOKIT_OPENAPI_VERSION is not set");
}

const pkg = require("../package.json");

updatePackage();

async function updatePackage() {
  // set semantic-release configuration of npm packages
  const items = await readdir("packages");
  const packages = items.filter((item) => item.startsWith("openapi-types"));

  pkg.release.plugins = [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/github",
  ].concat(
    packages.map((package) => {
      return [
        "@semantic-release/npm",
        {
          pkgRoot: `packages/${package}`,
        },
      ];
    })
  );

  await writeFile("package.json", JSON.stringify(pkg, null, 2) + "\n");
}
