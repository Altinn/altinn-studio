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

`make install` puts `fleet` on the PATH. `fleet help` lists the commands, and
[FleetIndex.cs](src/Altinn.Studio.Fleet/Store/FleetIndex.cs) has the index's schema.

- `fleet` gets each Studio installation's API key from `studioctl auth token` and keeps it in memory for one run. An
  older studioctl answers `unknown subcommand: token`, and `studioctl self update` fixes that.
- `FLEET_` environment variables override where it finds the services, as
  [FleetOptions](src/Altinn.Studio.Fleet/FleetOptions.cs) says.
- Until Designer's release lookup is deployed, `fleet` looks releases up one app at a time, which only works for the
  service owners you are a member of.

## Why it works the way it does

- An agent volume copies an environment's whole folder whenever anything in it changed. So a sync that finds nothing
  changed writes nothing there, and its lock and temporary files live in `.fleet` beside the folders.
- Apps come from Gitea's archive of the commit, so the folders have no `.git` for the volume to copy.
- agentctl asks before it copies a file named `.env`, so those are left out, with links and paths outside the app.
  The index's `skipped` table lists them.
- A service owner whose cluster cannot be reached keeps its apps, rather than losing them.
- An app that cannot be fetched is recorded in `failures`, and tried again when its version changes or with
  `--retry-failed`.
- The engine knows nothing of the console or studioctl, so that a service can host it.

## Querying

`fleet query` opens the index of `--env` read-only, with every environment attached under its name:

```sh
fleet query "SELECT org, app FROM prod.apps p JOIN tt02.apps t USING (org, app)
             WHERE p.altinn_app_major = 8 AND t.altinn_app_major = 9"
```

In an Agent, the copies are in `/home/agent/code/.reference/altinn-apps/prod` and `tt02`, as old as the Agent. Their
`README.md` says when the content last changed. Run `make install`, then pass
`--store /home/agent/code/.reference/altinn-apps` to `fleet query`. Where a copy is missing, `fleet sync` with the same
`--store` fetches it.
