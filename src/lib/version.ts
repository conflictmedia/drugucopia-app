// package.json is the release workflow's source of truth. Importing it here
// prevents the UI version from drifting when a release is bumped.
import packageMetadata from "../../package.json";
import tauriConfig from "../../src-tauri/tauri.conf.json";

export const APP_VERSION = packageMetadata.version;
export const TAURI_VERSION = tauriConfig.version;
