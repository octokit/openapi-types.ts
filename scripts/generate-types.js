import { readdir, mkdir, rm, writeFile, copyFile } from "node:fs/promises";
import { basename } from "node:path";

import * as prettier from "prettier";
import openapiTS, { astToString, COMMENT_HEADER } from "openapi-typescript";

if (!process.env.OCTOKIT_OPENAPI_VERSION) {
  throw new Error("OCTOKIT_OPENAPI_VERSION is not set");
}

run();

const packageDefaults = {
  publishConfig: {
    access: "public",
    provenance: true,
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
      await prettier.format(
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
        { parser: "json-stringify" },
      ),
    );
    await writeFile(
      `packages/${packageName}/README.md`,
      await prettier.format(
        `
# @octokit/${packageName}

> Generated TypeScript definitions based on GitHub's OpenAPI spec ${
          packageName === "openapi-types" ? "" : `for ${name}`
        }

This package is continuously updated based on [GitHub's OpenAPI specification](https://github.com/github/rest-api-description/)

## Usage

\`\`\`ts
import { components } from "@octokit/${packageName}";

type Repository = components["schemas"]["full-repository"]
\`\`\`

## License

[MIT](LICENSE)
`,
        { parser: "markdown" },
      ),
    );

    await copyFile("LICENSE", `packages/${packageName}/LICENSE`);

    await writeFile(
      `packages/${packageName}/types.d.ts`,
      await prettier.format(
        COMMENT_HEADER +
          astToString(
            await openapiTS(new URL(`../cache/${name}.json`, import.meta.url)),
          ),
        {
          parser: "typescript",
        },
      ),
    );
    console.log(`packages/${packageName}/types.d.ts written`);
  }
}
