using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Renames the argument in calls that pass the model parameter of <c>IAppResources.GetModelJsonSchema</c>,
/// <c>GetXsdSchema</c> (<c>modelId:</c>) and <c>GetPrefillJson</c> (<c>dataModelName:</c>) by name, since v9 names
/// the parameter <c>dataTypeId</c> on all three. A call that passes the argument positionally is unaffected and
/// left alone.
/// </summary>
/// <remarks>
/// Receivers are matched by their declared type within the file, as a field, parameter, property or local typed
/// <c>IAppResources</c>, and through the semantic model when the scanner has one, so an unrelated method of the
/// same name on the app's own type is not touched.
/// </remarks>
internal sealed class AppResourcesParameterNameMigration
{
    private const string InterfaceName = "IAppResources";
    private const string NewParameterName = "dataTypeId";

    private static readonly IReadOnlyDictionary<string, string> _oldParameterByMethod = new Dictionary<string, string>(
        StringComparer.Ordinal
    )
    {
        ["GetModelJsonSchema"] = "modelId",
        ["GetXsdSchema"] = "modelId",
        ["GetPrefillJson"] = "dataModelName",
    };

    private const string RewriteSummary =
        "The IAppResources methods GetModelJsonSchema, GetXsdSchema and GetPrefillJson name their parameter "
        + "dataTypeId in v9. Calls that passed it by its old name now pass dataTypeId:";

    private readonly CSharpSourceScanner _scanner;

    public AppResourcesParameterNameMigration(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Migrate()
    {
        var rewrites = new List<string>();

        // Snapshot: Update replaces list entries, which would invalidate a live enumerator.
        foreach (var file in _scanner.Files.ToArray())
        {
            var receivers = new DeclaredTypeReceiverClassifier(file, InterfaceName);
            var renames = new Dictionary<NameColonSyntax, string>();
            foreach (var invocation in file.Root.DescendantNodes().OfType<InvocationExpressionSyntax>())
            {
                if (
                    invocation.Expression is not MemberAccessExpressionSyntax memberAccess
                    || !_oldParameterByMethod.TryGetValue(memberAccess.Name.Identifier.Text, out var oldName)
                    || !receivers.IsOfType(memberAccess.Expression)
                )
                {
                    continue;
                }

                foreach (var argument in invocation.ArgumentList.Arguments)
                {
                    if (argument.NameColon is { } nameColon && nameColon.Name.Identifier.Text == oldName)
                    {
                        renames[nameColon] =
                            $"{file.RelativePath}:{file.GetLine(invocation)}: "
                            + $"{memberAccess.Name.Identifier.Text}({oldName}:) -> "
                            + $"{memberAccess.Name.Identifier.Text}({NewParameterName}:)";
                    }
                }
            }

            if (renames.Count == 0)
            {
                continue;
            }

            var updated = file.Root.ReplaceNodes(
                renames.Keys,
                (_, rewritten) =>
                    rewritten.WithName(SyntaxFactory.IdentifierName(NewParameterName).WithTriviaFrom(rewritten.Name))
            );
            _scanner.Update(file, updated);
            rewrites.AddRange(renames.Values);
        }

        var messages = new List<UpgradeMessage>();
        if (rewrites.Count > 0)
        {
            messages.Warn(RewriteSummary);
            messages.WarnRange(rewrites);
        }

        return new MigrationResult(messages);
    }
}
