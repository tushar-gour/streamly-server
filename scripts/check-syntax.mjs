import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const sourceRoot = path.resolve("src");
const scriptRoot = path.resolve("scripts");
const testRoot = path.resolve("tests");
const configFiles = [path.resolve("vitest.config.js")];

const collectJavaScriptFiles = async (directory) => {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            files.push(...(await collectJavaScriptFiles(entryPath)));
            continue;
        }

        if (entry.isFile() && entry.name.endsWith(".js")) {
            files.push(entryPath);
        }

        if (entry.isFile() && entry.name.endsWith(".mjs")) {
            files.push(entryPath);
        }
    }

    return files;
};

const runNodeCheck = (filePath) =>
    new Promise((resolve, reject) => {
        const child = spawn(process.execPath, ["--check", filePath], {
            stdio: "inherit",
        });

        child.on("error", reject);
        child.on("close", (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(`Syntax check failed: ${filePath}`));
        });
    });

const files = [
    ...(await collectJavaScriptFiles(sourceRoot)),
    ...(await collectJavaScriptFiles(scriptRoot)),
    ...(await collectJavaScriptFiles(testRoot)),
    ...configFiles,
];

for (const file of files) {
    await runNodeCheck(file);
}

console.log(`Syntax check passed for ${files.length} files.`);
