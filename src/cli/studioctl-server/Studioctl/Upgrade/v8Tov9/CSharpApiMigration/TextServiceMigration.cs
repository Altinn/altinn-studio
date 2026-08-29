using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Auto-migration for the removed <c>Altinn.App.Core.Internal.Texts.IText</c> interface and its
/// <c>TextClient</c> implementation: <c>IText</c> is replaced by the already-registered
/// <c>IAppResources</c>, whose <c>GetTexts(org, app, language)</c> is the same method under its v9
/// name (v9 could not keep calling it <c>GetText</c> - <c>IAppResources</c> already declares an
/// unrelated, still-current <c>GetText(org, app, textResource)</c> that reads a file resource by name
/// and returns <c>byte[]</c>, not a <c>TextResource</c>).
/// </summary>
/// <remarks>
/// A field, parameter or property typed <c>IText</c> is retyped to <c>IAppResources</c>, and a
/// <c>.GetText(a, b, c)</c> call reached through it is renamed to <c>.GetTexts(a, b, c)</c> - tracked by
/// declaring identifier name within the file, so a call reached through an unrelated
/// <c>IAppResources</c>-typed receiver of the same method name is never touched. A class implementing
/// <c>IText</c> directly, or a direct reference to the concrete <c>TextClient</c> type, has no mechanical
/// fix - <c>IAppResources</c> is a much larger interface - so those are reported instead of rewritten,
/// and the whole file is left untouched rather than partially migrated.
/// </remarks>
internal sealed class TextServiceMigration
{
    private const string OldInterfaceName = "IText";
    private const string OldClassName = "TextClient";
    private const string NewInterfaceName = "IAppResources";
    private const string OldMethodName = "GetText";
    private const string NewMethodName = "GetTexts";
    private const int OldMethodArity = 3;

    private static readonly IReadOnlySet<string> _oldInterfaceNames = new HashSet<string>(StringComparer.Ordinal)
    {
        OldInterfaceName,
    };

    private static readonly IReadOnlySet<string> _oldClassNames = new HashSet<string>(StringComparer.Ordinal)
    {
        OldClassName,
    };

    private const string RewriteSummary =
        "Migrated the removed IText interface to IAppResources.GetTexts(org, app, language) - the same "
        + "method IText.GetText(org, app, language) exposed, under its v9 name. Rewrites:";

    private const string UnresolvedSummary =
        "IText and TextClient are removed in v9 and could not be migrated automatically. Inject "
        + "IAppResources instead and call GetTexts(org, app, language):";

    private readonly CSharpSourceScanner _scanner;

    public TextServiceMigration(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Migrate()
    {
        var rewrites = new List<string>();
        var unresolved = new List<string>();

        // Snapshot: Update replaces list entries, which would invalidate a live enumerator.
        foreach (var file in _scanner.Files.ToArray())
        {
            // A class implementing IText directly needs a bigger port than a rename - IAppResources
            // declares many more members - so report it and leave the whole file untouched rather than
            // rewrite around it.
            var implementers = CSharpSyntaxQueries.TypesImplementing(file, _oldInterfaceNames).ToList();
            if (implementers.Count > 0)
            {
                foreach (var match in implementers)
                {
                    unresolved.Add(
                        $"{match.Location}: {match.Symbol} - implements IText directly. Port it to implement "
                            + "IAppResources instead, or delete it and inject IAppResources where IText was used."
                    );
                }

                continue;
            }

            // The concrete TextClient class has no drop-in replacement type.
            var classReferences = CSharpSyntaxQueries.TypeReferences(file, _oldClassNames).ToList();
            if (classReferences.Count > 0)
            {
                foreach (var match in classReferences)
                {
                    unresolved.Add($"{match.Location}: TextClient referenced directly - inject IAppResources instead.");
                }

                continue;
            }

            var rewriter = new Rewriter(file);
            var updated = (CompilationUnitSyntax?)rewriter.Visit(file.Root);
            if (updated is null || rewriter.Changes.Count == 0)
            {
                continue;
            }

            _scanner.Update(file, updated);
            rewrites.AddRange(rewriter.Changes);
        }

        var messages = new List<UpgradeMessage>();
        if (rewrites.Count > 0)
        {
            messages.Warn(RewriteSummary);
            messages.WarnRange(rewrites);
        }

        if (unresolved.Count > 0)
        {
            messages.Todo(UnresolvedSummary);
            messages.WarnRange(unresolved);
        }

        return new MigrationResult(messages);
    }

    private sealed class Rewriter : CSharpSyntaxRewriter
    {
        private readonly ScannedCSharpFile _file;

        // Names of fields/parameters/properties this pass retyped from IText, keyed within this file
        // only: a GetText(..) call reached through one of these is the removed method, not the
        // unrelated IAppResources.GetText(org, app, textResource) that returns a file's raw bytes.
        private readonly HashSet<string> _formerlyIText = new(StringComparer.Ordinal);

        public Rewriter(ScannedCSharpFile file)
        {
            _file = file;
        }

        public List<string> Changes { get; } = [];

        public override SyntaxNode? VisitIdentifierName(IdentifierNameSyntax node)
        {
            if (node.Identifier.Text != OldInterfaceName || IsMemberAccessName(node))
            {
                return base.VisitIdentifierName(node);
            }

            RecordDeclaringIdentifier(node);

            Changes.Add($"{_file.RelativePath}:{_file.GetLine(node)}: IText -> IAppResources");
            return SyntaxFactory.IdentifierName(NewInterfaceName).WithTriviaFrom(node);
        }

        public override SyntaxNode? VisitInvocationExpression(InvocationExpressionSyntax node)
        {
            var visited = (InvocationExpressionSyntax?)base.VisitInvocationExpression(node);
            if (visited is null)
            {
                return null;
            }

            if (
                visited.Expression is not MemberAccessExpressionSyntax memberAccess
                || memberAccess.Name.Identifier.Text != OldMethodName
                || visited.ArgumentList.Arguments.Count != OldMethodArity
                || !ReceiverWasIText(memberAccess.Expression)
            )
            {
                return visited;
            }

            Changes.Add($"{_file.RelativePath}:{_file.GetLine(node)}: .GetText(..) -> .GetTexts(..)");

            return visited.WithExpression(
                memberAccess.WithName(SyntaxFactory.IdentifierName(NewMethodName).WithTriviaFrom(memberAccess.Name))
            );
        }

        /// <summary>Whether <paramref name="name"/> is the <c>.Name</c> half of a member access, never a type reference.</summary>
        private static bool IsMemberAccessName(IdentifierNameSyntax name) =>
            name.Parent is MemberAccessExpressionSyntax memberAccess && memberAccess.Name == name;

        private void RecordDeclaringIdentifier(IdentifierNameSyntax typeNode)
        {
            var name = typeNode.Parent switch
            {
                VariableDeclarationSyntax { Variables.Count: 1 } variable => variable.Variables[0].Identifier.Text,
                ParameterSyntax parameter => parameter.Identifier.Text,
                PropertyDeclarationSyntax property => property.Identifier.Text,
                _ => null,
            };

            if (name is not null)
            {
                _formerlyIText.Add(name);
            }
        }

        private bool ReceiverWasIText(ExpressionSyntax receiver) =>
            receiver switch
            {
                IdentifierNameSyntax identifier => _formerlyIText.Contains(identifier.Identifier.Text),
                MemberAccessExpressionSyntax { Expression: ThisExpressionSyntax } member => _formerlyIText.Contains(
                    member.Name.Identifier.Text
                ),
                _ => false,
            };
    }
}
