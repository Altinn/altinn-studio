using Altinn.Studio.Common.Domain;
using Altinn.Studio.Fleet.Analysis;
using Altinn.Studio.Fleet.Cli;
using Altinn.Studio.Fleet.Store;
using Microsoft.Data.Sqlite;

using var cancellation = new CancellationTokenSource();
Console.CancelKeyPress += (_, e) =>
{
    // The first Ctrl+C lets the sync commit what it has downloaded; a second one ends the process.
    if (!cancellation.IsCancellationRequested)
    {
        e.Cancel = true;
        cancellation.Cancel();
    }
};

return await Cli.Run(args, Console.Out, Console.Error, cancellation.Token);

namespace Altinn.Studio.Fleet.Cli
{
    internal static class Cli
    {
        private const string Usage = """
            Usage: fleet <command> [options]

            Keeps a copy of the source of every Altinn app that runs in production and tt02, with an index to query.

            Commands:
              sync             Download the apps whose deployed version changed, and remove those that no longer run
              status           Show what the store holds for each environment, without network access
              query "<sql>"    Run a read-only SQL query against the index of --env, where prod.apps or tt02.apps
                               name another environment's tables
              index rebuild    Build an environment's index again from the files on disk, without downloading
              analysis run [NAMES]
                               Run analyses on a copy of each app of --env, and record what they find in --out.
                               NAMES lists analyses, separated by commas (default: all of them)

            Analyses:
              api-usage        Which app library types and members each app's code and packages use. Compiles each
                               app against the app library version it references, and records the public API of
                               each version the apps use

            Options:
              --store PATH     The store's folder (default: ~/altinn-fleet)
              --env ENV        prod, tt02 or all (default: prod; status shows all)

            sync:
              --org ORGS       Only these service owners, separated by commas
              --dry-run        Show what would change, without looking up releases or writing anything
              --retry-failed   Try again the apps that failed before at the same version
              --parallel N     Requests in flight at a time (default: 16)

            query:
              --tsv            Write tab-separated values
              --json           Write a JSON array of objects
              --db PATH        Query this SQLite file, such as analysis.sqlite, with every environment's index
                               attached as prod and tt02

            analysis:
              --out PATH       The SQLite file to write (default: analysis.sqlite)
              --org ORGS       run: only these service owners, separated by commas
              --parallel N     run: apps analyzed at a time (default: 4)
              --timeout S      run: seconds one analysis of one app may take (default: 900)
              --force          run: analyze every app again, also those analyzed at their deployed version
              --source PATH    run api-usage: also record the public API of the app library in this checkout of
                               altinn-studio or app-lib-dotnet, as the version `source`

            fleet asks studioctl for the Altinn Studio API keys, with `studioctl auth token`.
            """;

        private static readonly HashSet<string> s_flags = new(StringComparer.Ordinal)
        {
            "dry-run",
            "retry-failed",
            "tsv",
            "json",
            "help",
            "force",
        };

        public static async Task<int> Run(
            string[] args,
            TextWriter output,
            TextWriter error,
            CancellationToken cancellationToken,
            IStudioCredentials? credentials = null,
            HttpMessageHandler? handler = null,
            IAnalysisExecutor? executor = null
        )
        {
            try
            {
                Arguments parsed = Arguments.Parse(args, s_flags);
                if (parsed.Flag("help") || parsed.Positionals is [] or ["help"])
                {
                    output.WriteLine(Usage);
                    return parsed.Positionals is [] && !parsed.Flag("help") ? 2 : 0;
                }

                var store = new FleetStore(ExpandHome(parsed.Value("store")) ?? FleetStore.DefaultRoot);
                return parsed.Positionals switch
                {
                    ["sync"] => await SyncCommands.Sync(
                        parsed,
                        store,
                        output,
                        error,
                        credentials,
                        handler,
                        new FleetOptions(),
                        cancellationToken
                    ),
                    ["status"] => StatusCommand.Run(parsed, store, output),
                    ["query", string sql] => QueryCommand.Run(parsed, store, sql, output),
                    ["index", "rebuild"] => await SyncCommands.RebuildIndex(
                        parsed,
                        store,
                        output,
                        error,
                        new FleetOptions(),
                        cancellationToken
                    ),
                    ["analysis", "run"] => await AnalysisCommands.Run(
                        parsed,
                        null,
                        store,
                        output,
                        error,
                        executor,
                        cancellationToken
                    ),
                    ["analysis", "run", string names] => await AnalysisCommands.Run(
                        parsed,
                        names,
                        store,
                        output,
                        error,
                        executor,
                        cancellationToken
                    ),
                    // Run by `analysis run` for each job, in a process of its own.
                    ["analysis", "job", .. List<string> job] => await ChildProcessExecutor.RunJob(
                        job,
                        Analyses.All,
                        error,
                        cancellationToken
                    ),
                    _ => throw new UsageException($"Unknown command: {string.Join(' ', parsed.Positionals)}"),
                };
            }
            catch (UsageException ex)
            {
                error.WriteLine($"fleet: {ex.Message}");
                error.WriteLine("Run `fleet help` for the commands and options.");
                return 2;
            }
            catch (Exception ex) when (ex is FleetException or StudioCredentialsException)
            {
                error.WriteLine($"fleet: {ex.Message}");
                return 1;
            }
            catch (Exception ex) when (ex is SqliteException or IOException or UnauthorizedAccessException)
            {
                error.WriteLine($"fleet: {ex.Message}");
                return 1;
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                error.WriteLine(
                    "fleet: interrupted. The apps downloaded so far were kept; run the sync again to finish."
                );
                return 130;
            }
        }

        internal static List<RuntimeEnvironment> Environments(string value) =>
            value switch
            {
                "all" => [RuntimeEnvironment.Production, RuntimeEnvironment.TT02],
                "prod" or "production" => [RuntimeEnvironment.Production],
                "tt02" => [RuntimeEnvironment.TT02],
                _ => throw new UsageException($"--env must be prod, tt02 or all, not '{value}'."),
            };

        internal static HashSet<ServiceOwnerCode>? Orgs(string? value)
        {
            if (value is null)
            {
                return null;
            }

            var orgs = new HashSet<ServiceOwnerCode>();
            foreach (
                string name in value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            )
            {
                if (!ServiceOwnerCode.TryParse(name, out ServiceOwnerCode org))
                {
                    orgs.Clear();
                    break;
                }

                orgs.Add(org);
            }

            return orgs.Count == 0
                ? throw new UsageException($"--org must list service owners such as ttd,ssb, not '{value}'.")
                : orgs;
        }

        private static string? ExpandHome(string? path) =>
            path is not null && (path == "~" || path.StartsWith("~/", StringComparison.Ordinal))
                ? Path.Join(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), path[1..])
                : path;
    }
}
