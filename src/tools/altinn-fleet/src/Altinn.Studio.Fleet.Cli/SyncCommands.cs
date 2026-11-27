using Altinn.Studio.Common.Domain;
using Altinn.Studio.Fleet.Http;
using Altinn.Studio.Fleet.Store;
using Altinn.Studio.Fleet.Sync;

namespace Altinn.Studio.Fleet.Cli;

/// <summary>The commands that change the store: <c>fleet sync</c> and <c>fleet index rebuild</c>.</summary>
internal static class SyncCommands
{
    public static async Task<int> Sync(
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
            Environments = Cli.Environments(args.Value("env") ?? "prod"),
            Orgs = Cli.Orgs(args.Value("org")),
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
        using (var progress = new ConsoleProgress(error, interactive: handler is null && !Console.IsErrorRedirected))
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

    public static async Task<int> RebuildIndex(
        Arguments args,
        FleetStore store,
        TextWriter output,
        TextWriter error,
        FleetOptions fleetOptions,
        CancellationToken cancellationToken
    )
    {
        List<RuntimeEnvironment> environments = Cli.Environments(args.Value("env") ?? "prod");
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

            output.WriteLine($"{environment.Name, -5} indexed {apps} apps   {SyncSummary.Duration(started.Elapsed)}");
        }

        return 0;
    }
}
