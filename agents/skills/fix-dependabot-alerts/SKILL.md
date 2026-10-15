---
name: fix-dependabot-alerts
description: Fix open Dependabot alerts with dependency updates, and report the fixed and skipped alerts. Use when the user asks to fix Dependabot or security alerts.
---

# Fix Dependabot alerts

Fix open Dependabot alerts and report back to the user with a table of fixed and skipped alerts.

1. Find any open alerts:

   ```sh
   gh api "repos/Altinn/altinn-studio/dependabot/alerts?state=open&per_page=100" --paginate --jq '.[] | [
     .number, .security_advisory.severity, .dependency.package.ecosystem, .dependency.package.name,
     .dependency.manifest_path, .security_vulnerability.vulnerable_version_range,
     .security_vulnerability.first_patched_version.identifier] | @tsv'
   ```

   If you do not have access, give this command to the user. Ask the user to run it and give you the result.

2. Skip an alert if its `manifest_path` is not in the checkout, or if it has no patched version.
3. Update each package in the directory of its `manifest_path`. The repository has many lockfiles, and each one can
   have its own tool version. Update an indirect dependency as Dependabot does:

   | Package manager | Indirect dependency update                                                     |
   | --------------- | ------------------------------------------------------------------------------ |
   | Yarn            | `yarn up -R <package>`. Do not update the parent package.                      |
   | NuGet           | Add a `PackageVersion` with the patched version to `Directory.Packages.props`. |
   | Go              | `go get <module>@<patched version>`, then `go mod tidy`.                       |
   | Cargo           | `cargo update -p <package>`.                                                   |
   | uv              | `uv lock --upgrade-package <package>`.                                         |

   Do not add an override or a resolution. If one already sets the vulnerable version, change it to the patched
   version. If these steps do not fix the alert, skip it.

4. Make sure that the lockfile has each package at the patched version or a later version.
5. Run the tests of the workspace that owns the manifest. For a build-tool dependency, also run a production build.
   For a package without tests, do a smoke check. If a check fails because of an update, revert that update and skip
   the alert.
6. Give the user a table of the fixed and skipped alerts, with the highest severity first. Give a reason for each
   skipped alert. List the alerts with a deleted manifest separately, so that the user can dismiss them in the
   Dependabot UI.
7. Ask the user if they want a pull request.

## Pull request

The repository is public. Keep the branch name, commit message, PR title and PR body neutral. Do not name
advisories, CVE IDs, alert numbers or vulnerabilities. Start the PR title with `chore(deps):`.
