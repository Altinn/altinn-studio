# Deployer

Deployer is a local web dashboard for following and approving the deployments that this repository's
[deploy workflows](../../../.github/workflows) run across environments and rings. The GitHub Actions UI lists runs one
by one. Deployer shows a grid of services and environments, with what each environment runs and what comes next, and
lets you approve deployments that wait for you.

It needs Node.js with `node:sqlite` and an authenticated [GitHub CLI](https://cli.github.com/). It has no npm
dependencies and no build step.

## Usage

```sh
make run
```

The server opens `http://localhost:3456` in your browser. `REPO` and `PORT` change the repository and the port.

The server reads workflow runs and jobs through `gh`, stores them in `deployer.db` and polls jobs that are still
active. Delete `deployer.db` to start over. Deployer shows approve controls only for environments where you are a
reviewer, and approves with your `gh` credentials.

## Adding a deploy workflow

Deployer lists the deploy workflows and their environments in [`server.js`](server.js). A new deploy workflow shows
up only after you add it there. Deployer finds the environment of each job from a word in the job's name, such as
`at22` in `Tag syncroot (at22)`, so a deploy workflow must name its jobs after the environments they deploy to.

`make` checks the syntax of the JavaScript files, as CI does.
