using System.Collections.Concurrent;
using System.Collections.Specialized;
using System.Diagnostics;
using Buildalyzer;
using Buildalyzer.IO;
using Buildalyzer.Workspaces;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.FindSymbols;

namespace Altinn.Analysis;

public sealed record AppRepository(DirectoryInfo Dir, string Org, string Name);

// TODO: Consider SoA if this approach works OK
public readonly record struct AppAnalysisResult
{
    private static readonly BitVector32.Section _timedOut = BitVector32.CreateSection(2);
    private static readonly BitVector32.Section _validProject = BitVector32.CreateSection(
        2,
        _timedOut
    );
    private static readonly BitVector32.Section _builds = BitVector32.CreateSection(
        2,
        _validProject
    );
    private static readonly BitVector32.Section _hasAppLib = BitVector32.CreateSection(2, _builds);
    private static readonly BitVector32.Section _hasLatestAppLib = BitVector32.CreateSection(
        2,
        _hasAppLib
    );

    private readonly BitVector32 _bits;

    public AppAnalysisResult(
        AppRepository repo,
        bool? timedOut = null,
        bool? validProject = null,
        bool? builds = null,
        bool? hasAppLib = null,
        bool? HasLatestAppLib = null,
        string? appLibVersion = null,
        uint? warningCount = null,
        Dictionary<string, List<ReferencedSymbol>>? symbolReferenceCounts = null
    )
    {
        AppRepository = repo;
        _bits = new BitVector32(0);
        _bits[_timedOut] = ToValue(timedOut);
        _bits[_validProject] = ToValue(validProject);
        _bits[_builds] = ToValue(builds);
        _bits[_hasAppLib] = ToValue(hasAppLib);
        _bits[_hasLatestAppLib] = ToValue(HasLatestAppLib);
        AppLibVersion = appLibVersion;
        WarningCount = warningCount;
        SymbolReferenceCountsBySymbol = symbolReferenceCounts ?? new();
    }

    public AppRepository AppRepository { get; }

    public readonly IReadOnlyDictionary<
        string,
        List<ReferencedSymbol>
    > SymbolReferenceCountsBySymbol { get; }

    public string? AppLibVersion { get; }

    public uint? WarningCount { get; }

    public readonly bool? TimedOut => FromValue(_timedOut);
    public readonly bool? ValidProject => FromValue(_validProject);
    public readonly bool? Builds => FromValue(_builds);
    public readonly bool? HasAppLib => FromValue(_hasAppLib);
    public readonly bool? HasLatestAppLib => FromValue(_hasLatestAppLib);

    public bool OK =>
        (_bits[_validProject] & _bits[_builds] & _bits[_hasAppLib] & _bits[_hasLatestAppLib]) == 1;

    private static int ToValue(bool? value) =>
        value switch
        {
            null => 2,
            false => 0,
            true => 1,
        };

    private bool? FromValue(BitVector32.Section section) =>
        _bits[section] switch
        {
            2 => default(bool?),
            0 => false,
            1 => true,
            var u => throw new Exception($"Unexpected value: {u}"),
        };
}

public sealed class AppAnalyzer : IDisposable
{
    private readonly SyncThreadPool _threadPool;

    public AppAnalyzer(int threadCount)
    {
        _threadPool = new SyncThreadPool(threadCount);
    }

    public async Task Analyze(
        AppRepository app,
        string[] findReferences,
        ConcurrentBag<AppAnalysisResult> results,
        CancellationToken cancellationToken
    )
    {
        var result = await _threadPool.RunAsync(
            async (CancellationToken cancellationToken) =>
            {
                var manager = new AnalyzerManager();
                var dir = app.Dir;
                var projectFile = Path.Combine(dir.FullName, "App", "App.csproj");

                if (!File.Exists(projectFile))
                    return new AppAnalysisResult(app, timedOut: false, validProject: false);

                IAnalyzerResults buildResults;
                IProjectAnalyzer? project;
                try
                {
                    var path = IOPath.Parse(projectFile);
                    project = manager.GetProject(path);
                    cancellationToken.ThrowIfCancellationRequested();

                    Debug.Assert(project is not null);
                    buildResults = project.Build();
                    cancellationToken.ThrowIfCancellationRequested();
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    return new AppAnalysisResult(app, timedOut: false, validProject: false);
                }

                var builds = buildResults.OverallSuccess;
                var result = buildResults.FirstOrDefault(r => r.Succeeded);
                if (result is null)
                    return new AppAnalysisResult(
                        app,
                        timedOut: false,
                        validProject: true,
                        builds: builds
                    );

                var appLibRef = result.PackageReferences.FirstOrDefault(r =>
                    // Main
                    r.Key == "Altinn.App.Api"
                    // PR releases
                    || r.Key == "Altinn.App.Api.Experimental"
                    // <=6.0
                    || r.Key == "Altinn.App.Common"
                );
                string? version = null;
                var hasAppLib =
                    appLibRef.Key is not null
                    && appLibRef.Value.TryGetValue("Version", out version);
                var HasLatestAppLib = version is not null && version.StartsWith('8');
                if (!builds || !hasAppLib || !HasLatestAppLib)
                    return new AppAnalysisResult(
                        app,
                        timedOut: false,
                        validProject: true,
                        builds: builds,
                        hasAppLib: hasAppLib,
                        HasLatestAppLib: HasLatestAppLib,
                        appLibVersion: version
                    );

                using var workspace = new AdhocWorkspace();
                // workspace.WorkspaceFailed += (sender, args) => logger?.LogError("Workspace failed: {Diagnostic}{NewLine}", args.Diagnostic, System.Environment.NewLine);
                Project roslynProject;
                Compilation? compilation;
                try
                {
                    result.AddToWorkspace(workspace, addProjectReferences: true);
                    roslynProject = workspace.CurrentSolution.Projects.First();
                    compilation = await roslynProject.GetCompilationAsync(cancellationToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    return new AppAnalysisResult(
                        app,
                        timedOut: false,
                        validProject: true,
                        builds: false,
                        hasAppLib: hasAppLib,
                        HasLatestAppLib: HasLatestAppLib,
                        appLibVersion: version
                    );
                }

                if (compilation is null)
                    return new AppAnalysisResult(
                        app,
                        timedOut: false,
                        validProject: true,
                        builds: false,
                        hasAppLib: hasAppLib,
                        HasLatestAppLib: HasLatestAppLib,
                        appLibVersion: version
                    );

                var diagnostics = compilation.GetDiagnostics(cancellationToken);
                var warningCount = (uint)
                    diagnostics.Count(d =>
                        d.Id != "CS1701" && d.Severity == DiagnosticSeverity.Warning
                    );
                builds =
                    builds
                    && !diagnostics.Any(d =>
                        d.Severity >= DiagnosticSeverity.Error && !d.IsSuppressed
                    );
                if (!builds)
                    return new AppAnalysisResult(
                        app,
                        timedOut: false,
                        validProject: true,
                        builds: builds,
                        hasAppLib: hasAppLib,
                        HasLatestAppLib: HasLatestAppLib,
                        appLibVersion: version,
                        warningCount: warningCount
                    );

                var referenceCounts = new Dictionary<string, List<ReferencedSymbol>>(16);
                await PopulateReferenceCounts(
                    findReferences,
                    roslynProject,
                    compilation,
                    referenceCounts,
                    cancellationToken
                );

                return new AppAnalysisResult(
                    app,
                    timedOut: false,
                    validProject: true,
                    builds: builds,
                    hasAppLib: hasAppLib,
                    HasLatestAppLib: HasLatestAppLib,
                    appLibVersion: version,
                    warningCount: warningCount,
                    symbolReferenceCounts: referenceCounts
                );
            },
            cancellationToken
        );
        results.Add(result);
    }

    private static async Task PopulateReferenceCounts(
        string[] findReferences,
        Project roslynProject,
        Compilation compilation,
        Dictionary<string, List<ReferencedSymbol>> referenceCounts,
        CancellationToken cancellationToken
    )
    {
        foreach (var symbolRef in findReferences)
        {
            if (!referenceCounts.TryGetValue(symbolRef, out var symbolRefs))
                referenceCounts[symbolRef] = symbolRefs = new List<ReferencedSymbol>(16);

            var symbols = DocumentationCommentId.GetSymbolsForDeclarationId(symbolRef, compilation);
            foreach (var symbol in symbols)
            {
                var references = await SymbolFinder.FindReferencesAsync(
                    symbol,
                    roslynProject.Solution,
                    cancellationToken
                );

                foreach (var reference in references)
                {
                    // Filter out references to the symbol itself
                    // (sometimes we get both the interface method and the implementation method)
                    if (!SymbolEqualityComparer.Default.Equals(reference.Definition, symbol))
                        continue;

                    foreach (var location in reference.Locations)
                        symbolRefs.Add(reference);
                }
            }
        }
    }

    public void Dispose()
    {
        _threadPool.Dispose();
    }
}
