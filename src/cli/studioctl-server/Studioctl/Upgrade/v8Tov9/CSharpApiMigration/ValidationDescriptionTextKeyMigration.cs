using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Moves a text key that app code sets as <c>ValidationIssue.Description</c> to <c>CustomTextKey</c>. The v8 form
/// looked a description up as a text key; the v9 form shows it as text, so a key left there would show as the key
/// itself.
/// </summary>
/// <remarks>
/// <para>
/// A value moves when it is a string constant (a literal or a <c>const</c>) that is the id of one of the app's text
/// resources. A value that <see cref="TextResourceKeyMigration"/> renamed moves to the new id. A description with a
/// value only known at run time is listed, since it may be a text key the upgrade cannot see.
/// </para>
/// <para>
/// With a semantic model, <c>Description</c> must bind to the SDK's <c>ValidationIssue</c>. Without one, only object
/// initializers of a type spelled <c>ValidationIssue</c> are moved, and they are reported as unverified.
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

    private const string RuntimeSummary =
        "These validation issues set Description to a value the upgrade cannot read. The v9 form shows it as text; "
        + "if it is a text key, set CustomTextKey instead:";

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
        var conflicts = new List<string>();
        var runtime = new List<string>();

        // Snapshot: Update replaces list entries, which would invalidate a live enumerator.
        foreach (var file in _scanner.Files.ToArray())
        {
            var model = file.SemanticModel;
            var moves = new Dictionary<AssignmentExpressionSyntax, string?>();
            foreach (var assignment in file.Root.DescendantNodes().OfType<AssignmentExpressionSyntax>())
            {
                if (
                    !assignment.IsKind(SyntaxKind.SimpleAssignmentExpression)
                    || DescriptionNameOf(assignment) is not { } name
                    || !IsValidationIssueDescription(assignment, name, model)
                )
                {
                    continue;
                }

                var location = $"{file.RelativePath}:{file.GetLine(assignment)}";
                if (ConstantString(assignment.Right, model) is not { } value)
                {
                    runtime.Add($"{location}: Description = {Shorten(assignment.Right)}");
                    continue;
                }

                if (TextKeyFor(value) is not { } textKey)
                {
                    continue;
                }

                if (SetsCustomTextKeyToo(assignment))
                {
                    conflicts.Add(
                        $"{location}: Description is set to the text key '{value}', and CustomTextKey is set too. "
                            + "The v9 form shows the description as text; remove it or set it to a text"
                    );
                    continue;
                }

                moves[assignment] = textKey == value ? null : textKey;
                var unverified = model is null ? " (unverified: the app could not be compiled)" : "";
                moved.Add(
                    textKey == value
                        ? $"{location}: Description = \"{value}\" -> CustomTextKey{unverified}"
                        : $"{location}: Description = \"{value}\" -> CustomTextKey = \"{textKey}\"{unverified}"
                );
            }

            if (moves.Count == 0)
            {
                continue;
            }

            var updated = file.Root.ReplaceNodes(moves.Keys, (original, rewritten) => Move(rewritten, moves[original]));
            _scanner.Update(file, updated);
        }

        var messages = new List<UpgradeMessage>();
        if (moved.Count > 0)
        {
            messages.Warn(MovedSummary);
            messages.WarnRange(moved);
        }

        foreach (var conflict in conflicts)
        {
            messages.Todo(conflict);
        }

        if (runtime.Count > 0)
        {
            messages.Warn(RuntimeSummary);
            messages.WarnRange(runtime);
        }

        return new MigrationResult(messages);
    }

    /// <summary>
    /// The <c>Description</c> name being assigned, in an object initializer or through a member access.
    /// </summary>
    private static IdentifierNameSyntax? DescriptionNameOf(AssignmentExpressionSyntax assignment)
    {
        var name = assignment.Left switch
        {
            IdentifierNameSyntax identifier when IsObjectInitializerMember(assignment) => identifier,
            MemberAccessExpressionSyntax { Name: IdentifierNameSyntax memberName } => memberName,
            _ => null,
        };
        return name?.Identifier.Text == DescriptionName ? name : null;
    }

    private static string Shorten(ExpressionSyntax value)
    {
        const int maxLength = 80;
        var text = string.Join(" ", value.ToString().Split('\n', StringSplitOptions.TrimEntries));
        return text.Length <= maxLength ? text : text[..(maxLength - 3)] + "...";
    }

    private static bool IsObjectInitializerMember(AssignmentExpressionSyntax assignment) =>
        assignment.Parent is InitializerExpressionSyntax initializer
        && initializer.IsKind(SyntaxKind.ObjectInitializerExpression);

    private static bool IsValidationIssueDescription(
        AssignmentExpressionSyntax assignment,
        IdentifierNameSyntax name,
        SemanticModel? model
    )
    {
        if (model is not null)
        {
            var info = model.GetSymbolInfo(name);
            var symbol = info.Symbol ?? info.CandidateSymbols.FirstOrDefault();
            return symbol is IPropertySymbol { Name: DescriptionName, ContainingType.Name: TypeName }
                && CSharpSemanticQueries.IsAltinnAppSymbol(symbol);
        }

        // Without a semantic model, only an initializer of a type spelled ValidationIssue is certain enough.
        return IsObjectInitializerMember(assignment)
            && assignment.Parent?.Parent is ObjectCreationExpressionSyntax { Type: var type }
            && type switch
            {
                IdentifierNameSyntax identifier => identifier.Identifier.Text == TypeName,
                QualifiedNameSyntax qualified => qualified.Right.Identifier.Text == TypeName,
                AliasQualifiedNameSyntax aliased => aliased.Name.Identifier.Text == TypeName,
                _ => false,
            };
    }

    private static string? ConstantString(ExpressionSyntax value, SemanticModel? model)
    {
        if (model?.GetConstantValue(value) is { HasValue: true, Value: string constant })
            return constant;

        return value is LiteralExpressionSyntax literal && literal.IsKind(SyntaxKind.StringLiteralExpression)
            ? literal.Token.ValueText
            : null;
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

    private static bool SetsCustomTextKeyToo(AssignmentExpressionSyntax assignment) =>
        IsObjectInitializerMember(assignment)
        && ((InitializerExpressionSyntax)assignment.Parent!).Expressions.Any(expression =>
            expression
                is AssignmentExpressionSyntax { Left: IdentifierNameSyntax { Identifier.Text: CustomTextKeyName } }
        );

    /// <summary>
    /// Assigns the value to <c>CustomTextKey</c> instead, replacing it with <paramref name="renamedKey"/> when set.
    /// </summary>
    private static AssignmentExpressionSyntax Move(AssignmentExpressionSyntax assignment, string? renamedKey)
    {
        ExpressionSyntax left = assignment.Left switch
        {
            IdentifierNameSyntax identifier => SyntaxFactory
                .IdentifierName(CustomTextKeyName)
                .WithTriviaFrom(identifier),
            MemberAccessExpressionSyntax memberAccess => memberAccess.WithName(
                SyntaxFactory.IdentifierName(CustomTextKeyName).WithTriviaFrom(memberAccess.Name)
            ),
            _ => assignment.Left,
        };
        var right = renamedKey is null
            ? assignment.Right
            : SyntaxFactory
                .LiteralExpression(SyntaxKind.StringLiteralExpression, SyntaxFactory.Literal(renamedKey))
                .WithTriviaFrom(assignment.Right);
        return assignment.WithLeft(left).WithRight(right);
    }
}
