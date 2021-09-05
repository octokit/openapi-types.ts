const { readdir, mkdir, rm, writeFile, copyFile } = require("fs/promises");
const { basename } = require("path");

const prettier = require("prettier");
const openapiTS = require("openapi-typescript").default;

if (!process.env.OCTOKIT_OPENAPI_VERSION) {
  throw new Error("OCTOKIT_OPENAPI_VERSION is not set");
}

run();

const packageDefaults = {
  publishConfig: {
    access: "public",
  },
  version: "0.0.0-development",
  main: "",
  types: "types.d.ts",
  author: "Gregor Martynus (https://twitter.com/gr2m)",
  license: "MIT",
  octokit: {
    "openapi-version": process.env.OCTOKIT_OPENAPI_VERSION.replace(/^v/, ""),
  },
};

async function run() {
  await rm("packages", { recursive: true }).catch(() => {});
  await mkdir("packages");

  const files = await readdir("cache");
  for (const fileName of files) {
    if (!/\.json$/.test(fileName)) continue;

    const name = basename(fileName, ".json");

    const packageName =
      name === "api.github.com" ? "openapi-types" : `openapi-types-${name}`;

    await mkdir(`packages/${packageName}`);
    await writeFile(
      `packages/${packageName}/package.json`,
      prettier.format(
        JSON.stringify({
          name: `@octokit/${packageName}`,
          description: `Generated TypeScript definitions based on GitHub's OpenAPI spec for ${name}`,
          repository: {
            type: "git",
            url: "https://github.com/octokit/openapi-types.ts.git",
            directory: `packages/${packageName}`,
          },
          ...packageDefaults,
        }),
        { parser: "json" }
      )
    );
    await writeFile(
      `packages/${packageName}/README.md`,
      prettier.format(
        `
# @octokit/${packageName}

> Generated TypeScript definitions based on GitHub's OpenAPI spec ${
          packageName === "openapi-types" ? "" : `for ${name}`
        }

This package is continously updated based on [GitHub's OpenAPI specification](https://github.com/github/rest-api-description/) 

## Usage

\`\`\`ts
import { components } from "@octokit/${packageName}";

type Repository = components["schemas"]["full-repository"]
\`\`\`

## License

[MIT](LICENSE)
`,
        { parser: "markdown" }
      )
    );
    
    await copyFile("LICENSE", `packages/${packageName}/LICENSE`);

    await writeFile(
      `packages/${packageName}/types.d.ts`,
      await openapiTS(`cache/${name}.json`)
    );
    console.log(`packages/${packageName}/types.d.ts written`);
  }
}
