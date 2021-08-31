const { get } = require("https");
const { createWriteStream } = require("fs");
const { mkdir, rm } = require("fs/promises");

const { Octokit } = require("@octokit/core");
const { getCurrentVersions } = require("github-enterprise-server-versions");

if (!process.env.OCTOKIT_OPENAPI_VERSION) {
  throw new Error("OCTOKIT_OPENAPI_VERSION is not set");
}

run(process.env.OCTOKIT_OPENAPI_VERSION.replace(/^v/, "")).then(
  () => console.log("done"),
  console.error
);

async function run(version) {
  await rm("cache", { recursive: true });
  await mkdir("cache");

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  const { data } = await octokit.request(
    "GET /repos/{owner}/{repo}/contents/{path}",
    {
      owner: "octokit",
      repo: "openapi",
      path: "generated",
      ref: "main",
    }
  );

  if (!Array.isArray(data)) {
    throw new Error(
      "https://github.com/octokit/openapi/tree/main/generated is not a directory"
    );
  }

  const currentGHESVersions = await getCurrentVersions();
  for (const file of data) {
    if (!/\.json$/.test(file.name)) continue;
    if (/deref/.test(file.name)) continue;
    if (/diff/.test(file.name)) continue;

    if (/^ghes-/.test(file.name)) {
      if (
        !currentGHESVersions.includes(
          parseFloat(file.name.substr("ghes-".length))
        )
      ) {
        continue;
      }
    }

    download(version, file.name);
  }
}

function download(version, fileName) {
  const localPath = `cache/${fileName}`;

  const file = createWriteStream(localPath);
  const url = `https://unpkg.com/@octokit/openapi@${version}/generated/${fileName}`;

  console.log("Downloading %s", url);

  return new Promise((resolve, reject) => {
    get(url, (response) => {
      response.pipe(file);
      file
        .on("finish", () =>
          file.close((error) => {
            if (error) return reject(error);
            console.log("%s written", localPath);
            resolve();
          })
        )
        .on("error", (error) => reject(error.message));
    });
  });
}
