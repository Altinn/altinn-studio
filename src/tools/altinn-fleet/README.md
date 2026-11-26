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
- Which service owners have which environments comes from the service owner registry on Altinn's CDN, and the host
  that serves their apps from its environment registry. A service owner in an environment that registry does not list
  keeps its apps.
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

## Analyses

`fleet analysis run` analyzes a copy of each app in `--env` and records the results in an SQLite file,
`analysis.sqlite` by default. `fleet query --db` reads that file with the environments' indexes attached, so a query
can join the results with `prod.apps`.

```sh
fleet analysis run --env prod
fleet query --db analysis.sqlite "SELECT analysis, count(*) AS apps, count(failure) AS failed FROM runs
                                  GROUP BY analysis"
```

- The results have a file of their own because an index can be rebuilt from the store at any time, while an analysis
  can take minutes per app.
- Each app is copied before it is analyzed, so the store stays unchanged and a read-only copy works. A sync at the
  same time can change an app while it is copied. The app then fails, and the next run analyzes it again.
- Each analysis runs in a process of its own, `fleet analysis job`, since it can keep state in the process or hang.
  `--timeout` ends one that takes too long. Fleet's own process only copies apps and records results, so that a
  service can host the library.
- An analysis may build the apps, which runs the service owners' MSBuild targets and source generators as the user
  who runs fleet. Run it where you would build their apps yourself, such as in an agent.
- A run skips the apps already analyzed at their deployed version. A new version of an analysis replaces its tables,
  so a run of it for only some service owners or environments stops rather than lose the others' results.
- An analysis implements [IAppAnalysis](src/Altinn.Studio.Fleet/Analysis/IAppAnalysis.cs) and is listed in
  [Analyses.cs](src/Altinn.Studio.Fleet/Analysis/Analyses.cs).

### api-usage

`api-usage` records which app library types and members each app uses, to decide what the app library can stop
making public and to find the apps a change affects. It compiles each app against the app library version the app
ships, and reads the public API of each of those versions from its NuGet packages, so that a query can tell what no
app uses.

```sh
fleet analysis run api-usage --env prod
fleet query --db analysis.sqlite "SELECT symbol, count(DISTINCT org || '/' || app) AS apps FROM api_usage_uses
                                  WHERE source <> 'test' GROUP BY symbol ORDER BY apps DESC"
```

- The compiler binds each use, so members that code calls without naming them count too, such as the `GetAwaiter`
  of an `await`.
- Uses in the app's own code, in generated code and in tests are told apart, since a use in a test is a weaker reason
  to keep a member public.
- Packages built on the app library are read from their compiled code, which names a member without its overload. A
  package's use of a member counts for every overload of that name.
- `--source` also reads the public API of an altinn-studio or app-lib-dotnet checkout, as the version `source`.
- It needs the .NET SDKs the apps select and access to their NuGet feeds. An app that does not restore or compile
  fails, and the next run tries it again.
- Project shapes that no app in prod has come out incomplete, such as an app that targets several frameworks or
  restores its packages outside its folder.

[ApiUsageAnalysis.cs](src/Altinn.Studio.Fleet/Analysis/ApiUsage/ApiUsageAnalysis.cs) has the tables.
