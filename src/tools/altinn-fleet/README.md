# altinn-fleet

`fleet` keeps a copy of the source of every app that runs in production and tt02, at the commit of its deployed
version, with an SQLite index. It is for searching and analyzing all apps at once, and it fills the agents'
[app volumes](../../../agents/README.md#deployed-apps).

## Running it

It needs the .NET SDK that [global.json](global.json) names, and studioctl logged in to Altinn Studio.

```sh
cd src/tools/altinn-fleet
dotnet run --project src/Altinn.Studio.Fleet.Cli -- sync --env all
```

`make install` puts `fleet` on the PATH. On Windows, run
`dotnet publish src/Altinn.Studio.Fleet.Cli -c Release -o $env:LOCALAPPDATA\altinn-fleet` and add that folder to the
PATH instead. `fleet help` lists the commands, and [FleetIndex.cs](src/Altinn.Studio.Fleet/Store/FleetIndex.cs) has the
index's schema.

- `fleet` gets each Studio installation's API key from `studioctl auth token` and keeps it in memory for one run. An
  older studioctl answers `unknown subcommand: token`, and `studioctl self update` fixes that.
- Log in to staging and dev too, with `studioctl auth login --env staging` and `--env dev`. Without them, the apps
  released only there, mostly test apps in tt02, are recorded as failures until you do.

## Why it works the way it does

- An agent volume copies an environment's whole folder whenever anything in it changed. So a sync that finds nothing
  changed writes nothing there, and its lock and temporary files live in `.fleet` beside the folders.
- Apps come from Gitea's archive of the commit, so the folders have no `.git` for the volume to copy.
- agentctl asks before it copies a file named `.env`, so those are left out, with links and paths outside the app.
  On Windows, so are names Windows cannot store. The index's `skipped` table lists them.
- A service owner whose cluster cannot be reached keeps its apps, rather than losing them, and so does an app listed
  with a version that cannot be read. A service owner that the registry no longer lists for the environment has left
  it, so its apps are removed.
- An app that cannot be fetched is recorded in `failures`. One Studio would not give, such as from a private
  repository, is tried again when its version changes or with `--retry-failed`. Any other, such as one not looked up
  because an installation had no working API key, is tried again by every sync.
- The engine knows nothing of the console or studioctl, so that a service can host it.

## Querying

`fleet query` opens the index of `--env` read-only, with every environment attached under its name:

```sh
fleet query "SELECT org, app FROM prod.apps p JOIN tt02.apps t USING (org, app)
             WHERE p.contract = 'v8' AND t.contract = 'v9'"
```

In an Agent, the copies are in `/home/agent/code/.reference/altinn-apps/prod` and `tt02`, as old as the Agent. Their
`README.md` says when the content last changed. Run `make install`, then pass
`--store /home/agent/code/.reference/altinn-apps` to `fleet query`. Where a copy is missing, `fleet sync` with the same
`--store` fetches it.
