using System.Xml;
using System.Xml.Linq;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.MSBuild;

namespace Altinn.Studio.Fleet.Cli.Analysis.ApiUsage;

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
        string? projectFile = FindAppProject(appDir);
        if (projectFile is null)
        {
            return AppUsage.Failed("No project references the app library.");
        }

        string project = Relative(appDir, projectFile);
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
            errors.AddRange(
                compilation.GetDiagnostics(cancellationToken).Where(d => d.Severity == DiagnosticSeverity.Error)
            );
            HashSet<string> documents = DocumentPaths(current);
            await uses.Walk(
                compilation,
                tree => documents.Contains(tree.FilePath) ? UseSources.App : UseSources.Generated,
                cancellationToken
            );
        }

        // Test projects are a weaker signal: making a type internal breaks the app's tests, not the app.
        var testProjects = new List<string>();
        foreach (string testProjectFile in FindTestProjects(appDir, projectFile))
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

        // v6 and older apps have no Altinn.App.Core. Their library is Altinn.App.Api, Common and PlatformServices.
        string? libraryVersion = references
            .Where(a => LibrarySymbols.IsLibraryAssembly(a.Name))
            .OrderBy(a => a.Name == "Altinn.App.Core" ? 0 : 1)
            .FirstOrDefault()
            ?.Version.ToString();
        // Uses in code that does not compile are missing, so a run with errors is a failure, and the next run tries the
        // app again. A restore that failed for a moment, such as a feed that did not answer, looks the same.
        string? failure =
            libraryVersion is null ? "The app does not compile against the app library."
            : errors.Count > 0
                ? $"The app has {errors.Count} compile errors{(restoreError is null ? "" : " after a failed restore")}, "
                    + "so uses in the code that does not compile are missing."
            : null;
        return new AppUsage(
            project,
            libraryVersion,
            failure,
            restoreError,
            loadFailures,
            errors.Count,
            [.. errors.Take(SampleErrorCount).Select(e => e.ToString())],
            testProjects,
            uses.ToList(),
            BinaryReferences.Scan(Path.GetDirectoryName(projectFile) ?? appDir)
        );
    }

    /// <summary>
    /// The app's own project. Apps that Altinn Studio created keep it at <c>App/App.csproj</c>, whatever it
    /// references: some reach the app library only through a package of their own, and some keep test packages in
    /// it. Otherwise the only project in <c>App</c>, or the shallowest one that references the app library and is
    /// not a test project.
    /// </summary>
    internal static string? FindAppProject(string appDir)
    {
        string conventional = Path.Join(appDir, "App", "App.csproj");
        if (File.Exists(conventional))
        {
            return conventional;
        }

        string appFolder = Path.Join(appDir, "App");
        if (Directory.Exists(appFolder) && Directory.GetFiles(appFolder, "*.csproj") is [string only])
        {
            return only;
        }

        return Projects(appDir)
            .Where(p => References(p.Xml, "Altinn.App.") && !IsTestProject(p.Xml))
            .Select(p => p.Path)
            .OrderBy(p => p.Count(c => c == Path.DirectorySeparatorChar))
            .ThenBy(p => p, StringComparer.Ordinal)
            .FirstOrDefault();
    }

    /// <summary>The app's test projects: those that reference the app library or the app's project.</summary>
    internal static IEnumerable<string> FindTestProjects(string appDir, string appProject) =>
        Projects(appDir)
            .Where(p => p.Path != appProject && IsTestProject(p.Xml))
            .Where(p =>
                References(p.Xml, "Altinn.App.")
                || ReferenceIncludes(p.Xml)
                    .Any(include =>
                        Path.GetFullPath(Path.Join(Path.GetDirectoryName(p.Path), include.Replace('\\', '/')))
                        == appProject
                    )
            )
            .Select(p => p.Path)
            .Order(StringComparer.Ordinal);

    private static IEnumerable<(string Path, XDocument Xml)> Projects(string appDir)
    {
        foreach (string path in Directory.EnumerateFiles(appDir, "*.csproj", SearchOption.AllDirectories))
        {
            if (Relative(appDir, path).Split('/') is var segments && segments.Any(s => s is "bin" or "obj"))
            {
                continue;
            }

            XDocument? xml = null;
            try
            {
                xml = XDocument.Load(path);
            }
            catch (XmlException)
            {
                // A project MSBuild cannot read either is not one to analyze.
            }

            if (xml is not null)
            {
                yield return (path, xml);
            }
        }
    }

    private static IEnumerable<string> ReferenceIncludes(XDocument xml) =>
        xml.Descendants()
            .Where(e => e.Name.LocalName is "PackageReference" or "ProjectReference")
            .Select(e => (string?)e.Attribute("Include") ?? "");

    private static bool References(XDocument xml, string prefix) =>
        ReferenceIncludes(xml).Any(include => include.Contains(prefix, StringComparison.OrdinalIgnoreCase));

    private static bool IsTestProject(XDocument xml) =>
        ReferenceIncludes(xml)
            .Any(include => include.Equals("Microsoft.NET.Test.Sdk", StringComparison.OrdinalIgnoreCase));

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
            foreach (SyntaxTree tree in compilation.SyntaxTrees)
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
