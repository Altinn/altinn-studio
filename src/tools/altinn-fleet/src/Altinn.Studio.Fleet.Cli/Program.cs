using Altinn.Studio.Common.Domain;
using Altinn.Studio.Fleet;
using Altinn.Studio.Fleet.Analysis;
using Altinn.Studio.Fleet.Cli;
using Altinn.Studio.Fleet.Cli.Analysis.ApiUsage;
using Altinn.Studio.Fleet.Http;
using Altinn.Studio.Fleet.Store;
using Altinn.Studio.Fleet.Sync;
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
              analysis api-usage surface LABEL
                               Record the types and members of an app library version in --out, under LABEL

            Analyses:
              api-usage        Which app library types and members each app's code and packages use. Compiles each
                               app against the app library version it references

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
              --source PROJECTS
                               api-usage surface: the app library's projects, separated by commas
              --version V      api-usage surface: a published app library version, read from its packages

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
                    ["sync"] => await Sync(
                        parsed,
                        store,
                        output,
                        error,
                        credentials,
                        handler,
                        new FleetOptions(),
                        cancellationToken
                    ),
                    ["status"] => Status(parsed, store, output),
                    ["query", string sql] => Query(parsed, store, sql, output),
                    ["index", "rebuild"] => await Rebuild(
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
                    ["analysis", "api-usage", "surface", string label] => await ApiUsageCommands.Surface(
                        parsed,
                        (ApiUsageAnalysis)AnalysisCommands.Find("api-usage"),
                        label,
                        output,
                        cancellationToken
                    ),
                    // Run by `analysis run` for each app, in a process of its own.
                    ["analysis", "run-app", string name, string appDir, string resultFile] =>
                        await AnalysisCommands.RunApp(name, appDir, resultFile, error, cancellationToken),
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

        private static async Task<int> Sync(
            Arguments args,
            FleetStore store,
            TextWriter output,
            TextWriter error,
            IStudioCredentials? credentials,
            HttpMessageHandler? handler,
            FleetOptions fleetOptions,
            CancellationToken cancellationToken
        )
        {
            var options = new SyncOptions
            {
                Environments = Environments(args.Value("env") ?? "prod"),
                Orgs = Orgs(args.Value("org")),
                DryRun = args.Flag("dry-run"),
                RetryFailed = args.Flag("retry-failed"),
                Parallelism = args.Int("parallel", 16, 1, 64),
            };
            args.RejectUnused();

            var studioctl = new StudioctlCredentials();
            using HttpClient http = FleetHttp.CreateClient(FleetSync.Version, innerHandler: handler);
            var sync = new FleetSync(store, http, credentials ?? studioctl, fleetOptions);
            DateTimeOffset startedAt = DateTimeOffset.UtcNow;
            IReadOnlyList<EnvironmentSyncResult> results;
            using (
                var progress = new ConsoleProgress(error, interactive: handler is null && !Console.IsErrorRedirected)
            )
            {
                try
                {
                    results = await sync.Sync(options, progress, cancellationToken);
                }
                catch (FleetException) when (studioctl.Problems.Count > 0)
                {
                    progress.Dispose();
                    foreach ((string host, string problem) in studioctl.Problems)
                    {
                        error.WriteLine($"fleet: studioctl gave no API key for {host}: {problem}");
                    }

                    throw;
                }
            }

            foreach (EnvironmentSyncResult result in results)
            {
                SyncSummary.Write(output, result, startedAt);
            }

            return 0;
        }

        private static int Status(Arguments args, FleetStore store, TextWriter output)
        {
            string? env = args.Value("env");
            args.RejectUnused();
            output.WriteLine($"Store: {store.Root}");
            foreach (RuntimeEnvironment environment in Environments(env ?? "all"))
            {
                string name = $"{environment.Name, -5}";
                if (FleetStoreReader.GetStatus(store, environment) is not EnvironmentStatus.Synced status)
                {
                    output.WriteLine($"{name} not synced");
                    continue;
                }

                output.WriteLine(
                    $"{name} {SyncSummary.Count(status.Apps, "app", "apps")} · "
                        + $"{SyncSummary.Count(status.Orgs, "service owner", "service owners")} · {status.Failures} failed   "
                        + $"content changed {Time(status.LastContentChange)}"
                );
                CheckState? check = status.LastCheck;
                if (check is null)
                {
                    output.WriteLine("      not checked from this store");
                    continue;
                }

                output.WriteLine(
                    $"      checked {Time(check.CheckedAt)}: {check.Deployed} deployed, {check.Failed} failed"
                );
                foreach (OrgFailure failure in check.DiscoveryFailures)
                {
                    output.WriteLine($"      could not list the apps of {failure.Org}: {failure.Reason}");
                }
            }

            return 0;
        }

        private static int Query(Arguments args, FleetStore store, string sql, TextWriter output)
        {
            string? database = args.Value("db");
            string? env = args.Value("env");
            if (database is not null && env is not null)
            {
                throw new UsageException("Give --db or --env, not both. --db attaches every environment's index.");
            }

            List<RuntimeEnvironment> environments = Environments(env ?? "prod");
            if (environments.Count != 1)
            {
                throw new UsageException("query reads one environment's index; give --env prod or --env tt02.");
            }

            QueryFormat format = (args.Flag("json"), args.Flag("tsv")) switch
            {
                (true, true) => throw new UsageException("Give --json or --tsv, not both."),
                (true, _) => QueryFormat.Json,
                (_, true) => QueryFormat.Tsv,
                _ => QueryFormat.Table,
            };
            args.RejectUnused();

            using SqliteConnection connection = database is null
                ? FleetStoreReader.OpenForQueries(store, environments[0])
                : FleetStoreReader.OpenFileForQueries(store, database);
            using SqliteCommand command = connection.CreateCommand();
            command.CommandText = sql;
            using SqliteDataReader reader = command.ExecuteReader();
            QueryOutput.Write(reader, format, output);
            return 0;
        }

        private static async Task<int> Rebuild(
            Arguments args,
            FleetStore store,
            TextWriter output,
            TextWriter error,
            FleetOptions fleetOptions,
            CancellationToken cancellationToken
        )
        {
            List<RuntimeEnvironment> environments = Environments(args.Value("env") ?? "prod");
            int parallelism = args.Int("parallel", Environment.ProcessorCount, 1, 64);
            args.RejectUnused();

            using HttpClient http = FleetHttp.CreateClient(FleetSync.Version);
            var sync = new FleetSync(store, http, new StudioctlCredentials(), fleetOptions);
            foreach (RuntimeEnvironment environment in environments)
            {
                var started = System.Diagnostics.Stopwatch.StartNew();
                int apps;
                using (var progress = new ConsoleProgress(error, interactive: !Console.IsErrorRedirected))
                {
                    apps = await sync.RebuildIndex(environment, parallelism, progress, cancellationToken);
                }

                output.WriteLine(
                    $"{environment.Name, -5} indexed {apps} apps   {SyncSummary.Duration(started.Elapsed)}"
                );
            }

            return 0;
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

        private static string Time(DateTimeOffset? time) => time is { } value ? FormatTime(value) : "unknown";

        private static string FormatTime(DateTimeOffset time)
        {
            TimeSpan age = DateTimeOffset.UtcNow - time;
            string ago =
                age.TotalMinutes < 1 ? "just now"
                : age.TotalHours < 1 ? $"{(int)age.TotalMinutes} min ago"
                : age.TotalDays < 1 ? $"{(int)age.TotalHours} h ago"
                : $"{(int)age.TotalDays} days ago";
            return $"{time.ToLocalTime():yyyy-MM-dd HH:mm} ({ago})";
        }
    }
}
