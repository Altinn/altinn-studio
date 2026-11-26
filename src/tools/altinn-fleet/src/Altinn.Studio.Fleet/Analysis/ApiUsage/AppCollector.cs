using System.Collections.Immutable;
using Altinn.Studio.Common.Domain.App;
using Altinn.Studio.Fleet.Store;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.MSBuild;

namespace Altinn.Studio.Fleet.Analysis.ApiUsage;

/// <summary>
/// Restores and compiles one app against the app library version it references, and records the app library symbols
/// its code binds to and what its third-party packages reference.
/// </summary>
/// <remarks>
/// It changes the app's folder (<c>obj</c>, <c>bin</c>), so it runs on a copy. MSBuild must be registered with
/// <see cref="MSBuildSetup.EnsureRegistered"/> before it is called.
/// </remarks>
internal static class AppCollector
{
    private const int SampleErrorCount = 10;

    public static async Task<AppUsage> Collect(string appDir, CancellationToken cancellationToken)
    {
        appDir = Path.GetFullPath(appDir);
        AppDescription description = Describe(appDir, cancellationToken);
        if (description.AppProject is not { Path: { } appProjectPath })
        {
            return AppUsage.Failed("The repository does not show which of its projects is the app's.");
        }

        string projectFile = FullPath(appDir, appProjectPath);
        string project = appProjectPath.Value;
        string? restoreError = await Dotnet.Restore(projectFile, cancellationToken);
        using var workspace = MSBuildWorkspace.Create(Dotnet.BuildProperties());
        var loadFailures = new List<string>();
        workspace.RegisterWorkspaceFailedHandler(args =>
        {
            if (args.Diagnostic.Kind == WorkspaceDiagnosticKind.Failure)
            {
                loadFailures.Add(args.Diagnostic.Message);
            }
        });

        Project appProject = await workspace.OpenProjectAsync(projectFile, cancellationToken: cancellationToken);
        var uses = new UseCollector(appDir);
        var errors = new List<Diagnostic>();
        var references = new List<AssemblyIdentity>();
        var libraryFiles = new List<(string Assembly, string File)>();

        // The app project, and the app's own library projects that it references: some apps reach the app library
        // only through those.
        IEnumerable<Project> appProjects = appProject
            .Solution.GetProjectDependencyGraph()
            .GetProjectsThatThisProjectTransitivelyDependsOn(appProject.Id)
            .Select(id => appProject.Solution.GetProject(id))
            .OfType<Project>()
            .Where(p => p.FilePath is { } path && IsUnder(path, appDir))
            .Prepend(appProject);
        foreach (Project current in appProjects)
        {
            Compilation? compilation = await current.GetCompilationAsync(cancellationToken);
            if (compilation is null)
            {
                continue;
            }

            references.AddRange(compilation.ReferencedAssemblyNames);
            if (current.Id == appProject.Id)
            {
                libraryFiles.AddRange(LibraryFiles(compilation));
            }

            errors.AddRange(
                compilation.GetDiagnostics(cancellationToken).Where(d => d.Severity == DiagnosticSeverity.Error)
            );
            // A generator that throws on the app's own code throws in the app's own build too, so the app runs
            // without what it would write. That is noted, not a failure: the analysis sees what the app has, and
            // running it again finds the same. An error a generator reports fails the build, as a compile error does.
            ImmutableArray<Diagnostic> generated = await Generators.Run(current, compilation, cancellationToken);
            if (generated.FirstOrDefault(Generators.Threw) is { } threw)
            {
                loadFailures.Add(
                    $"{Relative(appDir, current.FilePath ?? projectFile)}: a source generator failed, so the code it "
                        + $"would write is missing, as in the app's own build: {threw.ToString().Split('\n')[0].Trim()}"
                );
            }

            errors.AddRange(generated.Where(d => !Generators.Threw(d) && d.Severity == DiagnosticSeverity.Error));

            // An app may build the app library from its own source. What that source uses of itself is not a use.
            if (AltinnAppPackage.IsLibraryAssembly(compilation.AssemblyName))
            {
                continue;
            }

            HashSet<string> documents = DocumentPaths(current);
            await uses.Walk(
                compilation,
                tree => documents.Contains(tree.FilePath) ? UseSources.App : UseSources.Generated,
                cancellationToken
            );
        }

        // Test projects are a weaker signal: making a type internal breaks the app's tests, not the app.
        var testProjects = new List<string>();
        foreach (string testProjectFile in TestProjects(description).Select(path => FullPath(appDir, path)))
        {
            string relative = Relative(appDir, testProjectFile);
            if (await Dotnet.Restore(testProjectFile, cancellationToken) is not null)
            {
                loadFailures.Add($"{relative}: restore failed");
                continue;
            }

            try
            {
                Project testProject =
                    workspace.CurrentSolution.Projects.FirstOrDefault(p => p.FilePath == testProjectFile)
                    ?? await workspace.OpenProjectAsync(testProjectFile, cancellationToken: cancellationToken);
                if (await testProject.GetCompilationAsync(cancellationToken) is { } compilation)
                {
                    loadFailures.AddRange(
                        TestProjectNotes(
                            relative,
                            compilation.GetDiagnostics(cancellationToken),
                            await Generators.Run(testProject, compilation, cancellationToken)
                        )
                    );

                    HashSet<string> documents = DocumentPaths(testProject);
                    await uses.Walk(
                        compilation,
                        tree => documents.Contains(tree.FilePath) ? UseSources.Test : null,
                        cancellationToken
                    );
                    testProjects.Add(relative);
                }
            }
            catch (InvalidOperationException ex)
            {
                loadFailures.Add($"{relative}: {ex.Message}");
            }
        }

        bool referencesLibrary = references.Any(a => LibrarySymbols.IsLibraryAssembly(a.Name));
        string? assetsFile = AssetsFile(appProject.CompilationOutputInfo.AssemblyPath, projectFile, appDir);
        using ProjectAssets? assets = assetsFile is null ? null : ProjectAssets.ReadFile(assetsFile);
        List<SymbolUse> found = uses.ToList();
        AltinnAppPackage? libraryPackage = assets is null ? null : CompiledLibraryPackage(assets, libraryFiles);
        if (
            assets is not null
            && libraryPackage is not null
            && MixedLibraryNote(assets, libraryPackage, libraryFiles, found) is { } mixed
        )
        {
            loadFailures.Add($"{project}: {mixed}");
        }

        // Uses in code that does not compile are missing. So a run with errors is a failure, with the uses that were
        // found, and the next run tries the app again. A restore that failed for a moment, such as a feed that did not
        // answer, is one too, even when what it left compiles.
        string? failure =
            !referencesLibrary ? "The app does not compile against the app library."
            // A restore that worked for a project with packages wrote their assets, so not finding them would record
            // the app without its library version and packages, as though it had none.
            : assets is null
            && restoreError is null
            && description.AppProject is ProjectDescription.WellFormed { PackageReferences.Count: > 0 }
                ? "The restore's project.assets.json was not found, so the app's library version and packages are not "
                    + "known."
            : errors.Count > 0
                ? $"The app has {errors.Count} compile errors{(restoreError is null ? "" : " after a failed restore")}, "
                    + "so uses in the code that does not compile are missing."
            : restoreError is not null ? "The restore failed, so the app may have compiled against other packages."
            : null;
        return new AppUsage(
            project,
            libraryPackage?.Name,
            libraryPackage?.Version,
            failure,
            restoreError,
            loadFailures,
            errors.Count,
            [.. errors.Take(SampleErrorCount).Select(e => e.ToString())],
            testProjects,
            found,
            assets is null ? [] : BinaryReferences.Scan(assets)
        );
    }

    /// <summary>
    /// The assets file that the restore wrote for a project, beside its intermediate output: in <c>obj</c>, or where
    /// the project moves it with <c>BaseIntermediateOutputPath</c>. It is in a folder above the intermediate
    /// assembly, which is nested by configuration, target framework and runtime, within the app's folder. <c>null</c>
    /// when there is none.
    /// </summary>
    /// <param name="intermediateAssembly">The assembly the compilation writes, before it is copied out.</param>
    /// <param name="projectFile">The project.</param>
    /// <param name="appDir">The app's folder, which the search stays within.</param>
    internal static string? AssetsFile(string? intermediateAssembly, string projectFile, string appDir)
    {
        string root = Path.GetFullPath(appDir);
        for (
            string? folder = intermediateAssembly is null
                ? null
                : Path.GetDirectoryName(Path.GetFullPath(intermediateAssembly));
            folder is not null && (folder == root || IsUnder(folder, root));
            folder = Path.GetDirectoryName(folder)
        )
        {
            string candidate = Path.Join(folder, ProjectAssets.FileName);
            if (File.Exists(candidate))
            {
                return candidate;
            }
        }

        string conventional = Path.Join(Path.GetDirectoryName(projectFile) ?? root, "obj", ProjectAssets.FileName);
        return File.Exists(conventional) ? conventional : null;
    }

    /// <summary>
    /// The version of the app library that a project ships with: the package of the first of
    /// <see cref="AltinnAppPackage.LibraryPackageNames"/> whose assembly its compilation references from one of
    /// <see cref="AltinnAppPackage.PackageNames"/>, which is <c>Altinn.App.Api</c>, or <c>Altinn.App.Core</c> without
    /// it. A restore can resolve several, such as a published <c>Altinn.App.Core</c> that a package depends on beside
    /// a build of a pull request, but MSBuild compiles against one of the assemblies of a name and copies that one to
    /// the build's output. <c>null</c> when none comes from a package, such as with a project reference to the app
    /// library's source.
    /// </summary>
    /// <param name="assets">The project's restored packages.</param>
    /// <param name="libraryFiles">The app library assemblies the compilation references, and their files.</param>
    internal static AltinnAppPackage? CompiledLibraryPackage(
        ProjectAssets assets,
        IReadOnlyList<(string Assembly, string File)> libraryFiles
    )
    {
        foreach (string name in AltinnAppPackage.LibraryPackageNames)
        {
            foreach ((string assembly, string file) in libraryFiles)
            {
                if (
                    assembly == name
                    && assets.PackageOf(file) is { } package
                    && AltinnAppPackage.TryParse(
                        new PackageReference(package.Name, package.Version),
                        out AltinnAppPackage? library
                    )
                )
                {
                    return library;
                }
            }
        }

        return null;
    }

    /// <summary>
    /// Says when a project's code uses app library assemblies that it compiles against from a package of another
    /// version than <paramref name="libraryPackage"/>, such as <c>Altinn.App.PlatformServices</c> 6.0.2 that a
    /// package depends on, beside v8. The app then ships with two versions, and those uses are compared with the API of
    /// the one its library version names. <c>null</c> when it uses none, or when every assembly comes from that
    /// version.
    /// </summary>
    /// <param name="assets">The project's restored packages.</param>
    /// <param name="libraryPackage">The package the project's library version is taken from.</param>
    /// <param name="libraryFiles">The app library assemblies the compilation references, and their files.</param>
    /// <param name="uses">The uses found, of which those in tests do not count.</param>
    internal static string? MixedLibraryNote(
        ProjectAssets assets,
        AltinnAppPackage libraryPackage,
        IEnumerable<(string Assembly, string File)> libraryFiles,
        IEnumerable<SymbolUse> uses
    )
    {
        Dictionary<string, int> symbols = uses.Where(u => u.Source != UseSources.Test)
            .GroupBy(u => u.Assembly, StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.Select(u => u.Symbol).Distinct(StringComparer.Ordinal).Count());
        List<string> others =
        [
            .. libraryFiles
                .Select(f => (f.Assembly, Package: assets.PackageOf(f.File)))
                .Where(f =>
                    f.Package is { } package
                    && symbols.ContainsKey(f.Assembly)
                    && (
                        !package.Version.Equals(libraryPackage.Version, StringComparison.OrdinalIgnoreCase)
                        || package.Name.EndsWith(
                            AltinnAppPackage.ExperimentalSuffix,
                            StringComparison.OrdinalIgnoreCase
                        ) != libraryPackage.IsExperimental
                    )
                )
                .OrderBy(f => f.Assembly, StringComparer.Ordinal)
                .Select(f =>
                    $"{symbols[f.Assembly]} {(symbols[f.Assembly] == 1 ? "symbol" : "symbols")} of {f.Assembly} "
                    + f.Package!.Version
                ),
        ];
        return others.Count == 0
            ? null
            : $"its code uses {string.Join(", ", others)}, which it ships with beside {libraryPackage.Name} "
                + $"{libraryPackage.Version}, so those uses are compared with {libraryPackage.Version}'s API";
    }

    // The app library assemblies a compilation references, with their files.
    private static IEnumerable<(string Assembly, string File)> LibraryFiles(Compilation compilation) =>
        compilation
            .References.OfType<PortableExecutableReference>()
            .Select(reference =>
                (
                    Assembly: (compilation.GetAssemblyOrModuleSymbol(reference) as IAssemblySymbol)?.Name,
                    reference.FilePath
                )
            )
            .Where(r => r.FilePath is not null && LibrarySymbols.IsLibraryAssembly(r.Assembly))
            .Select(r => (r.Assembly!, r.FilePath!));

    /// <summary>
    /// What to note about a test project that does not compile, or whose source generators fail. That is noted, not a
    /// failure: tests are the weaker signal, and an app with stale tests would otherwise be analyzed again on every
    /// run.
    /// </summary>
    /// <param name="project">The test project, relative to the app's folder.</param>
    /// <param name="compiled">What its compilation reports.</param>
    /// <param name="generated">What its source generators report.</param>
    internal static List<string> TestProjectNotes(
        string project,
        IEnumerable<Diagnostic> compiled,
        IEnumerable<Diagnostic> generated
    )
    {
        var notes = new List<string>();
        int errors =
            compiled.Count(d => d.Severity == DiagnosticSeverity.Error)
            + generated.Count(d => !Generators.Threw(d) && d.Severity == DiagnosticSeverity.Error);
        if (errors > 0)
        {
            notes.Add($"{project}: {errors} compile errors, so some of its uses are missing");
        }

        if (generated.FirstOrDefault(Generators.Threw) is { } threw)
        {
            notes.Add(
                $"{project}: a source generator failed, so the code it would write is missing: "
                    + threw.ToString().Split('\n')[0].Trim()
            );
        }

        return notes;
    }

    /// <summary>
    /// What the app's files say about it, as the store's index reads it, such as which project is the app's: see
    /// <see cref="AppDescription.AppProject"/>.
    /// </summary>
    internal static AppDescription Describe(string appDir, CancellationToken cancellationToken)
    {
        var reader = new AppDescriptionReader();
        using var folder = new AppFolder();
        folder.Scan(appDir, reader, cancellationToken);
        return reader.Build();
    }

    /// <summary>
    /// The app's test projects: those that use <c>Microsoft.NET.Test.Sdk</c> and reference an Altinn.App package or
    /// the app's project.
    /// </summary>
    internal static IEnumerable<AppFilePath> TestProjects(AppDescription description)
    {
        if (description.AppProject is not { Path: { } app })
        {
            return [];
        }

        return description
            .Projects.OfType<ProjectDescription.WellFormed>()
            .Where(p => p.Path != app && References(p, "Microsoft.NET.Test.Sdk"))
            .Where(p =>
                p.PackageReferences.Any(r => r.Name.StartsWith("Altinn.App.", StringComparison.OrdinalIgnoreCase))
                || p.ProjectReferences.Any(r => r.Is(app.Value))
            )
            .Select(p => p.Path);
    }

    private static bool References(ProjectDescription.WellFormed project, string package) =>
        project.PackageReferences.Any(r => r.Name.Equals(package, StringComparison.OrdinalIgnoreCase));

    private static string FullPath(string appDir, AppFilePath path) => Path.GetFullPath(Path.Join(appDir, path.Value));

    private static HashSet<string> DocumentPaths(Project project) =>
        project.Documents.Select(d => d.FilePath).OfType<string>().ToHashSet(StringComparer.Ordinal);

    private static bool IsUnder(string path, string folder) =>
        path.StartsWith(folder + Path.DirectorySeparatorChar, StringComparison.Ordinal);

    private static string Relative(string appDir, string path) => Path.GetRelativePath(appDir, path).Replace('\\', '/');

    /// <summary>Counts the uses of each symbol by kind and source, and keeps where each was first seen.</summary>
    private sealed class UseCollector(string appDir)
    {
        private readonly Dictionary<
            (string Symbol, string Kind, string Source),
            (string Assembly, int Count, string First)
        > _uses = [];

        /// <summary>Records the library symbols in the trees that <paramref name="sourceOf"/> gives a source.</summary>
        public async Task Walk(
            Compilation compilation,
            Func<SyntaxTree, string?> sourceOf,
            CancellationToken cancellationToken
        )
        {
            // In path order, so that the first location is the same on every run: source generators add their trees
            // in no fixed order.
            foreach (SyntaxTree tree in compilation.SyntaxTrees.OrderBy(t => t.FilePath, StringComparer.Ordinal))
            {
                if (sourceOf(tree) is not { } source)
                {
                    continue;
                }

                SemanticModel model = compilation.GetSemanticModel(tree);
                var walker = new UsageWalker(
                    model,
                    (symbol, kind, location) => Add(symbol, kind, source, tree, location)
                );
                walker.Visit(await tree.GetRootAsync(cancellationToken));
            }
        }

        public List<SymbolUse> ToList() =>
            [
                .. _uses
                    .Select(kv => new SymbolUse(
                        kv.Key.Symbol,
                        kv.Value.Assembly,
                        kv.Key.Kind,
                        kv.Key.Source,
                        kv.Value.Count,
                        kv.Value.First
                    ))
                    .OrderBy(u => u.Symbol, StringComparer.Ordinal)
                    .ThenBy(u => u.Kind, StringComparer.Ordinal)
                    .ThenBy(u => u.Source, StringComparer.Ordinal),
            ];

        private void Add(ISymbol symbol, string kind, string source, SyntaxTree tree, Location location)
        {
            ISymbol declaration = LibrarySymbols.Normalize(symbol);
            if (declaration.GetDocumentationCommentId() is not { } id || id.StartsWith('!'))
            {
                return;
            }

            var key = (id, kind, source);
            _uses[key] = _uses.TryGetValue(key, out var existing)
                ? existing with
                {
                    Count = existing.Count + 1,
                }
                : (
                    declaration.ContainingAssembly.Name,
                    1,
                    $"{Relative(appDir, tree.FilePath)}:{location.GetLineSpan().StartLinePosition.Line + 1}"
                );
        }
    }
}
