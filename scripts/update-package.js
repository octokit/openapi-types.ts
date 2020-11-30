const { writeFileSync } = require("fs");
const prettier = require("prettier");

if (!process.env.VERSION) {
  throw new Error("VERSION is not set");
}

const pkg = require("../package.json");

if (!pkg.octokit) {
  pkg.octokit = {};
}

pkg.octokit["openapi-version"] = process.env.VERSION;

writeFileSync(
  "package.json",
  prettier.format(JSON.stringify(pkg), { parser: "json" })
);
