using Microsoft.CodeAnalysis.Operations;

namespace Altinn.App.Analyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class HttpContextAccessorUsageAnalyzer : DiagnosticAnalyzer
{
    private static readonly SymbolEqualityComparer _comparer = SymbolEqualityComparer.Default;

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        [Diagnostics.CodeSmells.HttpContextAccessorUsage];

    public override void Initialize(AnalysisContext context)
    {
        var configFlags = GeneratedCodeAnalysisFlags.None;
        context.ConfigureGeneratedCodeAnalysis(configFlags);
        context.EnableConcurrentExecution();

        context.RegisterCompilationStartAction(startContext =>
        {
            var httpContextAccessorSymbol = startContext.Compilation.GetTypeByMetadataName(
                "Microsoft.AspNetCore.Http.IHttpContextAccessor"
            );
            if (httpContextAccessorSymbol is null)
                return;
            var relevantProperties = httpContextAccessorSymbol.GetMembers("HttpContext");
            if (relevantProperties.Length == 0)
                return;
            if (relevantProperties[0] is not IPropertySymbol httpContextPropertySymbol)
                return;

            startContext.RegisterOperationAction(
                context => Analyze(context, httpContextPropertySymbol),
                OperationKind.PropertyReference
            );
        });
    }

    private static void Analyze(OperationAnalysisContext context, IPropertySymbol httpContextAccessorPropertySymbol)
    {
        if (context.Operation is not IPropertyReferenceOperation propertyReference)
            return;

        // Check if the member access is a call to IHttpContextAccessor
        if (!_comparer.Equals(httpContextAccessorPropertySymbol, propertyReference.Property))
            return;

        // Checks if we are referencing `HttpContext` in a constructor
        var parent = propertyReference.Parent;
        while (parent != null)
        {
            if (
                parent is IConstructorBodyOperation
                || parent is IFieldInitializerOperation
                || parent is IPropertyInitializerOperation
            )
            {
                var diagnostic = Diagnostic.Create(
                    Diagnostics.CodeSmells.HttpContextAccessorUsage,
                    propertyReference.Syntax.GetLocation()
                );
                context.ReportDiagnostic(diagnostic);
                break;
            }

            if (parent is IMethodBodyOperation)
            {
                // We are not in a constructor, so we can stop checking
                break;
            }

            parent = parent.Parent;
        }
    }
}
