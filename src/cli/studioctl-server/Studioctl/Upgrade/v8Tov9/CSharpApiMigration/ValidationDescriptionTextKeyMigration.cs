using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Moves a text key that a <c>ValidationIssue</c> object initializer sets as <c>Description</c> to
/// <c>CustomTextKey</c>. The v8 form looked a description up as a text key; the v9 form shows it as text, so a key
/// left there would show as the key itself.
/// </summary>
/// <remarks>
/// <para>
/// Only object initializers are handled. A <c>Description</c> moves when it is a string literal that is the id of one
/// of the app's text resources. A literal that <see cref="TextResourceKeyMigration"/> renamed moves to the new id.
/// v9 only uses <c>CustomTextKey</c> when both are set, and the framework sets <c>Description</c> from it. So when an
/// initializer sets both to the same value, <c>Description</c> is removed; otherwise it is left with a warning.
/// </para>
/// <para>
/// With a semantic model, <c>Description</c> must bind to the SDK's <c>ValidationIssue</c>. Without one, only
/// initializers of a type spelled <c>ValidationIssue</c> are handled, and moves are reported as unverified.
/// </para>
/// </remarks>
internal sealed class ValidationDescriptionTextKeyMigration
{
    private const string TypeName = "ValidationIssue";
    private const string DescriptionName = "Description";
    private const string CustomTextKeyName = "CustomTextKey";

    private const string MovedSummary =
        "The v9 form shows a validation issue's Description as text instead of looking it up as a text key. "
        + "Descriptions set to one of the app's text keys now set CustomTextKey:";

    private const string RemovedSummary =
        "These validation issues set Description to the same value as CustomTextKey. v9 only uses CustomTextKey for "
        + "the message, and the framework sets Description from it, so Description was removed:";

    private const string BothSetSummary =
        "These validation issues set both Description and CustomTextKey. v9 only uses CustomTextKey for the message, "
        + "and the framework sets Description from it. Remove Description:";

    private readonly CSharpSourceScanner _scanner;
    private readonly IReadOnlySet<string> _textIds;
    private readonly IReadOnlyDictionary<string, string> _renamedTextIds;

    public ValidationDescriptionTextKeyMigration(
        CSharpSourceScanner scanner,
        IReadOnlySet<string> textIds,
        IReadOnlyDictionary<string, string> renamedTextIds
    )
    {
        _scanner = scanner;
        _textIds = textIds;
        _renamedTextIds = renamedTextIds;
    }

    public MigrationResult Migrate()
    {
        var moved = new List<string>();
        var removed = new List<string>();
        var bothSet = new List<string>();

        // Snapshot: Update replaces list entries, which would invalidate a live enumerator.
        foreach (var file in _scanner.Files.ToArray())
        {
            var model = file.SemanticModel;
            // Per initializer: remove Description, or move it to CustomTextKey with an optional renamed key.
            var edits = new Dictionary<InitializerExpressionSyntax, (bool Remove, string? RenamedKey)>();
            foreach (var creation in file.Root.DescendantNodes().OfType<BaseObjectCreationExpressionSyntax>())
            {
                if (
                    creation.Initializer is not { } initializer
                    || !initializer.IsKind(SyntaxKind.ObjectInitializerExpression)
                    || MemberAssignment(initializer, DescriptionName) is not { } description
                    || !IsValidationIssueDescription(creation, (IdentifierNameSyntax)description.Left, model)
                )
                {
                    continue;
                }

                var location = $"{file.RelativePath}:{file.GetLine(description)}";
                if (MemberAssignment(initializer, CustomTextKeyName) is { } customTextKey)
                {
                    if (SyntaxFactory.AreEquivalent(description.Right, customTextKey.Right))
                    {
                        edits[initializer] = (Remove: true, RenamedKey: null);
                        removed.Add(location);
                    }
                    else
                    {
                        bothSet.Add(location);
                    }

                    continue;
                }

                if (
                    description.Right is not LiteralExpressionSyntax literal
                    || !literal.IsKind(SyntaxKind.StringLiteralExpression)
                    || TextKeyFor(literal.Token.ValueText) is not { } textKey
                )
                {
                    continue;
                }

                var value = literal.Token.ValueText;
                edits[initializer] = (Remove: false, RenamedKey: textKey == value ? null : textKey);
                var unverified = model is null ? " (unverified: the app could not be compiled)" : "";
                moved.Add(
                    textKey == value
                        ? $"{location}: Description = \"{value}\" -> CustomTextKey{unverified}"
                        : $"{location}: Description = \"{value}\" -> CustomTextKey = \"{textKey}\"{unverified}"
                );
            }

            if (edits.Count == 0)
            {
                continue;
            }

            var updated = file.Root.ReplaceNodes(
                edits.Keys,
                (original, rewritten) =>
                    edits[original] is { Remove: true }
                        ? RemoveDescription(rewritten)
                        : MoveDescription(rewritten, edits[original].RenamedKey)
            );
            _scanner.Update(file, updated);
        }

        var messages = new List<UpgradeMessage>();
        if (moved.Count > 0)
        {
            messages.Warn(MovedSummary);
            messages.WarnRange(moved);
        }

        if (removed.Count > 0)
        {
            messages.Warn(RemovedSummary);
            messages.WarnRange(removed);
        }

        if (bothSet.Count > 0)
        {
            messages.Warn(BothSetSummary);
            messages.WarnRange(bothSet);
        }

        return new MigrationResult(messages);
    }

    /// <summary>
    /// The initializer's simple assignment to the member with the given name, if any.
    /// </summary>
    private static AssignmentExpressionSyntax? MemberAssignment(InitializerExpressionSyntax initializer, string name) =>
        initializer
            .Expressions.OfType<AssignmentExpressionSyntax>()
            .FirstOrDefault(assignment =>
                assignment.IsKind(SyntaxKind.SimpleAssignmentExpression)
                && assignment.Left is IdentifierNameSyntax identifier
                && identifier.Identifier.Text == name
            );

    private static bool IsValidationIssueDescription(
        BaseObjectCreationExpressionSyntax creation,
        IdentifierNameSyntax description,
        SemanticModel? model
    )
    {
        if (model is not null)
        {
            var info = model.GetSymbolInfo(description);
            var symbol = info.Symbol ?? info.CandidateSymbols.FirstOrDefault();
            return symbol is IPropertySymbol { Name: DescriptionName, ContainingType.Name: TypeName }
                && CSharpSemanticQueries.IsAltinnAppSymbol(symbol);
        }

        // Without a semantic model, only an explicit `new ValidationIssue` is certain enough.
        return creation is ObjectCreationExpressionSyntax { Type: var type }
            && type switch
            {
                IdentifierNameSyntax identifier => identifier.Identifier.Text == TypeName,
                QualifiedNameSyntax qualified => qualified.Right.Identifier.Text == TypeName,
                AliasQualifiedNameSyntax aliased => aliased.Name.Identifier.Text == TypeName,
                _ => false,
            };
    }

    /// <summary>
    /// The text key to use for a description value, or null when the value is not one of the app's text keys.
    /// </summary>
    private string? TextKeyFor(string value)
    {
        if (_textIds.Contains(value))
            return value;

        return _renamedTextIds.TryGetValue(value, out var renamed) && _textIds.Contains(renamed) ? renamed : null;
    }

    /// <summary>
    /// Assigns the Description value to <c>CustomTextKey</c> instead, replacing it with <paramref name="renamedKey"/>
    /// when set.
    /// </summary>
    private static InitializerExpressionSyntax MoveDescription(
        InitializerExpressionSyntax initializer,
        string? renamedKey
    )
    {
        var assignment = DescriptionAssignment(initializer);
        var left = SyntaxFactory.IdentifierName(CustomTextKeyName).WithTriviaFrom(assignment.Left);
        var right = renamedKey is null
            ? assignment.Right
            : SyntaxFactory
                .LiteralExpression(SyntaxKind.StringLiteralExpression, SyntaxFactory.Literal(renamedKey))
                .WithTriviaFrom(assignment.Right);
        return initializer.ReplaceNode(assignment, assignment.WithLeft(left).WithRight(right));
    }

    /// <summary>
    /// Removes the Description assignment, with its comma, keeping the layout of the members around it.
    /// </summary>
    private static InitializerExpressionSyntax RemoveDescription(InitializerExpressionSyntax initializer) =>
        initializer.WithExpressions(
            RemoveKeepingLayout(
                initializer.Expressions,
                initializer.Expressions.IndexOf(DescriptionAssignment(initializer))
            )
        );

    private static AssignmentExpressionSyntax DescriptionAssignment(InitializerExpressionSyntax initializer) =>
        MemberAssignment(initializer, DescriptionName)
        ?? throw new InvalidOperationException("The initializer does not set Description");

    /// <summary>
    /// Removes the item at <paramref name="index"/> with its comma, keeping the layout of the items around it.
    /// </summary>
    internal static SeparatedSyntaxList<TNode> RemoveKeepingLayout<TNode>(SeparatedSyntaxList<TNode> list, int index)
        where TNode : SyntaxNode
    {
        var removed = list[index];
        var remaining = list.RemoveAt(index);

        // Without a trailing comma, the last item's trailing trivia (such as the space before a closing brace) goes
        // with it, so give it to the item that is now last.
        if (index == list.Count - 1 && remaining.Count > 0 && list.SeparatorCount < list.Count)
        {
            var last = remaining[^1];
            remaining = remaining.Replace(last, last.WithTrailingTrivia(removed.GetTrailingTrivia()));
        }

        return remaining;
    }
}
