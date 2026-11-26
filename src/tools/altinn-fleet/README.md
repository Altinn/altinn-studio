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

## What apps use of the app library

`fleet api-usage collect` compiles each app of `--env` against the app library version it references, with Roslyn,
and records in an SQLite file which app library types and members the app uses and how: called, implemented,
overridden, constructed or named. It is for deciding what the app library can stop making public, and for finding
the apps a change to it affects.

```sh
fleet api-usage collect --env prod --out api-usage.sqlite
fleet api-usage surface v8 --version 8.12.17 --out api-usage.sqlite
fleet api-usage surface main --out api-usage.sqlite \
    --source src/App/backend/src/Altinn.App.Api/Altinn.App.Api.csproj,src/App/backend/src/Altinn.App.Clients.Fiks/Altinn.App.Clients.Fiks.csproj
fleet query --db api-usage.sqlite "SELECT symbol, count(DISTINCT org || '/' || app) AS apps FROM uses
                                   GROUP BY symbol ORDER BY apps DESC"
```

`api-usage surface` records the types and members a version of the app library exposes, under a label, to compare
with what the apps use. [UsageDatabase.cs](src/Altinn.Studio.Fleet.ApiUsage/UsageDatabase.cs) has the file's schema,
and `fleet query --db` reads it with every environment's index attached, so a query can join it with `prod.apps`.

- It needs the .NET SDKs the apps' `global.json` files select, and network access to the NuGet feeds the apps use.
  An app that cannot be restored or compiled is recorded with the reason, and the next run tries it again.
- The store is not changed, so a read-only copy works. Each app is copied to a temporary folder and built there.
- Each app is analyzed in a process of its own, `fleet api-usage collect-app`, because a build keeps state in the
  process and can hang. `--timeout` ends one that takes too long.
- An app already analyzed at its deployed version is skipped, so a run after `fleet sync` only builds what changed.
  `--force` analyzes every app again.
- Uses in the app's own code, in code that source generators add to it and in its test projects are told apart,
  since a test project that uses a type is a weaker reason to keep it public than the app itself.
- Third-party packages that the apps use and that are built on the app library are read from their IL. IL
  references are not bound, so a member that a package uses stands for every overload of that name.
