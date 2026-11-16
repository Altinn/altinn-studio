namespace Altinn.App.Analyzers;

/// <summary>
/// Reports async methods, local functions and lambdas that return <c>void</c> in an app. Nothing can await them, so
/// the caller carries on before they finish, and an exception they throw cannot be caught and takes down the app.
/// Event handlers, shaped <c>(object sender, EventArgs e)</c>, are allowed, since the event decides their signature.
/// </summary>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class AsyncVoidAnalyzer : DiagnosticAnalyzer
{
    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics => [Diagnostics.CodeSmells.AsyncVoid];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();

        context.RegisterCompilationStartAction(startContext =>
        {
            if (!startContext.Options.AnalyzerConfigOptionsProvider.IsAltinnApp())
                return;

            var eventArgs = startContext.Compilation.GetTypeByMetadataName("System.EventArgs");

            startContext.RegisterSyntaxNodeAction(
                nodeContext => Analyze(nodeContext, eventArgs),
                SyntaxKind.MethodDeclaration,
                SyntaxKind.LocalFunctionStatement,
                SyntaxKind.ParenthesizedLambdaExpression,
                SyntaxKind.SimpleLambdaExpression,
                SyntaxKind.AnonymousMethodExpression
            );
        });
    }

    private static void Analyze(SyntaxNodeAnalysisContext context, INamedTypeSymbol? eventArgs)
    {
        var (modifiers, description) = context.Node switch
        {
            MethodDeclarationSyntax method => (method.Modifiers, $"Method '{method.Identifier.ValueText}'"),
            LocalFunctionStatementSyntax function => (
                function.Modifiers,
                $"Local function '{function.Identifier.ValueText}'"
            ),
            AnonymousFunctionExpressionSyntax function => (function.Modifiers, "This lambda"),
            _ => default,
        };

        var asyncKeyword = modifiers.FirstOrDefault(m => m.IsKind(SyntaxKind.AsyncKeyword));
        if (!asyncKeyword.IsKind(SyntaxKind.AsyncKeyword))
            return;

        var symbol =
            context.Node is AnonymousFunctionExpressionSyntax
                ? context.SemanticModel.GetSymbolInfo(context.Node, context.CancellationToken).Symbol
                : context.SemanticModel.GetDeclaredSymbol(context.Node, context.CancellationToken);
        if (symbol is not IMethodSymbol { ReturnsVoid: true } methodSymbol)
            return;

        if (IsEventHandler(methodSymbol, eventArgs))
            return;

        context.ReportDiagnostic(
            Diagnostic.Create(Diagnostics.CodeSmells.AsyncVoid, asyncKeyword.GetLocation(), description)
        );
    }

    private static bool IsEventHandler(IMethodSymbol method, INamedTypeSymbol? eventArgs)
    {
        if (eventArgs is null || method.Parameters.Length != 2)
            return false;
        if (method.Parameters[0].Type.SpecialType != SpecialType.System_Object)
            return false;

        for (var type = method.Parameters[1].Type; type is not null; type = type.BaseType)
        {
            if (SymbolEqualityComparer.Default.Equals(type, eventArgs))
                return true;
        }
        return false;
    }
}
