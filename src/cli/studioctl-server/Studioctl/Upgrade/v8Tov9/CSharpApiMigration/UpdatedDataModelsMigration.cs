using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Rewrites <c>result.AddUpdatedDataModel(dataElementId, model);</c>, removed from <c>UserActionResult</c> in v9, to
/// <c>await context.DataMutator.ReplaceFormData(new DataElementIdentifier(dataElementId), model);</c> on the
/// <c>UserActionContext</c> of the enclosing action. That is what v8 did with the models in
/// <c>UpdatedDataModels</c> after the action returned, so the form data is saved, validated and sent to the frontend
/// as before. Every other use of <c>AddUpdatedDataModel</c> and <c>UpdatedDataModels</c> is reported.
/// </summary>
/// <remarks>
/// <para>
/// A call is rewritten only when the semantic model binds it to the SDK's <c>UserActionResult</c>, it is a statement
/// of its own in an <c>async</c> method, not a lambda or local function, that has exactly one
/// <c>UserActionContext</c> parameter, it is not inside a <c>lock</c>, and its receiver is a plain variable, field or
/// property whose evaluation the rewrite can drop. Without a semantic model nothing is rewritten.
/// </para>
/// <para>
/// The rewrite replaces the form data where the call is made rather than after the action returns, so code after
/// the call that reads the form through the mutator sees the new model, and an action that ends in a failure result
/// still discards it, as v8 did. <c>DataElementIdentifier</c> is written qualified for
/// <see cref="GeneratedTypeReferenceFinalizer"/> to simplify. <c>ReplaceFormData</c> is an extension method in
/// <c>Altinn.App.Core.Features</c>, which the upgrade makes a global using; a file that would not see it gets a using
/// directive for it.
/// </para>
/// <para>
/// A model read through <c>context.DataMutator.GetFormData</c> is already tracked, so the call is not needed for it.
/// Telling that apart reliably takes more than the syntax shows, so every rewritten call gets a comment saying so
/// and the developer decides.
/// </para>
/// </remarks>
internal sealed class UpdatedDataModelsMigration
{
    private const string ResultTypeName = "UserActionResult";
    private const string ContextTypeName = "UserActionContext";
    private const string AddMethodName = "AddUpdatedDataModel";
    private const string PropertyName = "UpdatedDataModels";
    private const string IdParameterName = "dataModelId";
    private const string ModelParameterName = "dataModel";
    private const string DataMutatorPropertyName = "DataMutator";
    private const string ReplaceMethodName = "ReplaceFormData";
    private const string ExtensionNamespace = "Altinn.App.Core.Features";
    private const string IdentifierTypeName = "Altinn.App.Core.Models.DataElementIdentifier";

    private static readonly IReadOnlySet<string> _removedMemberNames = new HashSet<string>(StringComparer.Ordinal)
    {
        AddMethodName,
        PropertyName,
    };

    private static readonly IReadOnlySet<string> _resultTypeNames = new HashSet<string>(StringComparer.Ordinal)
    {
        ResultTypeName,
    };

    private static readonly IReadOnlySet<string> _propertyNames = new HashSet<string>(StringComparer.Ordinal)
    {
        PropertyName,
    };

    private const string RewriteSummary =
        "UserActionResult.AddUpdatedDataModel is removed in v9. These calls now replace the form data through the "
        + "action's context: await context.DataMutator.ReplaceFormData(new DataElementIdentifier(id), model). The "
        + "model replaces the form data where the call is made instead of after the action returns, so later reads "
        + "through context.DataMutator see it. A model read through context.DataMutator.GetFormData is already "
        + "tracked, so the call is not needed for it and can be removed. Rewrites:";

    private const string LeftoverSummary =
        "UserActionResult.AddUpdatedDataModel and UserActionResult.UpdatedDataModels are removed in v9. Change the "
        + "form data through the action's context instead: modify the model from context.DataMutator.GetFormData, or "
        + "replace it with await context.DataMutator.ReplaceFormData(new DataElementIdentifier(id), model). Changes "
        + "made through the mutator are saved, validated and returned to the frontend when the action succeeds. "
        + "Uses found:";

    private readonly CSharpSourceScanner _scanner;
    private readonly IReadOnlySet<string> _globalNamespaces;

    /// <param name="scanner">The live view of the app's source.</param>
    /// <param name="globalNamespaces">The namespaces the project imports in every file.</param>
    public UpdatedDataModelsMigration(CSharpSourceScanner scanner, IReadOnlySet<string> globalNamespaces)
    {
        _scanner = scanner;
        _globalNamespaces = globalNamespaces;
    }

    public MigrationResult Migrate()
    {
        var changes = new List<string>();
        var leftovers = new List<CSharpApiMatch>();
        var rewrites = new List<(ScannedCSharpFile File, CompilationUnitSyntax Root)>();

        // Every file is rewritten before any is written back, so each binds against the compilation it was read with.
        foreach (var file in _scanner.Files)
        {
            if (!MentionsRemovedMember(file))
            {
                continue;
            }

            if (file.SemanticModel is not { } semanticModel)
            {
                leftovers.AddRange(SyntaxMatches(file));
                continue;
            }

            var plans = new List<Rewrite>();
            foreach (var name in RemovedMemberNames(file, semanticModel))
            {
                if (PlanRewrite(semanticModel, name) is { } plan)
                {
                    plans.Add(plan);
                    changes.Add(
                        $"{file.RelativePath}:{file.GetLine(plan.Statement)}: {plan.Receiver}.{AddMethodName}(..) -> "
                            + $"await {plan.Context.ValueText}.{DataMutatorPropertyName}.{ReplaceMethodName}(..)"
                    );
                    continue;
                }

                leftovers.Add(new CSharpApiMatch(file.RelativePath, file.GetLine(name), name.Identifier.Text));
            }

            if (plans.Count > 0)
            {
                rewrites.Add((file, Apply(file.Root, plans)));
            }
        }

        foreach (var (file, root) in rewrites)
        {
            _scanner.Update(file, root);
        }

        var messages = new List<UpgradeMessage>();
        if (changes.Count > 0)
        {
            messages.Warn(RewriteSummary);
            messages.WarnRange(changes);
        }

        messages.AddRange(WarnOnlyDetector.Report(LeftoverSummary, leftovers).Messages);
        return new MigrationResult(messages);
    }

    private static bool MentionsRemovedMember(ScannedCSharpFile file) =>
        file
            .Root.DescendantNodes()
            .OfType<SimpleNameSyntax>()
            .Any(static name => _removedMemberNames.Contains(name.Identifier.Text));

    /// <summary>
    /// Without a semantic model the member names are distinctive enough to report on their own, at the cost of also
    /// listing <c>UserActionResponse.UpdatedDataModels</c>, which v9 keeps.
    /// </summary>
    private static IEnumerable<CSharpApiMatch> SyntaxMatches(ScannedCSharpFile file) =>
        CSharpSyntaxQueries
            .InvokedMethodsWithArity(file, AddMethodName, argumentCount: 2)
            .Concat(CSharpSyntaxQueries.MemberReferences(file, _propertyNames))
            .Concat(CSharpSyntaxQueries.ObjectInitializerMembers(file, _resultTypeNames, _propertyNames));

    /// <summary>The names in the file that bind to one of the removed members of the SDK's <c>UserActionResult</c>.</summary>
    private static IEnumerable<SimpleNameSyntax> RemovedMemberNames(ScannedCSharpFile file, SemanticModel semanticModel)
    {
        foreach (var name in file.Root.DescendantNodes().OfType<SimpleNameSyntax>())
        {
            if (!_removedMemberNames.Contains(name.Identifier.Text))
            {
                continue;
            }

            var info = semanticModel.GetSymbolInfo(name);
            var symbol = info.Symbol ?? info.CandidateSymbols.FirstOrDefault();
            if (
                symbol is IMethodSymbol or IPropertySymbol
                && symbol.ContainingType?.Name == ResultTypeName
                && CSharpSemanticQueries.IsAltinnAppSymbol(symbol)
            )
            {
                yield return name;
            }
        }
    }

    /// <summary>The rewrite of the call <paramref name="name"/> names, or <c>null</c> when it is not safe.</summary>
    private static Rewrite? PlanRewrite(SemanticModel semanticModel, SimpleNameSyntax name)
    {
        if (
            name.Identifier.Text != AddMethodName
            || name.Parent is not MemberAccessExpressionSyntax memberAccess
            || memberAccess.Name != name
            || memberAccess.Parent is not InvocationExpressionSyntax invocation
            || invocation.Expression != memberAccess
            || invocation.Parent is not ExpressionStatementSyntax statement
            || !CanDrop(memberAccess.Expression)
            || Arguments(invocation.ArgumentList) is not { } arguments
            || EnclosingAsyncMethod(statement) is not { } method
            || ContextParameter(semanticModel, method) is not { } context
        )
        {
            return null;
        }

        return new Rewrite(
            statement,
            invocation.ArgumentList,
            arguments.Id,
            arguments.Model,
            context,
            memberAccess.Expression.ToString()
        );
    }

    /// <summary>
    /// Whether the receiver can be left out of the rewritten statement without losing an effect: a variable, a
    /// parameter, or a field or property reached through them or <c>this</c>.
    /// </summary>
    private static bool CanDrop(ExpressionSyntax receiver) =>
        receiver switch
        {
            IdentifierNameSyntax or ThisExpressionSyntax => true,
            MemberAccessExpressionSyntax { Name: IdentifierNameSyntax } access => CanDrop(access.Expression),
            ParenthesizedExpressionSyntax parenthesized => CanDrop(parenthesized.Expression),
            _ => false,
        };

    /// <summary>The id and model arguments, positional or named, or <c>null</c> for any other shape.</summary>
    private static (ExpressionSyntax Id, ExpressionSyntax Model)? Arguments(ArgumentListSyntax argumentList)
    {
        var arguments = argumentList.Arguments;
        if (arguments.Count != 2 || arguments.Any(static argument => argument.RefKindKeyword != default))
        {
            return null;
        }

        if (arguments.All(static argument => argument.NameColon is null))
        {
            return (arguments[0].Expression, arguments[1].Expression);
        }

        // A positional argument can only come before the named ones, where it is the id.
        var id = arguments[0].NameColon is null
            ? arguments[0]
            : arguments.FirstOrDefault(static a => a.NameColon?.Name.Identifier.Text == IdParameterName);
        var model = arguments.FirstOrDefault(static a => a.NameColon?.Name.Identifier.Text == ModelParameterName);
        if (id is null || model is null)
        {
            return null;
        }

        return (id.Expression, model.Expression);
    }

    /// <summary>
    /// The method the statement runs in when it is <c>async</c>, so an <c>await</c> can be added, and the statement is
    /// not inside a lambda, local function or <c>lock</c>.
    /// </summary>
    private static MethodDeclarationSyntax? EnclosingAsyncMethod(StatementSyntax statement)
    {
        foreach (var ancestor in statement.Ancestors())
        {
            switch (ancestor)
            {
                case LockStatementSyntax:
                case AnonymousFunctionExpressionSyntax:
                case LocalFunctionStatementSyntax:
                    return null;
                case MethodDeclarationSyntax method:
                    return method.Modifiers.Any(SyntaxKind.AsyncKeyword) ? method : null;
                case MemberDeclarationSyntax:
                    return null;
            }
        }

        return null;
    }

    /// <summary>The method's only parameter of the SDK's <c>UserActionContext</c> type.</summary>
    private static SyntaxToken? ContextParameter(SemanticModel semanticModel, MethodDeclarationSyntax method)
    {
        var contexts = method
            .ParameterList.Parameters.Where(parameter =>
                semanticModel.GetDeclaredSymbol(parameter)?.Type is { Name: ContextTypeName } type
                && CSharpSemanticQueries.IsAltinnAppSymbol(type)
            )
            .ToList();

        return contexts.Count == 1 ? contexts[0].Identifier.WithoutTrivia() : null;
    }

    private CompilationUnitSyntax Apply(CompilationUnitSyntax root, List<Rewrite> plans)
    {
        var byStatement = plans.ToDictionary(static plan => plan.Statement);
        var rewritten = root.ReplaceNodes(
            byStatement.Keys,
            (original, current) =>
                WithNote(current.WithExpression(Replacement(byStatement[original], current.Expression)))
        );

        return SeesExtensionNamespace(rewritten) ? rewritten : WithExtensionUsing(rewritten);
    }

    private const string Note =
        "// Not needed if the model came from DataMutator.GetFormData, which tracks its changes.";

    /// <summary>Puts <see cref="Note"/> on its own line above the statement, indented like it.</summary>
    private static ExpressionStatementSyntax WithNote(ExpressionStatementSyntax statement)
    {
        var leading = statement.GetLeadingTrivia();
        var indentation = leading.Count > 0 && leading[^1].IsKind(SyntaxKind.WhitespaceTrivia) ? leading[^1] : default;
        var endOfLine = statement
            .DescendantTrivia()
            .Concat(statement.GetTrailingTrivia())
            .FirstOrDefault(static trivia => trivia.IsKind(SyntaxKind.EndOfLineTrivia))
            is { RawKind: not 0 } existing
            ? existing
            : SyntaxFactory.LineFeed;

        SyntaxTrivia[] note =
            indentation.RawKind == 0
                ? [SyntaxFactory.Comment(Note), endOfLine]
                : [SyntaxFactory.Comment(Note), endOfLine, indentation];
        return statement.WithLeadingTrivia(leading.AddRange(note));
    }

    /// <summary>
    /// <c>await context.DataMutator.ReplaceFormData(new DataElementIdentifier(id), model)</c>, keeping the layout of
    /// a call with positional arguments.
    /// </summary>
    private static ExpressionSyntax Replacement(Rewrite plan, ExpressionSyntax replaced)
    {
        var identifier = SyntaxFactory.ObjectCreationExpression(
            SyntaxFactory.Token(SyntaxKind.NewKeyword).WithTrailingTrivia(SyntaxFactory.Space),
            GeneratedTypeReferenceFinalizer.Reference(IdentifierTypeName),
            SyntaxFactory.ArgumentList(
                SyntaxFactory.SingletonSeparatedList(SyntaxFactory.Argument(plan.Id.WithoutTrivia()))
            ),
            initializer: null
        );

        var original = plan.ArgumentList;
        ArgumentListSyntax arguments;
        if (original.Arguments.All(static argument => argument.NameColon is null))
        {
            var first = original.Arguments[0];
            arguments = original.ReplaceNode(first, first.WithExpression(identifier.WithTriviaFrom(first.Expression)));
        }
        else
        {
            arguments = SyntaxFactory.ArgumentList(
                SyntaxFactory.SeparatedList(
                    [SyntaxFactory.Argument(identifier), SyntaxFactory.Argument(plan.Model.WithoutTrivia())],
                    [SyntaxFactory.Token(SyntaxKind.CommaToken).WithTrailingTrivia(SyntaxFactory.Space)]
                )
            );
        }

        var mutator = SyntaxFactory.MemberAccessExpression(
            SyntaxKind.SimpleMemberAccessExpression,
            SyntaxFactory.IdentifierName(plan.Context),
            SyntaxFactory.IdentifierName(DataMutatorPropertyName)
        );
        var call = SyntaxFactory.InvocationExpression(
            SyntaxFactory.MemberAccessExpression(
                SyntaxKind.SimpleMemberAccessExpression,
                mutator,
                SyntaxFactory.IdentifierName(ReplaceMethodName)
            ),
            arguments
        );

        return SyntaxFactory
            .AwaitExpression(SyntaxFactory.Token(SyntaxKind.AwaitKeyword).WithTrailingTrivia(SyntaxFactory.Space), call)
            .WithTriviaFrom(replaced);
    }

    private bool SeesExtensionNamespace(CompilationUnitSyntax root) =>
        _globalNamespaces.Contains(ExtensionNamespace)
        || root.DescendantNodes()
            .OfType<UsingDirectiveSyntax>()
            .Any(static directive =>
                directive.Alias is null
                && !directive.StaticKeyword.IsKind(SyntaxKind.StaticKeyword)
                && directive.Name?.WithoutTrivia().ToString() is ExtensionNamespace or "global::" + ExtensionNamespace
            );

    /// <summary>Adds <c>using Altinn.App.Core.Features;</c> after the file's last top-level using directive.</summary>
    private static CompilationUnitSyntax WithExtensionUsing(CompilationUnitSyntax root)
    {
        var endOfLine = root.DescendantTrivia()
            .FirstOrDefault(static trivia => trivia.IsKind(SyntaxKind.EndOfLineTrivia))
            is { RawKind: not 0 } existing
            ? existing
            : SyntaxFactory.LineFeed;
        var directive = SyntaxFactory
            .UsingDirective(SyntaxFactory.ParseName(ExtensionNamespace))
            .NormalizeWhitespace()
            .WithTrailingTrivia(endOfLine);

        if (root.Usings.Count == 0)
        {
            // Separate it from the code that follows like a using block is.
            directive = directive.WithTrailingTrivia(endOfLine, endOfLine);
        }

        return root.WithUsings(root.Usings.Add(directive));
    }

    private sealed record Rewrite(
        ExpressionStatementSyntax Statement,
        ArgumentListSyntax ArgumentList,
        ExpressionSyntax Id,
        ExpressionSyntax Model,
        SyntaxToken Context,
        string Receiver
    );
}
