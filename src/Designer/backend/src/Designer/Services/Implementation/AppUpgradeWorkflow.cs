namespace Altinn.Studio.Designer.Services.Implementation;

/// <summary>
/// Renders the Gitea Actions workflow that performs an automatic app upgrade on a runner. The workflow is pushed to
/// a fresh branch, runs studioctl there, removes itself from the result, and opens the pull request.
/// </summary>
public static class AppUpgradeWorkflow
{
    /// <summary>
    /// Marker written to the job log in front of the base64-encoded JSON report from studioctl.
    /// </summary>
    public const string ReportLogMarker = "::studio-upgrade-report::";

    public sealed record Parameters(
        string BranchName,
        string BaseBranch,
        int TargetMajorVersion,
        string CommitMessage,
        string StudioctlInstallUrl,
        string WorkflowPath
    );

    public static string Render(Parameters parameters) =>
        Template
            .Replace("__BRANCH__", parameters.BranchName)
            .Replace("__BASE_BRANCH__", parameters.BaseBranch)
            .Replace("__TARGET_VERSION__", parameters.TargetMajorVersion.ToString())
            .Replace("__COMMIT_MESSAGE__", parameters.CommitMessage)
            .Replace("__STUDIOCTL_INSTALL_URL__", parameters.StudioctlInstallUrl)
            .Replace("__WORKFLOW_PATH__", parameters.WorkflowPath)
            .Replace("__REPORT_MARKER__", ReportLogMarker);

    private const string Template = """
        name: Altinn Studio app upgrade
        run-name: Upgrade app to Altinn.App v__TARGET_VERSION__
        on:
          push:
            branches:
              - '__BRANCH__'
        jobs:
          upgrade:
            runs-on: ubuntu-latest
            env:
              GITEA_TOKEN: ${{ secrets.GITEA_TOKEN }}
              UPGRADE_BRANCH: '__BRANCH__'
              BASE_BRANCH: '__BASE_BRANCH__'
              TARGET_VERSION: '__TARGET_VERSION__'
              COMMIT_MESSAGE: '__COMMIT_MESSAGE__'
              STUDIOCTL_INSTALL_URL: '__STUDIOCTL_INSTALL_URL__'
              WORKFLOW_PATH: '__WORKFLOW_PATH__'
            steps:
              - name: Clone the app
                run: |
                  set -eu
                  repo_url="$GITHUB_SERVER_URL/$GITHUB_REPOSITORY.git"
                  authenticated_url=$(printf '%s' "$repo_url" | sed "s#://#://oauth2:$GITEA_TOKEN@#")
                  git clone --quiet --branch "$UPGRADE_BRANCH" "$authenticated_url" app
                  git -C app config user.name "Altinn Studio"
                  git -C app config user.email "studio@altinn.no"
              - name: Install tools
                run: |
                  set -eu
                  if ! command -v dotnet >/dev/null 2>&1; then
                    curl -sSL https://dot.net/v1/dotnet-install.sh | bash -s -- --channel 10.0 --install-dir "$HOME/.dotnet"
                    echo "$HOME/.dotnet" >> "$GITHUB_PATH"
                    echo "DOTNET_ROOT=$HOME/.dotnet" >> "$GITHUB_ENV"
                  fi
                  if ! command -v studioctl >/dev/null 2>&1; then
                    if ! curl -sSL "$STUDIOCTL_INSTALL_URL" | sh; then
                      echo "The studioctl installer's post-install steps failed; continuing with the installed binary."
                    fi
                    echo "$HOME/.local/bin" >> "$GITHUB_PATH"
                    test -x "$HOME/.local/bin/studioctl"
                  fi
              - name: Upgrade the app
                run: |
                  set -u
                  report="$PWD/upgrade-report.json"
                  help_text=$(studioctl app upgrade --help 2>&1 || true)
                  exit_code=0
                  case "$help_text" in
                    *--report*)
                      (cd app && studioctl app upgrade v9 --report "$report") || exit_code=$?
                      ;;
                    *)
                      echo "This studioctl cannot write a JSON report; the result will only carry the exit code."
                      (cd app && studioctl app upgrade v9) || exit_code=$?
                      ;;
                  esac
                  if [ ! -f "$report" ]; then
                    printf '{"exitCode":%s,"message":"","output":"","error":"studioctl did not write a report","steps":[]}' "$exit_code" > "$report"
                  fi
                  echo "__REPORT_MARKER__$(base64 -w0 "$report")"
                  if [ "$exit_code" != "0" ] && [ "$exit_code" != "3" ]; then
                    echo "The upgrade did not apply (exit code $exit_code); nothing was pushed."
                    exit "$exit_code"
                  fi
                  set -e
                  cd app
                  git rm --quiet "$WORKFLOW_PATH"
                  git add -A
                  git commit --quiet -m "$COMMIT_MESSAGE"
                  git push --quiet origin "HEAD:$UPGRADE_BRANCH"
                  python3 - "$report" <<'PY'
                  import json, os, sys, urllib.request

                  report = json.load(open(sys.argv[1]))
                  version = os.environ["TARGET_VERSION"]
                  lines = [f"Automatic upgrade to Altinn.App v{version} created by Altinn Studio.", ""]
                  manual = [
                      (step["name"], message)
                      for step in report.get("steps", [])
                      for message in step.get("messages", [])
                      if message.get("status") in ("TODO", "WARN", "FAIL")
                  ]
                  if manual:
                      lines += ["## Manual tasks before merging", ""]
                      lines += [f"- [ ] **{name}**: {message['text']}" for name, message in manual]
                      lines.append("")
                  lines += ["<details><summary>Full upgrade report</summary>", ""]
                  for step in report.get("steps", []):
                      lines.append(f"### {step['name']}")
                      lines += [f"- {m['status']}: {m['text']}" for m in step.get("messages", [])]
                      lines.append("")
                  lines.append("</details>")
                  payload = json.dumps({
                      "title": os.environ["COMMIT_MESSAGE"],
                      "head": os.environ["UPGRADE_BRANCH"],
                      "base": os.environ["BASE_BRANCH"],
                      "body": "\n".join(lines),
                  }).encode()
                  request = urllib.request.Request(
                      f"{os.environ['GITHUB_API_URL']}/repos/{os.environ['GITHUB_REPOSITORY']}/pulls",
                      data=payload,
                      method="POST",
                      headers={
                          "Authorization": f"token {os.environ['GITEA_TOKEN']}",
                          "Content-Type": "application/json",
                      },
                  )
                  with urllib.request.urlopen(request) as response:
                      created = json.load(response)
                  print(f"Opened pull request #{created['number']}: {created['html_url']}")
                  PY
        """;
}
