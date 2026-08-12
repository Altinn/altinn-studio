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
    /// Writes a rewritten root back to disk and updates the scanner's view of the file — including the
    /// compilation, so semantic models stay current for every step that runs after a rewriter. Returns
    /// the replacement <see cref="ScannedCSharpFile"/>; the argument instance is stale afterwards.
    /// </summary>
    public ScannedCSharpFile Update(ScannedCSharpFile file, CompilationUnitSyntax newRoot)
    {
        var files = _files.Value;
        var index = files.IndexOf(file);
        if (index < 0)
        {
            throw new ArgumentException($"File is not part of this scanner: {file.Path}", nameof(file));
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

    internal SemanticModel? GetSemanticModel(ScannedCSharpFile file) =>
        _compilation is not null && _trees.TryGetValue(file, out var tree) ? _compilation.GetSemanticModel(tree) : null;

    private List<ScannedCSharpFile> Load()
    {
        var files = new List<ScannedCSharpFile>();
        if (!Directory.Exists(_sourceDirectory))
        {
            return files;
        }

        // The compilation's trees carry the paths MSBuild gave them; index by full path so each disk
        // file can adopt its compiled tree (and thereby a semantic model) when one exists.
        Dictionary<string, SyntaxTree>? treesByPath = null;
        if (_compilation is not null)
        {
            treesByPath = new Dictionary<string, SyntaxTree>(StringComparer.OrdinalIgnoreCase);
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
