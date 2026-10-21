using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Removes <c>using</c> directives that import a namespace v9 deleted with nothing in its place. Such a
/// directive fails to compile (CS0234) even when the file uses nothing from it, and there is no namespace
/// to rewrite it to, so the line goes. Code that does use the namespace's types is broken either way;
/// the removed-API checks report it by type name, so they find it without the directive.
/// <para>
/// Plain and static imports are removed. Aliases are left alone: the alias name is used elsewhere in the
/// file, and the removed-API checks report the type it names.
/// </para>
/// </summary>
internal sealed class RemovedNamespaceUsingMigration
{
    private const string GlobalAliasPrefix = "global::";

    private readonly CSharpSourceScanner _scanner;

    public RemovedNamespaceUsingMigration(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    /// <returns>The number of files that were rewritten.</returns>
    public int Migrate(string removedNamespace)
    {
        var changedFiles = 0;
        // Update replaces the file instance in the scanner, so iterate over a snapshot of the list.
        foreach (var file in _scanner.Files.ToArray())
        {
            var directives = file
                .Root.DescendantNodes()
                .OfType<UsingDirectiveSyntax>()
                .Where(directive => Imports(directive, removedNamespace))
                .ToArray();
            if (directives.Length == 0)
                continue;

            _scanner.Update(file, UsingDirectiveRemoval.Remove(file.Root, directives));
            UpgradeConsole.Ok(
                $"Removed {directives.Length} using directive(s) of {removedNamespace}, which v9 deleted, in {file.Path}"
            );
            changedFiles++;
        }

        return changedFiles;
    }

    /// <summary>
    /// Whether the directive imports the namespace itself or, as a static import, a type in it.
    /// </summary>
    private static bool Imports(UsingDirectiveSyntax directive, string removedNamespace)
    {
        if (directive.Alias is not null || directive.Name?.ToString() is not { } name)
            return false;

        if (name.StartsWith(GlobalAliasPrefix, StringComparison.Ordinal))
            name = name[GlobalAliasPrefix.Length..];

        return name.Equals(removedNamespace, StringComparison.Ordinal)
            || name.StartsWith(removedNamespace + ".", StringComparison.Ordinal);
    }
}
