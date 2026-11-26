using System.Reflection;
using Altinn.Studio.Fleet.Analysis;
using Altinn.Studio.Fleet.Analysis.ApiUsage;
using Altinn.Studio.Fleet.Store;

namespace Altinn.Studio.Fleet.Cli;

/// <summary>The <c>fleet analysis</c> commands.</summary>
internal static class AnalysisCommands
{
    public const string DefaultOut = "analysis.sqlite";

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
            ? [.. Analyses.All]
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
        if (args.Value("source") is { } source)
        {
            int apiUsage = analyses.FindIndex(a => a is ApiUsageAnalysis);
            if (apiUsage < 0)
            {
                throw new UsageException("--source is for the api-usage analysis, which this run does not include.");
            }

            analyses[apiUsage] = new ApiUsageAnalysis
            {
                Source =
                    LibrarySource.Find(source)
                    ?? throw new UsageException(
                        $"--source {source} has no Altinn.App.Api project. Give a checkout of altinn-studio or app-lib-dotnet."
                    ),
            };
        }

        string outPath = OutPath(args, store);
        args.RejectUnused();

        executor ??= new ChildProcessExecutor(SelfCommand(), timeout);
        using AnalysisDatabase database = AnalysisDatabase.Open(outPath);
        var runner = new AnalysisRunner(store, database, analyses, executor);
        DateTimeOffset startedAt = DateTimeOffset.UtcNow;
        AnalysisReport report;
        using (var progress = new ConsoleProgress(error, interactive: !Console.IsErrorRedirected))
        {
            try
            {
                report = await runner.Run(options, progress, cancellationToken);
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
        foreach (AnalysisRunResult result in report.Results)
        {
            output.WriteLine(
                $"{result.Environment.Name, -5} {result.Analysis}  {result.Apps} apps · {result.Analyzed} analyzed · "
                    + $"{result.Unchanged} unchanged · {result.Removed} removed · {result.Failed} failed"
            );
        }

        foreach (AnalysisItemsResult items in report.Items)
        {
            output.WriteLine(
                $"{items.Analysis}  {items.Items} {items.ItemsName} · {items.Analyzed} analyzed · "
                    + $"{items.Unchanged} unchanged · {items.Removed} removed · {items.Failed} failed"
            );
        }

        output.WriteLine($"Took {duration}.");

        output.WriteLine($"Wrote {Path.GetFullPath(outPath)}. Query it with `fleet query --db {outPath} \"...\"`.");

        // A failed app is a fact about the app, but a failed item leaves what the apps are compared with incomplete.
        List<AnalysisItemsResult> failed = [.. report.Items.Where(items => items.Failed > 0)];
        foreach (AnalysisItemsResult items in failed)
        {
            error.WriteLine(
                $"fleet: {items.Analysis} could not analyze {items.Failed} of its {items.ItemsName}. Its tables in "
                    + $"{outPath} say why."
            );
        }

        return failed.Count > 0 ? 1 : 0;
    }

    /// <summary>
    /// The file to write, from <c>--out</c>, which must not be in the store. It is the path with its links resolved,
    /// so that a link cannot lead into the store and two runs through different links lock the same file.
    /// </summary>
    public static string OutPath(Arguments args, FleetStore store)
    {
        string outPath = args.Value("out") ?? DefaultOut;
        string resolved = ResolveLinks(outPath);
        string relative = Path.GetRelativePath(ResolveLinks(store.Root), resolved);
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

        return resolved;
    }

    /// <summary>How many links <see cref="ResolveLinks"/> follows within one another, as Linux does.</summary>
    private const int MaxLinks = 40;

    /// <summary>
    /// The absolute path that a path leads to, with each link in it replaced by where it leads. A <c>..</c> after a
    /// link goes to the parent of where the link leads, as the file system does. The parts that do not exist are kept.
    /// </summary>
    internal static string ResolveLinks(string path) => ResolveLinks(path, Environment.CurrentDirectory, 0);

    private static string ResolveLinks(string path, string from, int depth)
    {
        string absolute = Path.IsPathFullyQualified(path) ? path : Path.Join(from, path);
        string root = Path.GetPathRoot(absolute) ?? throw new UsageException($"{path} is not a path.");
        string current = Path.GetFullPath(root);
        string[] parts = absolute[root.Length..]
            .Split(
                [Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar],
                StringSplitOptions.RemoveEmptyEntries
            );
        foreach (string part in parts)
        {
            if (part == ".")
            {
                continue;
            }

            if (part == "..")
            {
                current = Path.GetDirectoryName(current) ?? current;
                continue;
            }

            string next = Path.Join(current, part);
            if (new FileInfo(next).LinkTarget is { } target)
            {
                if (depth >= MaxLinks)
                {
                    throw new UsageException($"{path} leads through more than {MaxLinks} links.");
                }

                next = ResolveLinks(target, current, depth + 1);
            }

            current = next;
        }

        return current;
    }

    private static IAppAnalysis Find(string name) =>
        Analyses.Find(name)
        ?? throw new UsageException(
            $"There is no analysis named '{name}'. The analyses are {string.Join(", ", Analyses.All.Select(a => a.Name))}."
        );

    /// <summary>How to run <c>fleet analysis job</c> with the program that runs now.</summary>
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

        command.AddRange(["analysis", "job"]);
        return command;
    }
}
