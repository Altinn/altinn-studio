using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Handles the <c>description</c> argument of <c>GenericFormDataValidator.CreateValidationIssue</c>, which always sets
/// <c>CustomTextKey</c> from <c>textKey</c>. v9 only uses <c>CustomTextKey</c> for the message, and the framework sets
/// the description from it. So a <c>description</c> that is the same as <c>textKey</c> is removed, and a different one
/// is reported with a warning. This is the same rule <see cref="ValidationDescriptionTextKeyMigration"/> applies to
/// <c>ValidationIssue</c> initializers.
/// </summary>
/// <remarks>
/// With a semantic model, the call must bind to the SDK's <c>GenericFormDataValidator</c>. Without one, only calls
/// inside a class whose base type is spelled <c>GenericFormDataValidator</c> are handled, and they are reported as
/// unverified.
/// </remarks>
internal sealed class CreateValidationIssueDescriptionMigration
{
    private const string MethodName = "CreateValidationIssue";
    private const string ValidatorTypeName = "GenericFormDataValidator";

    // The parameters of CreateValidationIssue, the same in v8 and v9.
    private static readonly string[] _parameterNames =
    [
        "selector",
        "textKey",
        "severity",
        "description",
        "code",
        "customTextParameters",
    ];
    private const int TextKeyIndex = 1;
    private const int DescriptionIndex = 3;

    private const string RemovedSummary =
        "These CreateValidationIssue calls pass the same description as textKey. v9 only uses textKey for the "
        + "message, and the framework sets the description from it, so the description argument was removed:";

    private const string BothSetSummary =
        "These CreateValidationIssue calls pass both textKey and description. v9 only uses textKey for the message, "
        + "and the framework sets the description from it. Remove the description argument:";

    private readonly CSharpSourceScanner _scanner;

    public CreateValidationIssueDescriptionMigration(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Migrate()
    {
        var removed = new List<string>();
        var bothSet = new List<string>();

        // Snapshot: Update replaces list entries, which would invalidate a live enumerator.
        foreach (var file in _scanner.Files.ToArray())
        {
            var model = file.SemanticModel;
            var removals = new List<InvocationExpressionSyntax>();
            foreach (var invocation in file.Root.DescendantNodes().OfType<InvocationExpressionSyntax>())
            {
                if (
                    MethodNameOf(invocation) != MethodName
                    || !IsCreateValidationIssue(invocation, model)
                    || Argument(invocation.ArgumentList, DescriptionIndex) is not { } description
                    || description.Expression.IsKind(SyntaxKind.NullLiteralExpression)
                    || Argument(invocation.ArgumentList, TextKeyIndex) is not { } textKey
                )
                {
                    continue;
                }

                var unverified = model is null ? " (unverified: the app could not be compiled)" : "";
                var location = $"{file.RelativePath}:{file.GetLine(description)}{unverified}";
                if (SyntaxFactory.AreEquivalent(description.Expression, textKey.Expression))
                {
                    removals.Add(invocation);
                    removed.Add(location);
                }
                else
                {
                    bothSet.Add(location);
                }
            }

            if (removals.Count == 0)
            {
                continue;
            }

            var updated = file.Root.ReplaceNodes(removals, (_, rewritten) => RemoveDescription(rewritten));
            _scanner.Update(file, updated);
        }

        var messages = new List<UpgradeMessage>();
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

    private static string? MethodNameOf(InvocationExpressionSyntax invocation) =>
        invocation.Expression switch
        {
            SimpleNameSyntax name => name.Identifier.Text,
            MemberAccessExpressionSyntax { Name: var name } => name.Identifier.Text,
            _ => null,
        };

    private static bool IsCreateValidationIssue(InvocationExpressionSyntax invocation, SemanticModel? model)
    {
        if (model is not null)
        {
            var info = model.GetSymbolInfo(invocation);
            var symbol = info.Symbol ?? info.CandidateSymbols.FirstOrDefault();
            return symbol is IMethodSymbol { Name: MethodName } method
                && method.ContainingType.OriginalDefinition.Name == ValidatorTypeName
                && CSharpSemanticQueries.IsAltinnAppSymbol(method);
        }

        // Without a semantic model, only a call inside a class that derives from GenericFormDataValidator.
        return invocation.FirstAncestorOrSelf<ClassDeclarationSyntax>()?.BaseList is { } baseList
            && baseList.Types.Any(baseType =>
                baseType.Type switch
                {
                    GenericNameSyntax generic => generic.Identifier.Text == ValidatorTypeName,
                    QualifiedNameSyntax { Right: GenericNameSyntax generic } => generic.Identifier.Text
                        == ValidatorTypeName,
                    _ => false,
                }
            );
    }

    /// <summary>
    /// The argument for the parameter at <paramref name="index"/>, passed by name or by position.
    /// </summary>
    private static ArgumentSyntax? Argument(ArgumentListSyntax arguments, int index)
    {
        var named = arguments.Arguments.FirstOrDefault(argument =>
            argument.NameColon?.Name.Identifier.Text == _parameterNames[index]
        );
        if (named is not null)
            return named;

        var list = arguments.Arguments;
        return index < list.Count && list.Take(index + 1).All(argument => argument.NameColon is null)
            ? list[index]
            : null;
    }

    /// <summary>
    /// Removes the description argument. Positional arguments after it are named, so they keep their parameter.
    /// </summary>
    private static InvocationExpressionSyntax RemoveDescription(InvocationExpressionSyntax invocation)
    {
        var arguments = invocation.ArgumentList.Arguments;
        var description =
            Argument(invocation.ArgumentList, DescriptionIndex)
            ?? throw new InvalidOperationException("The call has no description argument to remove");
        var index = arguments.IndexOf(description);

        for (var i = index + 1; i < arguments.Count; i++)
        {
            if (arguments[i].NameColon is null && i < _parameterNames.Length)
            {
                var nameColon = SyntaxFactory.NameColon(
                    SyntaxFactory.IdentifierName(_parameterNames[i]),
                    SyntaxFactory.Token(SyntaxKind.ColonToken).WithTrailingTrivia(SyntaxFactory.Space)
                );
                var argument = arguments[i];
                arguments = arguments.Replace(
                    argument,
                    argument
                        .WithNameColon(nameColon.WithLeadingTrivia(argument.GetLeadingTrivia()))
                        .WithExpression(argument.Expression.WithoutLeadingTrivia())
                );
            }
        }

        var remaining = ValidationDescriptionTextKeyMigration.RemoveKeepingLayout(arguments, index);
        return invocation.WithArgumentList(invocation.ArgumentList.WithArguments(remaining));
    }
}
