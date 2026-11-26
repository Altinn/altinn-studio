using System.Runtime.CompilerServices;
using Altinn.Studio.Fleet.Analysis;
using Altinn.Studio.Fleet.Store;

namespace Altinn.Studio.Fleet.Cli.Analysis.ApiUsage;

/// <summary>The commands of the api-usage analysis besides <c>fleet analysis run</c>.</summary>
/// <remarks>
/// MSBuild has to be registered before a method that uses its types is compiled, so a command registers it and then
/// calls a method that is not inlined.
/// </remarks>
internal static class ApiUsageCommands
{
    /// <summary><c>fleet analysis api-usage surface LABEL</c>.</summary>
    public static async Task<int> Surface(
        Arguments args,
        FleetStore store,
        ApiUsageAnalysis analysis,
        string label,
        TextWriter output,
        CancellationToken cancellationToken
    )
    {
        string? source = args.Value("source");
        string? version = args.Value("version");
        string outPath = AnalysisCommands.OutPath(args, store);
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

        Dotnet.PrepareProcess();
        MSBuildSetup.EnsureRegistered();
        int count = await WriteSurface(analysis, label, projects, version, outPath, cancellationToken);
        output.WriteLine($"Wrote {count} types and members of {label} to {Path.GetFullPath(outPath)}.");
        return 0;
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static async Task<int> WriteSurface(
        ApiUsageAnalysis analysis,
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
        using AnalysisDatabase database = AnalysisDatabase.Open(outPath);
        database.Change(
            analysis,
            (connection, transaction) => ApiUsageAnalysis.PutSurface(connection, transaction, label, entries)
        );
        return entries.Count(e => e.Visible);
    }
}
