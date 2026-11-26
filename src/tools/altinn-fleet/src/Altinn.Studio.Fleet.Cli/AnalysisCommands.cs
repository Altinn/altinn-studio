using System.Reflection;
using Altinn.Studio.Fleet.Analysis;
using Altinn.Studio.Fleet.Cli.Analysis.ApiUsage;
using Altinn.Studio.Fleet.Store;

namespace Altinn.Studio.Fleet.Cli;

/// <summary>The <c>fleet analysis</c> commands.</summary>
internal static class AnalysisCommands
{
    public const string DefaultOut = "analysis.sqlite";

    /// <summary>The analyses that <c>fleet analysis run</c> runs when it is given no names.</summary>
    public static IReadOnlyList<IAppAnalysis> All { get; } = [new ApiUsageAnalysis()];

    /// <summary><c>fleet analysis run [NAMES]</c>.</summary>
    public static async Task<int> Run(
        Arguments args,
        string? names,
        FleetStore store,
        TextWriter output,
        TextWriter error,
        IAnalysisExecutor? executor,
        CancellationToken cancellationToken
    )
    {
        List<IAppAnalysis> analyses = names is null
            ? [.. All]
            :
            [
                .. names
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Distinct(StringComparer.Ordinal)
                    .Select(Find),
            ];
        var options = new AnalysisOptions
        {
            Environments = Cli.Environments(args.Value("env") ?? "prod"),
            Orgs = Cli.Orgs(args.Value("org")),
            Parallelism = args.Int("parallel", 4, 1, 64),
            Force = args.Flag("force"),
        };
        TimeSpan timeout = TimeSpan.FromSeconds(args.Int("timeout", 900, 10, 24 * 3600));
        string outPath = OutPath(args, store);
        args.RejectUnused();

        executor ??= new ChildProcessExecutor(SelfCommand(), timeout);
        using AnalysisDatabase database = AnalysisDatabase.Open(outPath);
        var runner = new AnalysisRunner(store, database, analyses, executor);
        DateTimeOffset startedAt = DateTimeOffset.UtcNow;
        List<AnalysisRunResult> results;
        using (var progress = new ConsoleProgress(error, interactive: !Console.IsErrorRedirected))
        {
            try
            {
                results = await runner.Run(options, progress, cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                progress.Dispose();
                error.WriteLine(
                    $"fleet: interrupted. The apps analyzed so far are in {outPath}; run the command again to finish."
                );
                return 130;
            }
        }

        string duration = SyncSummary.Duration(DateTimeOffset.UtcNow - startedAt);
        foreach (AnalysisRunResult result in results)
        {
            output.WriteLine(
                $"{result.Environment.Name, -5} {result.Analysis}  {result.Apps} apps · {result.Analyzed} analyzed · "
                    + $"{result.Unchanged} unchanged · {result.Removed} removed · {result.Failed} failed   {duration}"
            );
        }

        output.WriteLine($"Wrote {Path.GetFullPath(outPath)}. Query it with `fleet query --db {outPath} \"...\"`.");
        return 0;
    }

    /// <summary>
    /// <c>fleet analysis run-app NAME APP_DIR RESULT_FILE</c>, which <see cref="ChildProcessExecutor"/> runs for each
    /// app in a process of its own.
    /// </summary>
    public static async Task<int> RunApp(
        string name,
        string appDir,
        string resultFile,
        TextWriter error,
        CancellationToken cancellationToken
    )
    {
        IAppAnalysis analysis = Find(name);
        try
        {
            await analysis.Analyze(appDir, resultFile, cancellationToken);
            return 0;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // Whatever an app's analysis throws is a fact about the app. The parent records what this writes.
            error.WriteLine(ex.ToString());
            return 1;
        }
    }

    /// <summary>The file to write, from <c>--out</c>, which must not be in the store.</summary>
    public static string OutPath(Arguments args, FleetStore store)
    {
        string outPath = args.Value("out") ?? DefaultOut;
        string relative = Path.GetRelativePath(Path.GetFullPath(store.Root), Path.GetFullPath(outPath));
        if (
            relative != ".."
            && !relative.StartsWith(".." + Path.DirectorySeparatorChar, StringComparison.Ordinal)
            && !Path.IsPathRooted(relative)
        )
        {
            throw new UsageException(
                $"--out {outPath} is in the store, which fleet analysis does not change. Give a path outside {store.Root}."
            );
        }

        return outPath;
    }

    public static IAppAnalysis Find(string name) =>
        All.FirstOrDefault(a => a.Name == name)
        ?? throw new UsageException(
            $"There is no analysis named '{name}'. The analyses are {string.Join(", ", All.Select(a => a.Name))}."
        );

    /// <summary>How to run <c>fleet analysis run-app</c> with the program that runs now.</summary>
    private static List<string> SelfCommand()
    {
        string program = Environment.ProcessPath ?? throw new FleetException("Cannot tell which program runs fleet.");
        List<string> command = [program];
        // Run as `dotnet fleet.dll`, the program is the host and the tool is its first argument.
        if (Path.GetFileNameWithoutExtension(program) == "dotnet")
        {
            command.Add(
                Assembly.GetEntryAssembly()?.Location
                    ?? throw new FleetException("Cannot tell which assembly runs fleet.")
            );
        }

        command.AddRange(["analysis", "run-app"]);
        return command;
    }
}
