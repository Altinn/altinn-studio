using System.Diagnostics;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text.Json;
using Altinn.Studio.Common.Domain;
using Altinn.Studio.Fleet.ApiUsage;
using Altinn.Studio.Fleet.Store;

namespace Altinn.Studio.Fleet.Cli;

/// <summary>The <c>fleet api-usage</c> commands.</summary>
/// <remarks>
/// MSBuild has to be registered before a method that uses its types is compiled, so each command registers it and
/// then calls a method that is not inlined.
/// </remarks>
internal static class ApiUsageCommands
{
    public const string DefaultOut = "api-usage.sqlite";

    public static async Task<int> Collect(
        Arguments args,
        FleetStore store,
        TextWriter output,
        TextWriter error,
        IAppAnalyzer? analyzer,
        CancellationToken cancellationToken
    )
    {
        var options = new CollectOptions
        {
            Environments = Cli.Environments(args.Value("env") ?? "prod"),
            Orgs = Cli.Orgs(args.Value("org")),
            Parallelism = args.Int("parallel", 4, 1, 64),
            Force = args.Flag("force"),
        };
        TimeSpan timeout = TimeSpan.FromSeconds(args.Int("timeout", 900, 10, 24 * 3600));
        string outPath = args.Value("out") ?? DefaultOut;
        args.RejectUnused();

        analyzer ??= new ChildProcessAnalyzer(SelfCommand(), timeout);
        using UsageDatabase database = UsageDatabase.Open(outPath);
        var collection = new ApiUsageCollection(store, database, analyzer);
        DateTimeOffset startedAt = DateTimeOffset.UtcNow;
        List<CollectResult> results;
        using (var progress = new ConsoleProgress(error, interactive: !Console.IsErrorRedirected))
        {
            try
            {
                results = await collection.Collect(options, progress, cancellationToken);
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

        foreach (CollectResult result in results)
        {
            output.WriteLine(
                $"{result.Environment.Name, -5} {result.Apps} apps · {result.Analyzed} analyzed · "
                    + $"{result.Unchanged} unchanged · {result.Removed} removed · {result.Failed} failed   "
                    + SyncSummary.Duration(DateTimeOffset.UtcNow - startedAt)
            );
        }

        output.WriteLine($"Wrote {Path.GetFullPath(outPath)}. Query it with `fleet query --db {outPath} \"...\"`.");
        return 0;
    }

    public static async Task<int> Surface(
        Arguments args,
        string label,
        TextWriter output,
        CancellationToken cancellationToken
    )
    {
        string? source = args.Value("source");
        string? version = args.Value("version");
        string outPath = args.Value("out") ?? DefaultOut;
        args.RejectUnused();
        List<string> projects = source is null
            ? []
            : [.. source.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)];
        if ((projects.Count == 0) == (version is null))
        {
            throw new UsageException("api-usage surface reads --source PROJECTS or --version VERSION, one of them.");
        }

        if (projects.FirstOrDefault(p => !File.Exists(p)) is { } missing)
        {
            throw new UsageException($"--source names {missing}, which is not a file.");
        }

        MSBuildSetup.EnsureRegistered();
        int count = await WriteSurface(label, projects, version, outPath, cancellationToken);
        output.WriteLine($"Wrote {count} types and members of {label} to {Path.GetFullPath(outPath)}.");
        return 0;
    }

    /// <summary>Analyzes one app folder and writes the result to a file, for <see cref="ChildProcessAnalyzer"/>.</summary>
    public static async Task<int> CollectApp(string appDir, string resultFile, CancellationToken cancellationToken)
    {
        MSBuildSetup.EnsureRegistered();
        AppUsage usage;
        try
        {
            usage = await AnalyzeApp(appDir, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // Whatever an app's build throws is a fact about the app, which the result records.
            usage = AppUsage.Failed(ex.ToString(), 0);
        }

        await using FileStream stream = File.Create(resultFile);
        await JsonSerializer.SerializeAsync(stream, usage, ApiUsageJsonContext.Default.AppUsage, cancellationToken);
        return 0;
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static Task<AppUsage> AnalyzeApp(string appDir, CancellationToken cancellationToken) =>
        AppCollector.Collect(appDir, cancellationToken);

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static async Task<int> WriteSurface(
        string label,
        List<string> projects,
        string? version,
        string outPath,
        CancellationToken cancellationToken
    )
    {
        List<SurfaceEntry> entries = version is null
            ? await SurfaceReader.Read(projects, fromReferences: false, Environment.CurrentDirectory, cancellationToken)
            : await SurfaceReader.ReadPublished(version, cancellationToken);
        using UsageDatabase database = UsageDatabase.Open(outPath);
        database.PutSurface(label, entries);
        return entries.Count(e => e.Visible);
    }

    /// <summary>How to run <c>fleet api-usage collect-app</c> with the program that runs now.</summary>
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

        command.AddRange(["api-usage", "collect-app"]);
        return command;
    }
}
