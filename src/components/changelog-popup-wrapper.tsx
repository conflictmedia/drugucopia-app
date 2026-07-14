import fs from "fs";
import path from "path";
import { ChangelogPopup } from "./changelog-popup";

const packageJsonPath = path.join(process.cwd(), "package.json");
const changelogPath = path.join(process.cwd(), "CHANGELOG.md");

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
const changelogContent = fs.readFileSync(changelogPath, "utf-8");

function parseChangelogForVersion(content: string, version: string): string {
  const lines = content.split("\n");
  let inVersion = false;
  let result = "";

  for (const line of lines) {
    if (line.startsWith("## [")) {
      if (inVersion) break;
      if (line.includes(version)) {
        inVersion = true;
        continue;
      }
    }
    if (inVersion) {
      result += line + "\n";
    }
  }

  return result.trim() || "No changes recorded for this version.";
}

export const APP_VERSION = packageJson.version;
export const LATEST_CHANGELOG = parseChangelogForVersion(changelogContent, packageJson.version);

export function ChangelogPopupWrapper() {
  return <ChangelogPopup version={APP_VERSION} changelog={LATEST_CHANGELOG} />;
}