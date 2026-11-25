# The end to end benchmark

This is the only eval that builds a real app. For each app template, `Benchmarks/app-v8` and `Benchmarks/app-v9`:

1. The runner makes a new app from the template in [src/App/template](../../../App/template) and pushes it to the
   local Gitea.
2. The assistant builds the app that the item asks for, and pushes a session branch.
3. The runner clones the branch and scores the committed files.

A run takes many minutes, so `check` runs it only with `--include-e2e`. [EVALS.md](EVALS.md) is the entry point to
the workbench.

## When to run it

Run it before you merge a change to the prompts, the tools, the skills, the loop or the models. Run it after a model
or an SDK update. Describe the change with `--label`. One item builds one app per template, and the model does not
build the same app twice. So compare the scores over several runs, and read the comments.

## The app the assistant starts from

The runner makes a new app for each eval in a run, named `bench-<template>-<time>` in `BENCH_ORG`. It copies the
template from the working tree and does the steps that Designer does when it creates an app. Designer's create-app
endpoint does not accept an API key, so [bench_app.py](bench_app.py) repeats the steps of
`RepositoryService.CreateService`. Change the module when that method changes. The runner keeps the apps, so you can
open them in Studio after a run.

## The item and its scores

The item is in [datasets/app_build.jsonl](datasets/app_build.jsonl). Its goal asks for a full app from a PDF: three
languages, prefill, fields that show on an answer, code lists, validation, an attachment, a PDF task with a page of
its own, a gateway, signing, rights for each task and a custom receipt. Integrations, payment and C# code are not in
the goal.

The rubric in `expectedOutput` holds what the goal asks for: field titles, values and rights. A check finds a field
by its title, so two runs can use different IDs and paths. [app_checks.py](app_checks.py) gives one score for each
skill. A score is the share of its checks that pass, and its comment names each check that fails. The checks know
where v8 and v9 keep each part, as the skills' version files say. The structural scores in
[evaluators.py](evaluators.py), such as the page count, still run too. A build that commits no app gets `bench_built`
0, with what the assistant said in its comment, and no other scores.

The checks read the files. They do not run the app. A `hidden` expression, a gateway condition and a validation rule
must read the right fields and name the right answer or limit, but one that compares the wrong way still passes.

To see the structural rubric of an app that you know is correct:

```bash
python -m benchmarks.runner rubric --from-app /path/to/a/clone
```

## Prerequisites

| What                                        | Check                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| The local Designer stack runs               | `curl -s -o /dev/null -w '%{http_code}' http://studio.localhost` → `200` |
| The assistant service runs                  | `curl -s http://localhost:8071/health` has `models`                      |
| `.env` in this folder has the Langfuse keys | see [.env.example](../.env.example)                                      |
| A Designer API key in `.env`                | `python -m benchmarks.bootstrap_api_key --write-env`                     |
| The score configs are in Langfuse           | `python -m benchmarks.runner ensure-configs`                             |

Without `models` in `/health`, the run stops, because it cannot connect the scores to a model. Build the assistant
service image again. Make the API key again after you delete the database volume. Run `ensure-configs` again after
someone adds a score.

`AGENT_DESIGNER_API_KEY` must be a Designer API key, not a Gitea token. The gitea-proxy checks the key with Designer.
The key's user must be able to create repositories in `BENCH_ORG`, which is `ttd` unless you set it.

```bash
python -m benchmarks.dataset_sync --dataset Benchmarks/app-v9   # after a change to the item
python -m benchmarks.runner check --include-e2e --label "what you changed"
python -m benchmarks.runner check --include-e2e --only Benchmarks/app-v9
```

## Render check

The render check opens each page of the form in Studio's app preview with headless Chromium. Studio's preview is off
for now, so the check is off by default. Set `BENCH_PREVIEW_CHECK=1` to turn it on, and run
`playwright install chromium` one time. When Playwright or the login is not available, the runner writes a log line
and sends no render scores.

A page renders when it shows `#finishedLoading`, shows no error page, and throws no exception. App frontend catches a
component of an unknown type, so an exception on the console is the only sign of it. Other console output goes into
the comment and does not fail the page.

`BENCH_RENDER_FIX=1` sends the failed pages back to the same session, and the runner checks again.
`bench_renders` and `bench_pages_render` always show the state before a fix, so you can compare runs. Each fix round
is a full workflow and costs model tokens.

`python -m benchmarks.preview_check --repo <org>/<app> --branch <branch>` checks one branch that is already built.
It sends nothing to Langfuse.

## Troubleshooting

- **The bench app is not created.** The error says what to check. Usually the API key's user is not in a team of
  `BENCH_ORG` that can create repositories.
- **A new score does not show in Langfuse.** Run `ensure-configs` again.
- **Each page fails with a login or checkout error.** Delete `benchmarks/.playwright-auth.json`. A stack reset makes
  the stored session incorrect.
