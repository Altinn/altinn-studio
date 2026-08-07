using Microsoft.CodeAnalysis.Operations;

namespace Altinn.App.Analyzers;

/// <summary>
/// Reports a call whose result is a builder stage marked with <c>[IncompleteBuilder]</c> (an internal
/// Altinn.App.Core attribute) and is then thrown away — e.g. <c>services.AddEFormidling();</c>, which
/// registers everything except the one implementation the app must supply itself. The attribute carries
/// the remediation text, so this analyzer stays generic over whichever builders the SDK stages.
/// </summary>
/// <remarks>
/// Deliberately limited to a result that is discarded outright, which is visible in a single operation
/// node. Proving the opposite — that a builder stored in a local, passed to a helper or returned from a
/// method is never completed — needs dataflow that cannot be sound across method boundaries, and a false
/// positive here breaks an app's build. Staged builder types already make the wrong <em>order</em>
/// uncompilable, and app startup validates what neither can see.
/// </remarks>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class IncompleteBuilderAnalyzer : DiagnosticAnalyzer
{
    private const string AttributeFullName = "Altinn.App.Core.Features.IncompleteBuilderAttribute";

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        [Diagnostics.Contracts.IncompleteBuilderDiscarded];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();

        context.RegisterCompilationStartAction(startContext =>
        {
            var attributeSymbol = startContext.Compilation.GetTypeByMetadataName(AttributeFullName);
            if (attributeSymbol is null)
                return;

            startContext.RegisterOperationAction(ctx => Analyze(ctx, attributeSymbol), OperationKind.Invocation);
        });
    }

    private static void Analyze(OperationAnalysisContext context, INamedTypeSymbol attributeSymbol)
    {
        if (context.Operation is not IInvocationOperation invocation)
            return;

        // The result is used for something the moment the invocation is not the whole statement.
        if (invocation.Parent is not IExpressionStatementOperation)
            return;

        // The exact return type only, never its interfaces: a completed builder deriving from the stage
        // it completes is a natural design, and walking upwards would report the correct use of one.
        if (invocation.Type is not INamedTypeSymbol returnType)
            return;

        AttributeData? marker = null;
        foreach (AttributeData attribute in returnType.GetAttributes())
        {
            if (SymbolEqualityComparer.Default.Equals(attribute.AttributeClass, attributeSymbol))
            {
                marker = attribute;
                break;
            }
        }

        if (marker is null)
            return;

        string guidance = marker.ConstructorArguments.FirstOrDefault().Value as string ?? "";

        context.ReportDiagnostic(
            Diagnostic.Create(
                Diagnostics.Contracts.IncompleteBuilderDiscarded,
                invocation.Syntax.GetLocation(),
                invocation.TargetMethod.Name,
                returnType.Name,
                guidance
            )
        );
    }
}
