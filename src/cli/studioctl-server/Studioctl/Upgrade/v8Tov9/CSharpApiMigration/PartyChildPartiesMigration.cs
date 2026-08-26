using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Rewrites the one breaking shape change carried by the v9 Party model swap (the app-facing
/// <c>Altinn.Platform.Register.Models</c>/<c>Altinn.Platform.Register.Enums</c> types moving to
/// <c>Altinn.Register.Contracts.V1</c>): <c>Party.ChildParties</c> changed from <c>List&lt;Party&gt;</c>
/// to <c>IReadOnlyList&lt;Party&gt;</c>.
/// <list type="bullet">
/// <item>
/// A <c>List&lt;Party&gt;</c>-typed local variable declared and initialized directly from a
/// <c>ChildParties</c> read is widened to <c>IReadOnlyList&lt;Party&gt;</c> - the only reason it was a
/// <c>List&lt;Party&gt;</c> before is that <c>ChildParties</c> itself used to be one.
/// </item>
/// <item>
/// A call that mutates a <c>ChildParties</c> read directly (<c>.Add</c>, <c>.Remove</c>, <c>.Clear</c>,
/// an element assignment, ...) is reported instead: <c>IReadOnlyList&lt;T&gt;</c> has no such members,
/// and the right fix (materialize a copy with <c>.ToList()</c>, or restructure the code to build the list
/// before it is exposed as <c>ChildParties</c>) depends on what the surrounding code actually needs,
/// which is not safe to guess.
/// </item>
/// </list>
/// </summary>
internal sealed class PartyChildPartiesMigration
{
    private const string ChildPartiesPropertyName = "ChildParties";
    private const string ListTypeName = "List";
    private const string ReadOnlyListTypeName = "IReadOnlyList";
    private const string PartyTypeName = "Party";

    private static readonly HashSet<string> MutatingMemberNames = new(StringComparer.Ordinal)
    {
        "Add",
        "AddRange",
        "Insert",
        "InsertRange",
        "Remove",
        "RemoveAt",
        "RemoveAll",
        "RemoveRange",
        "Clear",
        "Sort",
        "Reverse",
    };

    private readonly CSharpSourceScanner _scanner;

    public PartyChildPartiesMigration(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Migrate()
    {
        var rewrites = new List<string>();
        var todos = new List<string>();

        // Snapshot: Update replaces list entries, which would invalidate a live enumerator.
        foreach (var file in _scanner.Files.ToArray())
        {
            var rewriter = new Rewriter(file);
            var updated = rewriter.Visit(file.Root);
            todos.AddRange(rewriter.Todos);
            if (rewriter.Changes.Count == 0)
            {
                continue;
            }

            _scanner.Update(file, (CompilationUnitSyntax)updated);
            rewrites.AddRange(rewriter.Changes);
        }

        var messages = new List<UpgradeMessage>();
        if (rewrites.Count > 0)
        {
            messages.Warn(
                "Widened List<Party> to IReadOnlyList<Party> where it only ever held Party.ChildParties, "
                    + "matching the v9 Register.Contracts model. Rewrites:"
            );
            messages.WarnRange(rewrites);
        }

        if (todos.Count > 0)
        {
            messages.Todo(
                "Party.ChildParties is now IReadOnlyList<Party> and can no longer be mutated directly. "
                    + "Materialize a copy with .ToList() before mutating, or restructure the code to build "
                    + "the list before it is exposed as ChildParties:"
            );
            messages.WarnRange(todos);
        }

        return new MigrationResult(messages);
    }

    private sealed class Rewriter : CSharpSyntaxRewriter
    {
        private readonly ScannedCSharpFile _file;

        public Rewriter(ScannedCSharpFile file)
        {
            _file = file;
        }

        public List<string> Changes { get; } = [];

        public List<string> Todos { get; } = [];

        public override SyntaxNode? VisitVariableDeclaration(VariableDeclarationSyntax node)
        {
            var visited = (VariableDeclarationSyntax?)base.VisitVariableDeclaration(node);
            if (visited is null)
            {
                return null;
            }

            if (!IsListOfParty(visited.Type) || visited.Variables.Count != 1)
            {
                return visited;
            }

            var variable = visited.Variables[0];
            if (variable.Initializer?.Value is not { } initializer || !IsChildPartiesRead(initializer))
            {
                return visited;
            }

            Changes.Add(
                $"{_file.RelativePath}:{_file.GetLine(node)}: List<Party> {variable.Identifier.Text} -> "
                    + "IReadOnlyList<Party> (initialized from ChildParties)"
            );

            var newType = SyntaxFactory
                .ParseTypeName($"{ReadOnlyListTypeName}<{PartyTypeName}>")
                .WithTriviaFrom(visited.Type);
            return visited.WithType(newType);
        }

        public override SyntaxNode? VisitInvocationExpression(InvocationExpressionSyntax node)
        {
            var visited = (InvocationExpressionSyntax?)base.VisitInvocationExpression(node);
            if (visited is null)
            {
                return null;
            }

            if (
                visited.Expression is MemberAccessExpressionSyntax memberAccess
                && MutatingMemberNames.Contains(memberAccess.Name.Identifier.Text)
                && IsChildPartiesRead(memberAccess.Expression)
            )
            {
                Todos.Add(
                    $"{_file.RelativePath}:{_file.GetLine(node)}: .ChildParties.{memberAccess.Name.Identifier.Text}(..) "
                        + "- ChildParties is read-only in v9"
                );
            }

            return visited;
        }

        public override SyntaxNode? VisitAssignmentExpression(AssignmentExpressionSyntax node)
        {
            var visited = (AssignmentExpressionSyntax?)base.VisitAssignmentExpression(node);
            if (visited is null)
            {
                return null;
            }

            if (
                visited.Left is ElementAccessExpressionSyntax elementAccess
                && IsChildPartiesRead(elementAccess.Expression)
            )
            {
                Todos.Add(
                    $"{_file.RelativePath}:{_file.GetLine(node)}: .ChildParties[..] = .. - ChildParties is read-only in v9"
                );
            }

            return visited;
        }

        private static bool IsListOfParty(TypeSyntax type) =>
            type is GenericNameSyntax { Identifier.Text: ListTypeName, TypeArgumentList.Arguments.Count: 1 } generic
            && SimpleTypeName(generic.TypeArgumentList.Arguments[0]) == PartyTypeName;

        /// <summary>
        /// Whether <paramref name="expression"/> is a read of a <c>ChildParties</c> member, looking through
        /// the wrappers (<c>?.</c>, <c>!</c>, <c>??</c>) that commonly surround a nullable property read
        /// without changing what is actually being read.
        /// </summary>
        private static bool IsChildPartiesRead(ExpressionSyntax expression) =>
            expression switch
            {
                MemberAccessExpressionSyntax memberAccess => memberAccess.Name.Identifier.Text
                    == ChildPartiesPropertyName,
                ConditionalAccessExpressionSyntax conditional => conditional.WhenNotNull
                    is MemberBindingExpressionSyntax { Name.Identifier.Text: ChildPartiesPropertyName },
                PostfixUnaryExpressionSyntax suppress
                    when suppress.IsKind(SyntaxKind.SuppressNullableWarningExpression) => IsChildPartiesRead(
                    suppress.Operand
                ),
                BinaryExpressionSyntax coalesce when coalesce.IsKind(SyntaxKind.CoalesceExpression) =>
                    IsChildPartiesRead(coalesce.Left),
                _ => false,
            };

        private static string? SimpleTypeName(TypeSyntax? type) =>
            type switch
            {
                IdentifierNameSyntax identifier => identifier.Identifier.Text,
                GenericNameSyntax generic => generic.Identifier.Text,
                QualifiedNameSyntax qualified => qualified.Right.Identifier.Text,
                AliasQualifiedNameSyntax alias => alias.Name.Identifier.Text,
                _ => null,
            };
    }
}
