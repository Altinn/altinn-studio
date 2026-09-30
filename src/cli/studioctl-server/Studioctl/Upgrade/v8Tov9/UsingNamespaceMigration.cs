using System.Text.RegularExpressions;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

internal sealed class UsingNamespaceMigration
{
    private readonly CSharpSourceScanner _scanner;

    public UsingNamespaceMigration(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public bool Migrate(string oldNamespace, string newNamespace, Regex pathMatcher)
    {
        var csharpFiles = _scanner.Files.Where(file => pathMatcher.IsMatch(file.RelativePath)).ToArray();
        if (csharpFiles.Length == 0)
        {
            UpgradeConsole.Skip($"No C# files matched {pathMatcher}");
            return false;
        }

        var migratedAnyFile = false;
        foreach (var csharpFile in csharpFiles)
        {
            migratedAnyFile |= MigrateFile(csharpFile, oldNamespace, newNamespace);
        }

        if (!migratedAnyFile)
        {
            UpgradeConsole.Skip($"Old namespace '{oldNamespace}' not found in matching files");
        }

        return migratedAnyFile;
    }

    private bool MigrateFile(ScannedCSharpFile csharpFile, string oldNamespace, string newNamespace)
    {
        var root = csharpFile.Root;
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

        _scanner.Update(csharpFile, updatedRoot);
        UpgradeConsole.Ok($"Namespace migrated in {csharpFile.Path}: {oldNamespace} -> {newNamespace}");
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
