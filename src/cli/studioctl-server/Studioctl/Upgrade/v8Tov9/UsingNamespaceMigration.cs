using System.Text.RegularExpressions;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

internal sealed class UsingNamespaceMigration
{
    private readonly string _projectFile;

    public UsingNamespaceMigration(string projectFile)
    {
        _projectFile = projectFile;
    }

    public bool Migrate(string oldNamespace, string newNamespace, Regex pathMatcher)
    {
        var csharpFiles = GetMatchingCSharpFiles(pathMatcher).ToArray();
        if (csharpFiles.Length == 0)
        {
            UpgradeConsole.WriteLine($"Namespace migration skipped; no C# files matched {pathMatcher}");
            return false;
        }

        var migratedAnyFile = false;
        foreach (var csharpFile in csharpFiles)
        {
            migratedAnyFile |= MigrateFile(csharpFile, oldNamespace, newNamespace);
        }

        if (!migratedAnyFile)
        {
            UpgradeConsole.WriteLine(
                $"Namespace migration skipped; old namespace '{oldNamespace}' not found in matching files"
            );
        }

        return migratedAnyFile;
    }

    private IEnumerable<string> GetMatchingCSharpFiles(Regex pathMatcher)
    {
        var projectDirectory = Path.GetDirectoryName(_projectFile);
        if (projectDirectory is null || !Directory.Exists(projectDirectory))
        {
            yield break;
        }

        foreach (var csharpFile in Directory.EnumerateFiles(projectDirectory, "*.cs", SearchOption.AllDirectories))
        {
            var relativePath = Path.GetRelativePath(projectDirectory, csharpFile);
            if (pathMatcher.IsMatch(relativePath))
            {
                yield return csharpFile;
            }
        }
    }

    private static bool MigrateFile(string csharpFile, string oldNamespace, string newNamespace)
    {
        var content = File.ReadAllText(csharpFile);
        var root = CSharpSyntaxTree.ParseText(content).GetCompilationUnitRoot();
        var oldUsings = root.DescendantNodes().OfType<UsingDirectiveSyntax>().Where(IsOldUsing).ToArray();
        if (oldUsings.Length == 0)
        {
            return false;
        }

        var scopesWithNewUsing = root.DescendantNodes()
            .OfType<UsingDirectiveSyntax>()
            .Where(IsNewUsing)
            .Select(static usingDirective => usingDirective.Parent)
            .OfType<SyntaxNode>()
            .ToHashSet();
        var updatedRoot = UpdateUsings(root, oldUsings, newNamespace, scopesWithNewUsing);

        File.WriteAllText(csharpFile, updatedRoot.ToFullString());
        UpgradeConsole.WriteLine($"Namespace migrated in {csharpFile}: {oldNamespace} -> {newNamespace}");
        return true;

        bool IsOldUsing(UsingDirectiveSyntax usingDirective) =>
            usingDirective.Alias is null && usingDirective.Name?.ToString() == oldNamespace;

        bool IsNewUsing(UsingDirectiveSyntax usingDirective) =>
            usingDirective.Alias is null && usingDirective.Name?.ToString() == newNamespace;
    }

    private static CompilationUnitSyntax UpdateUsings(
        CompilationUnitSyntax root,
        UsingDirectiveSyntax[] oldUsings,
        string newNamespace,
        HashSet<SyntaxNode> scopesWithNewUsing
    )
    {
        var trackedRoot = root.TrackNodes(oldUsings);
        foreach (var oldUsingsInScope in oldUsings.GroupBy(static usingDirective => usingDirective.Parent))
        {
            var oldUsingsToRemove = oldUsingsInScope.AsEnumerable();
            if (oldUsingsInScope.Key is not null && !scopesWithNewUsing.Contains(oldUsingsInScope.Key))
            {
                var firstOldUsing = trackedRoot.GetCurrentNode(oldUsingsInScope.First());
                if (firstOldUsing is null)
                {
                    throw new InvalidOperationException("Failed to update using directive");
                }

                trackedRoot = ReplaceUsing(trackedRoot, firstOldUsing, newNamespace);
                oldUsingsToRemove = oldUsingsInScope.Skip(1);
            }

            foreach (var oldUsing in oldUsingsToRemove)
            {
                var currentOldUsing = trackedRoot.GetCurrentNode(oldUsing);
                if (currentOldUsing is not null)
                {
                    trackedRoot =
                        trackedRoot.RemoveNode(currentOldUsing, SyntaxRemoveOptions.KeepNoTrivia)
                        ?? throw new InvalidOperationException("Failed to remove using directive");
                }
            }
        }

        return trackedRoot;
    }

    private static CompilationUnitSyntax ReplaceUsing(
        CompilationUnitSyntax root,
        UsingDirectiveSyntax oldUsing,
        string newNamespace
    )
    {
        var oldName = oldUsing.Name;
        if (oldName is null)
        {
            throw new InvalidOperationException("Using directive has no namespace");
        }

        return root.ReplaceNode(
            oldUsing,
            oldUsing.WithName(SyntaxFactory.ParseName(newNamespace).WithTriviaFrom(oldName))
        );
    }
}
