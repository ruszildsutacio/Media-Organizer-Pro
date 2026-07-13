// Cross-platform guard: ensures installs use pnpm and removes stray lockfiles
// from other package managers. Runs on Windows, macOS, and Linux (unlike the
// previous `sh -c '...'` version, which failed on Windows cmd/PowerShell).
const fs = require("fs");

for (const lockfile of ["package-lock.json", "yarn.lock"]) {
  if (fs.existsSync(lockfile)) {
    fs.unlinkSync(lockfile);
  }
}

const userAgent = process.env.npm_config_user_agent || "";
if (!userAgent.startsWith("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}
