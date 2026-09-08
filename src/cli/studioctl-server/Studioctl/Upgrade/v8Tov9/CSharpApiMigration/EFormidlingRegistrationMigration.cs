using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Auto-migration for the eFormidling registration call. v8's
/// <c>AddEFormidlingServices&lt;TM&gt;(config)</c> and <c>AddEFormidlingServices&lt;TM, TR&gt;(config)</c>
/// are replaced in v9 by a staged builder — <c>AddEFormidling().WithMetadata&lt;TM&gt;()</c>, with
/// <c>.WithReceivers&lt;TR&gt;()</c> where the app supplies its own receivers — so an unmigrated app no
/// longer compiles. The rewrite is mechanical and total, which is why it is applied rather than reported:
/// the type arguments carry straight across, and the <c>IConfiguration</c> argument is dropped because the
/// library binds its settings section from the container rather than from a passed-in configuration.
/// </summary>
internal sealed class EFormidlingRegistrationMigration
{
    /// <summary>
    /// v8's method plus the <c>2</c>-suffixed variant it grew when the Maskinporten rewrite needed a
    /// second registration with the same signature. Both mean the same thing in v9.
    /// </summary>
    private static readonly IReadOnlySet<string> _legacyMethodNames = new HashSet<string>(StringComparer.Ordinal)
    {
        "AddEFormidlingServices",
        "AddEFormidlingServices2",
    };

    /// <summary>
    /// The receivers implementation <c>AddEFormidling()</c> registers on its own, so naming it through
    /// <c>WithReceivers</c> would only restate the default.
    /// </summary>
    private const string DefaultReceiversTypeName = "DefaultEFormidlingReceivers";

    private readonly CSharpSourceScanner _scanner;

    public EFormidlingRegistrationMigration(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Migrate()
    {
        var messages = new List<UpgradeMessage>();

        // Type arguments are matched on their right-most identifier, so an app with a type of its own
        // called DefaultEFormidlingReceivers would otherwise have that registration dropped as if it
        // were the library's - silently falling back to the library default. If the app declares the
        // name anywhere, no occurrence of it is treated as the library type.
        var appDeclaresDefaultReceivers = _scanner.Files.Any(f =>
            f.Root.DescendantNodes()
                .OfType<TypeDeclarationSyntax>()
                .Any(t => t.Identifier.Text == DefaultReceiversTypeName)
        );

        // Snapshot: Update replaces list entries, which would invalidate a live enumerator.
        foreach (var file in _scanner.Files.ToArray())
        {
            var rewrites = new Dictionary<InvocationExpressionSyntax, string>();

            foreach (var invocation in file.Root.DescendantNodes().OfType<InvocationExpressionSyntax>())
            {
                if (!IsLegacyRegistration(invocation, out var methodName, out var typeArguments))
                {
                    continue;
                }

                var line = file.GetLine(invocation);

                // Only the extension-method form is rewritten. A static call - `Extensions.Method(services,
                // config)` - parses as member access too, so the argument count is what tells them apart:
                // the extension form passes configuration alone. Turning a static call into an extension
                // call would also need a using directive a fully-qualified caller may not have, so it is
                // left to the developer rather than guessed at.
                if (
                    invocation.Expression is not MemberAccessExpressionSyntax memberAccess
                    || invocation.ArgumentList.Arguments.Count != 1
                )
                {
                    messages.Todo(
                        $"{file.RelativePath}:{line}: found '{methodName}' in a call shape this upgrade does "
                            + $"not rewrite (it expects services.{methodName}<..>(configuration)). Replace it by "
                            + "hand with services.AddEFormidling().WithMetadata<T>()."
                    );
                    continue;
                }

                if (typeArguments.Count is < 1 or > 2)
                {
                    messages.Todo(
                        $"{file.RelativePath}:{line}: found '{methodName}' with an unexpected number of type "
                            + "arguments and left it alone. Replace it by hand with "
                            + "services.AddEFormidling().WithMetadata<T>()."
                    );
                    continue;
                }

                var (replacement, droppedDefaultReceivers) = BuildReplacement(
                    memberAccess.Expression,
                    typeArguments,
                    appDeclaresDefaultReceivers
                );
                rewrites[invocation] = replacement;
                messages.Warn(
                    $"{file.RelativePath}:{line}: rewrote '{methodName}' to "
                        + "AddEFormidling().WithMetadata<T>(). The IConfiguration argument was dropped — "
                        + "eFormidling now binds its 'EFormidlingClientSettings' section from the app's "
                        + "configuration directly. Use WithConfig(...) if the app needs a different source."
                );

                if (droppedDefaultReceivers)
                {
                    messages.Warn(
                        $"{file.RelativePath}:{line}: dropped the '{DefaultReceiversTypeName}' type argument, "
                            + "which AddEFormidling() now registers on its own. Add "
                            + $".WithReceivers<{DefaultReceiversTypeName}>() back if that named a type other than "
                            + "the one in Altinn.App.Core."
                    );
                }

                if (DroppedArgumentNeedsReview(invocation))
                {
                    messages.Warn(
                        $"{file.RelativePath}:{line}: the dropped argument was not a plain configuration "
                            + "variable. Check whether the app was binding eFormidling settings from "
                            + "somewhere other than the host configuration, and restore it with WithConfig(...)."
                    );
                }
            }

            if (rewrites.Count == 0)
            {
                continue;
            }

            var updatedRoot = file.Root.ReplaceNodes(
                rewrites.Keys,
                (original, _) => SyntaxFactory.ParseExpression(rewrites[original]).WithTriviaFrom(original)
            );
            _scanner.Update(file, updatedRoot);
        }

        return new MigrationResult(messages);
    }

    /// <summary>
    /// Whether the invocation is one of the legacy registration calls, and if so its method name and
    /// type arguments. Matches on the simple name, so a fully-qualified call reads the same.
    /// </summary>
    private static bool IsLegacyRegistration(
        InvocationExpressionSyntax invocation,
        out string methodName,
        out SeparatedSyntaxList<TypeSyntax> typeArguments
    )
    {
        methodName = string.Empty;
        typeArguments = default;

        SimpleNameSyntax? name = invocation.Expression switch
        {
            MemberAccessExpressionSyntax memberAccess => memberAccess.Name,
            MemberBindingExpressionSyntax memberBinding => memberBinding.Name,
            SimpleNameSyntax simple => simple,
            _ => null,
        };

        if (name is not GenericNameSyntax generic || !_legacyMethodNames.Contains(generic.Identifier.Text))
        {
            return false;
        }

        methodName = generic.Identifier.Text;
        typeArguments = generic.TypeArgumentList.Arguments;
        return true;
    }

    /// <param name="appDeclaresDefaultReceivers">
    /// Whether the app declares a type of its own named <see cref="DefaultReceiversTypeName"/>. When it
    /// does, the name cannot be assumed to mean the library's type and the argument is carried over.
    /// </param>
    /// <returns>
    /// The replacement expression, and whether a <see cref="DefaultReceiversTypeName"/> argument was
    /// dropped as redundant — which the caller reports, since a silent drop is the one outcome the
    /// developer could not otherwise notice.
    /// </returns>
    private static (string Text, bool DroppedDefaultReceivers) BuildReplacement(
        ExpressionSyntax receiver,
        SeparatedSyntaxList<TypeSyntax> typeArguments,
        bool appDeclaresDefaultReceivers
    )
    {
        // The replacement node inherits the original invocation's leading/trailing trivia, so only the
        // pieces carried over need normalizing - and they need it: a receiver written across several
        // lines keeps those line breaks between its own tokens, which would land mid-chain here.
        var text = $"{Render(receiver)}.AddEFormidling().WithMetadata<{Render(typeArguments[0])}>()";

        if (typeArguments.Count != 2)
        {
            return (text, false);
        }

        if (!appDeclaresDefaultReceivers && SimpleName(typeArguments[1]) == DefaultReceiversTypeName)
        {
            return (text, true);
        }

        return ($"{text}.WithReceivers<{Render(typeArguments[1])}>()", false);
    }

    /// <summary>
    /// Whether the dropped <c>IConfiguration</c> argument was something other than a plain variable
    /// reference. The template passes the host's own configuration, which the container already has;
    /// anything else may have pointed the settings somewhere this rewrite cannot preserve.
    /// </summary>
    private static bool DroppedArgumentNeedsReview(InvocationExpressionSyntax invocation) =>
        invocation.ArgumentList.Arguments[0].Expression is not IdentifierNameSyntax;

    /// <summary>
    /// A node re-emitted as canonically formatted single-line source. <c>WithoutTrivia</c> is not enough:
    /// it strips only the node's own leading/trailing trivia, leaving line breaks <em>between</em> its
    /// tokens intact.
    /// </summary>
    private static string Render(SyntaxNode node) => node.NormalizeWhitespace().ToFullString().Trim();

    private static string? SimpleName(TypeSyntax type) =>
        type switch
        {
            IdentifierNameSyntax identifier => identifier.Identifier.Text,
            GenericNameSyntax generic => generic.Identifier.Text,
            QualifiedNameSyntax qualified => qualified.Right.Identifier.Text,
            AliasQualifiedNameSyntax alias => alias.Name.Identifier.Text,
            _ => null,
        };
}
