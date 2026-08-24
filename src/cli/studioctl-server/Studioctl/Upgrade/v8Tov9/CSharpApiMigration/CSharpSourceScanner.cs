using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// A single app C# source file, parsed once and shared across the v8-&gt;v9 C# API migration steps so
/// they don't each re-read and re-parse the same trees.
/// </summary>
internal sealed class ScannedCSharpFile
{
    private readonly CSharpSourceScanner _owner;

    internal ScannedCSharpFile(CSharpSourceScanner owner, string path, string relativePath, CompilationUnitSyntax root)
    {
        _owner = owner;
        Path = path;
        RelativePath = relativePath;
        Root = root;
    }

    /// <summary>Absolute path to the file.</summary>
    public string Path { get; }

    /// <summary>Path relative to the scanned source directory, using the platform separator.</summary>
    public string RelativePath { get; }

    /// <summary>The parsed compilation unit.</summary>
    public CompilationUnitSyntax Root { get; }

    /// <summary>
    /// The semantic model for this file, when the upgrade obtained a compilation of the app against
    /// its current (v8) packages — <c>null</c> otherwise, in which case a consumer falls back to the
    /// syntax-based heuristics. Only valid for nodes reached from <see cref="Root"/>.
    /// </summary>
    public SemanticModel? SemanticModel => _owner.GetSemanticModel(this);

    /// <summary>The 1-based line number where <paramref name="node"/> starts.</summary>
    public int GetLine(SyntaxNode node) => node.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
}

/// <summary>
/// The single stateful view of the app's C# source shared by every v8-&gt;v9 C# migration step:
/// enumerates and parses the source files once, optionally pairs them with a semantic
/// <see cref="Compilation"/> of the app against its current (v8) packages, and keeps both in sync as
/// rewriters modify files through <see cref="Update"/>.
/// <para>
/// The compilation is optional by design — obtaining one requires a restore and a design-time build
/// that can fail for reasons outside the upgrade's control (the app does not compile, no matching
/// SDK/targeting pack, offline). Detection then degrades to the syntax-based heuristics in
/// <see cref="CSharpSyntaxQueries"/>, which deliberately over-report rather than miss real breakage.
/// Build output (<c>bin</c>/<c>obj</c>) is skipped.
/// </para>
/// </summary>
internal sealed class CSharpSourceScanner
{
    private readonly string _sourceDirectory;
    private readonly Lazy<List<ScannedCSharpFile>> _files;
    private readonly Dictionary<ScannedCSharpFile, SyntaxTree> _trees = new();
    private readonly Dictionary<ScannedCSharpFile, SemanticModel> _semanticModels = new();
    private readonly bool _isPristineView;
    private CSharpSourceScanner? _pristine;
    private Compilation? _compilation;

    /// <param name="sourceDirectory">
    /// Directory to scan recursively for <c>*.cs</c> files - typically the directory containing the
    /// app's <c>App.csproj</c>.
    /// </param>
    /// <param name="compilation">
    /// A compilation of the app against its current (v8) packages, or <c>null</c> for syntax-only
    /// scanning. Files on disk that are not part of the compilation (for example excluded by the
    /// csproj) still get syntax-based scanning; they just carry no semantic model.
    /// </param>
    public CSharpSourceScanner(string sourceDirectory, Compilation? compilation = null)
    {
        _sourceDirectory = sourceDirectory;
        _compilation = compilation;
        _files = new Lazy<List<ScannedCSharpFile>>(Load);
    }

    /// <summary>Convenience overload that scans the directory containing <paramref name="projectFile"/>.</summary>
    public static CSharpSourceScanner ForProject(string projectFile, Compilation? compilation = null) =>
        new(System.IO.Path.GetDirectoryName(projectFile) ?? projectFile, compilation);

    /// <summary>The parsed app source files (lazily loaded on first access).</summary>
    public IReadOnlyList<ScannedCSharpFile> Files => _files.Value;

    /// <summary>Whether files carry semantic models (see <see cref="ScannedCSharpFile.SemanticModel"/>).</summary>
    public bool HasSemanticModels => _compilation is not null;

    /// <summary>
    /// The view semantic <em>detection</em> must bind against: the pre-rewrite state, frozen
    /// automatically the moment the first rewriter goes through <see cref="Update"/>. The rewriters
    /// move code toward v9 (the IServiceTask namespace rewrite above all), after which the v8
    /// compilation can no longer bind the very names the detectors look for — keeping the models
    /// "current" would make detection silently blind exactly where it matters. While nothing has been
    /// rewritten — or without semantic models, where syntax detection deliberately reads the rewritten
    /// source — this is the scanner itself.
    /// </summary>
    public CSharpSourceScanner PristineView => _pristine ?? this;

    private CSharpSourceScanner Snapshot()
    {
        var files = new List<ScannedCSharpFile>(Files.Count);
        var snapshot = new CSharpSourceScanner(_sourceDirectory, _compilation, files);
        foreach (var file in Files)
        {
            var copy = new ScannedCSharpFile(snapshot, file.Path, file.RelativePath, file.Root);
            files.Add(copy);
            if (_trees.TryGetValue(file, out var tree))
            {
                snapshot._trees[copy] = tree;
            }
        }

        return snapshot;
    }

    private CSharpSourceScanner(string sourceDirectory, Compilation? compilation, List<ScannedCSharpFile> files)
    {
        _sourceDirectory = sourceDirectory;
        _compilation = compilation;
        _files = new Lazy<List<ScannedCSharpFile>>(() => files);
        _isPristineView = true;
    }

    /// <summary>
    /// Writes a rewritten root back to disk and updates the scanner's view of the file — including the
    /// compilation, so semantic models stay current for every step that runs after a rewriter. Returns
    /// the replacement <see cref="ScannedCSharpFile"/>; the argument instance is stale afterwards.
    /// </summary>
    public ScannedCSharpFile Update(ScannedCSharpFile file, CompilationUnitSyntax newRoot)
    {
        if (_isPristineView)
        {
            // Writing through the frozen view would put pre-rewrite content back on disk over the
            // rewriters' output. The view exists for read-only detection.
            throw new InvalidOperationException("The pristine detection view cannot be written through.");
        }

        var files = _files.Value;
        var index = files.IndexOf(file);
        if (index < 0)
        {
            throw new ArgumentException($"File is not part of this scanner: {file.Path}", nameof(file));
        }

        // Freeze the pristine view before the first rewrite lands. Only meaningful with semantic
        // models — without them detection reads the live (rewritten) source, as it always has.
        if (_compilation is not null)
        {
            _pristine ??= Snapshot();
        }

        File.WriteAllText(file.Path, newRoot.ToFullString());

        CompilationUnitSyntax canonicalRoot;
        if (_compilation is not null && _trees.Remove(file, out var oldTree))
        {
            // Re-rooting the existing tree keeps the compilation's reference graph intact while the
            // canonical root (the tree's own) is what keeps node-identity checks inside the semantic
            // model valid.
            var newTree = oldTree.WithRootAndOptions(newRoot, oldTree.Options);
            canonicalRoot = (CompilationUnitSyntax)newTree.GetRoot();
            _compilation = _compilation.ReplaceSyntaxTree(oldTree, newTree);

            var updatedFile = new ScannedCSharpFile(this, file.Path, file.RelativePath, canonicalRoot);
            _trees[updatedFile] = newTree;
            files[index] = updatedFile;
            return updatedFile;
        }

        var updated = new ScannedCSharpFile(this, file.Path, file.RelativePath, newRoot);
        files[index] = updated;
        return updated;
    }

    internal SemanticModel? GetSemanticModel(ScannedCSharpFile file)
    {
        // Cached per file: a fresh model per access would re-bind from scratch every time. Update
        // replaces the file instance, so entries never go stale — they just stop being reachable.
        if (_semanticModels.TryGetValue(file, out var cached))
        {
            return cached;
        }

        if (_compilation is null || !_trees.TryGetValue(file, out var tree))
        {
            return null;
        }

        var model = _compilation.GetSemanticModel(tree);
        _semanticModels[file] = model;
        return model;
    }

    private List<ScannedCSharpFile> Load()
    {
        var files = new List<ScannedCSharpFile>();
        if (!Directory.Exists(_sourceDirectory))
        {
            return files;
        }

        // The compilation's trees carry the paths MSBuild gave them; index by full path so each disk
        // file can adopt its compiled tree (and thereby a semantic model) when one exists. The comparer
        // follows the platform: case-insensitive where the file system is (MSBuild may report a casing
        // that differs from the directory enumeration), ordinal where it is not — two files differing
        // only by case are distinct there, and folding them would pair a file with the other's tree.
        Dictionary<string, SyntaxTree>? treesByPath = null;
        if (_compilation is not null)
        {
            treesByPath = new Dictionary<string, SyntaxTree>(
                OperatingSystem.IsWindows() || OperatingSystem.IsMacOS()
                    ? StringComparer.OrdinalIgnoreCase
                    : StringComparer.Ordinal
            );
            foreach (var tree in _compilation.SyntaxTrees)
            {
                if (!string.IsNullOrEmpty(tree.FilePath))
                {
                    treesByPath[System.IO.Path.GetFullPath(tree.FilePath)] = tree;
                }
            }
        }

        foreach (var path in Directory.EnumerateFiles(_sourceDirectory, "*.cs", SearchOption.AllDirectories))
        {
            var relativePath = Path.GetRelativePath(_sourceDirectory, path);
            if (BuildOutputPaths.IsBuildOutput(relativePath))
            {
                continue;
            }

            ScannedCSharpFile file;
            if (treesByPath is not null && treesByPath.TryGetValue(System.IO.Path.GetFullPath(path), out var tree))
            {
                file = new ScannedCSharpFile(this, path, relativePath, tree.GetCompilationUnitRoot());
                files.Add(file);
                _trees[file] = tree;
            }
            else
            {
                var content = File.ReadAllText(path);
                var root = CSharpSyntaxTree.ParseText(content).GetCompilationUnitRoot();
                files.Add(new ScannedCSharpFile(this, path, relativePath, root));
            }
        }

        return files;
    }
}
