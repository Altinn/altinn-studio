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
     .security_vulnerability.first_patched_version.identifier, .dependency.relationship,
     .security_advisory.ghsa_id] | @tsv'
   ```

   If you do not have access, give this command to the user. Ask the user to run it and give you the result.

2. Skip an alert if it has no patched version.
3. Make the change that a Dependabot security update would make. A larger change, such as a parent update that
   Dependabot would not make, is for the user to decide in step 9. Update each package in the directory of its
   `manifest_path`. The repository has many lockfiles, and each one can have its own tool version.
   - Change a direct dependency in its manifest to the patched version. When the relationship is `unknown` or
     `inconclusive`, check the manifest.
   - Update an indirect dependency to a version that the version ranges of its parents allow. Dependabot updates a
     parent only for npm and NuGet. For the other package managers, skip the alert when no parent allows a patched
     version, even when the parent update is only a patch version.
     - Yarn: `yarn up -R <package>`.
     - npm: `npm update <package>`. If a parent allows only a vulnerable version, update the parent to a version
       that allows the patched version or no longer needs the package.
     - NuGet: Update the parent to a version that resolves to the patched version. If there is none, pin the patched
       version with a `PackageVersion` in `Directory.Packages.props`. Where `CentralPackageTransitivePinningEnabled`
       is off, also add a `PackageReference`.
     - Go: `go get <module>@<patched version>`, then `go mod tidy`.
     - Cargo: `cargo update -p <package>`.
     - uv: `uv lock --upgrade-package <package>`.

   Do not add an override or a resolution. If one already sets the vulnerable version, change it to the patched
   version. If these steps do not fix the alert, skip it.

   When a direct dependency is at the patched version and a version range of another package allows that version but
   resolves to a later one, the lockfile can have both versions. Change the direct dependency to the later version, so
   that the lockfile has one copy.

4. Make sure that the lockfile has each package at the patched version or a later version.
5. Run the tests of the workspace that owns the manifest. For a build-tool dependency, also run a production build.
   For a package without tests, do a smoke check. If a check fails because of an update, revert that update and skip
   the alert. Keep the failure output for step 7.
6. For each alert, find out if our code can reach the vulnerability. Read the advisory with
   `gh api advisories/<ghsa_id>` to learn what triggers it, such as a function, an option or untrusted input. Then
   find where the package runs, such as in a deployed service or only in a build, and if our code or a package on the
   dependency path uses what triggers it. Answer yes, no or unknown, and give the file or the dependency path that
   shows it. The answer tells the user how urgent a skipped alert is, and if they can dismiss it as unused. Update the
   package either way.
7. For each skipped alert, find the change that fixes the alert. Do not make this change.
   - If the fix needs a new major version of the package or of a parent package, or if a check failed, read the
     release notes or the migration guide. Find the breaking changes that affect our code, and give the files and
     the changes.
   - If the fix is only in a package with a different name, give that package and the code that must change.
   - If there is no patched version, find if a parent update removes the package. If not, say that the alert must
     wait for a patch.
8. Give the user a table of the fixed and skipped alerts, with the highest severity first. For each alert, give if
   it is reachable. For each skipped alert, give the reason and the change from step 7. Alerts with the same change
   can share a row.
9. Ask the user if they want a pull request for the fixed alerts. Also ask which changes from step 7 to make, and if
   they want them in separate pull requests.

## Pull request

The repository is public, and anyone can read an open pull request before the fix is deployed. Nobody should be able
to tell from the branch name, commit messages, PR title or PR body that the pull request fixes a vulnerability, or
where our code is exposed. Describe it as an ordinary dependency update:

- Leave out words such as advisory, alert, vulnerability and security, and IDs such as CVE and GHSA.
- Leave out the reachability findings from step 6, and how our code or a deployed service uses an updated package.

Start the PR title with `chore(deps):`.
