using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Removes <c>using</c> directives for the Application Insights SDK (<c>Microsoft.ApplicationInsights</c> and its
/// namespaces, <c>using static</c> included) from files that use nothing from the SDK. v8 brought the SDK in through
/// <c>Altinn.App.Api</c> and v9 does not, so such a directive, often left behind by an IDE, would stop the app from
/// compiling for no reason.
/// <para>
/// A file's directives go only when the v8 semantic model shows that nothing else in the file binds to a symbol of
/// the SDK, its assemblies or its namespaces. Without a semantic model nothing is removed, and
/// <see cref="ApplicationInsightsUsageDetector"/> reports the directives instead, as it does for files that do use
/// the SDK.
/// </para>
/// </summary>
internal sealed class UnusedApplicationInsightsUsingMigration
{
    private const string SdkNamespace = "Microsoft.ApplicationInsights";

    private readonly CSharpSourceScanner _scanner;

    public UnusedApplicationInsightsUsingMigration(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    /// <summary>Whether any file has a using directive for the SDK.</summary>
    public bool HasSdkUsings => _scanner.Files.Any(static file => SdkUsings(file.Root).Any());

    public MigrationResult Migrate()
    {
        var messages = new List<UpgradeMessage>();
        // Update replaces the file instance in the scanner, so iterate over a snapshot of the list.
        foreach (var file in _scanner.Files.ToArray())
        {
            var directives = SdkUsings(file.Root).ToArray();
            if (directives.Length == 0 || !UsesNothingFromTheSdk(file))
                continue;

            _scanner.Update(file, RedundantUsingDirectiveMigration.Remove(file.Root, directives));
            var names = string.Join(", ", directives.Select(static directive => directive.Name?.ToString()));
            messages.Ok(
                $"Removed the unused using directive(s) for {names} from {file.RelativePath}: v9 no longer brings in "
                    + "the Application Insights SDK."
            );
        }

        return new MigrationResult(messages);
    }

    private static IEnumerable<UsingDirectiveSyntax> SdkUsings(CompilationUnitSyntax root) =>
        root.DescendantNodes()
            .OfType<UsingDirectiveSyntax>()
            .Where(static directive => directive.Alias is null && directive.Name is { } name && IsSdkName(Text(name)));

    /// <summary>
    /// Whether nothing in the file, apart from its using directives, binds to the SDK. Bound against the pristine
    /// (v8) view, where every name the app used still resolves; earlier steps only move code toward v9.
    /// </summary>
    private bool UsesNothingFromTheSdk(ScannedCSharpFile file)
    {
        var pristine = _scanner.PristineView.Files.FirstOrDefault(candidate =>
            string.Equals(candidate.Path, file.Path, StringComparison.Ordinal)
        );
        if (pristine?.SemanticModel is not { } model)
            return false;

        if (model.GetDiagnostics().Any(static diagnostic => diagnostic.Severity == DiagnosticSeverity.Error))
            return false;

        foreach (var node in pristine.Root.DescendantNodes(static node => node is not UsingDirectiveSyntax))
        {
            if (node is UsingDirectiveSyntax)
                continue;

            foreach (var symbol in BoundSymbols(model, node))
            {
                if (IsSdkSymbol(symbol))
                    return false;
            }
        }

        return true;
    }

    /// <summary>
    /// The symbols a node binds to, including those bound implicitly, such as an extension <c>Add</c>,
    /// <c>GetEnumerator</c> or <c>GetAwaiter</c>, which a namespace import can bring in too.
    /// </summary>
    private static IEnumerable<ISymbol> BoundSymbols(SemanticModel model, SyntaxNode node)
    {
        IEnumerable<ISymbol?> symbols = node switch
        {
            SimpleNameSyntax or AttributeSyntax or QueryClauseSyntax or OrderingSyntax or SelectOrGroupClauseSyntax =>
                Symbols(model.GetSymbolInfo(node)),
            CommonForEachStatementSyntax forEach =>
            [
                model.GetForEachStatementInfo(forEach).GetEnumeratorMethod,
                model.GetForEachStatementInfo(forEach).MoveNextMethod,
                model.GetForEachStatementInfo(forEach).CurrentProperty,
            ],
            AwaitExpressionSyntax awaitExpression => [model.GetAwaitExpressionInfo(awaitExpression).GetAwaiterMethod],
            ExpressionSyntax element
                when node.Parent is InitializerExpressionSyntax initializer
                    && initializer.IsKind(SyntaxKind.CollectionInitializerExpression) => Symbols(
                model.GetCollectionInitializerSymbolInfo(element)
            ),
            _ => [],
        };

        return symbols.OfType<ISymbol>();
    }

    private static IEnumerable<ISymbol?> Symbols(SymbolInfo info) => [info.Symbol, .. info.CandidateSymbols];

    private static bool IsSdkSymbol(ISymbol symbol)
    {
        var definition = symbol is IMethodSymbol { ReducedFrom: { } extension } ? extension : symbol.OriginalDefinition;
        if (definition.ContainingAssembly?.Name is { } assembly && IsSdkName(assembly))
            return true;

        var ns = definition as INamespaceSymbol ?? definition.ContainingNamespace;
        return ns is not null && IsSdkName(ns.ToDisplayString());
    }

    private static bool IsSdkName(string name) =>
        name.Equals(SdkNamespace, StringComparison.Ordinal)
        || name.StartsWith(SdkNamespace + ".", StringComparison.Ordinal);

    private static string Text(NameSyntax name)
    {
        var text = string.Concat(name.WithoutTrivia().ToString().Where(static c => !char.IsWhiteSpace(c)));
        const string globalAlias = "global::";
        return text.StartsWith(globalAlias, StringComparison.Ordinal) ? text[globalAlias.Length..] : text;
    }
}
