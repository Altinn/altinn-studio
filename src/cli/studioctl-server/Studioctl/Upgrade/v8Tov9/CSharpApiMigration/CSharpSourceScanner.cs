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
    public ScannedCSharpFile(string path, string relativePath, CompilationUnitSyntax root)
    {
        Path = path;
        RelativePath = relativePath;
        Root = root;
    }

    /// <summary>Absolute path to the file.</summary>
    public string Path { get; }

    /// <summary>Path relative to the scanned source directory, using the platform separator.</summary>
    public string RelativePath { get; }

    /// <summary>The parsed compilation unit (syntax only; no semantic model).</summary>
    public CompilationUnitSyntax Root { get; }

    /// <summary>The 1-based line number where <paramref name="node"/> starts.</summary>
    public int GetLine(SyntaxNode node) => node.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
}

/// <summary>
/// Enumerates and parses the app's C# source files once, then hands the parsed trees to the C# API
/// migration detectors. The v8-&gt;v9 upgrade cannot rely on a full semantic <see cref="Compilation"/>
/// (the app usually won't restore/compile mid-upgrade), so detection is syntax-based - see
/// <see cref="CSharpSyntaxQueries"/> for the shared queries built on top of these trees.
/// Build output (<c>bin</c>/<c>obj</c>) is skipped.
/// </summary>
internal sealed class CSharpSourceScanner
{
    private readonly Lazy<IReadOnlyList<ScannedCSharpFile>> _files;

    /// <param name="sourceDirectory">
    /// Directory to scan recursively for <c>*.cs</c> files - typically the directory containing the
    /// app's <c>App.csproj</c> (mirrors <see cref="UsingNamespaceMigration"/>).
    /// </param>
    public CSharpSourceScanner(string sourceDirectory)
    {
        _files = new Lazy<IReadOnlyList<ScannedCSharpFile>>(() => Load(sourceDirectory));
    }

    /// <summary>Convenience overload that scans the directory containing <paramref name="projectFile"/>.</summary>
    public static CSharpSourceScanner ForProject(string projectFile) =>
        new(System.IO.Path.GetDirectoryName(projectFile) ?? projectFile);

    /// <summary>The parsed app source files (lazily loaded on first access).</summary>
    public IReadOnlyList<ScannedCSharpFile> Files => _files.Value;

    private static IReadOnlyList<ScannedCSharpFile> Load(string sourceDirectory)
    {
        if (!Directory.Exists(sourceDirectory))
        {
            return Array.Empty<ScannedCSharpFile>();
        }

        var files = new List<ScannedCSharpFile>();
        foreach (var path in Directory.EnumerateFiles(sourceDirectory, "*.cs", SearchOption.AllDirectories))
        {
            var relativePath = Path.GetRelativePath(sourceDirectory, path);
            if (BuildOutputPaths.IsBuildOutput(relativePath))
            {
                continue;
            }

            var content = File.ReadAllText(path);
            var root = CSharpSyntaxTree.ParseText(content).GetCompilationUnitRoot();
            files.Add(new ScannedCSharpFile(path, relativePath, root));
        }

        return files;
    }
}
