using Altinn.App.Analyzers.Process;

namespace Altinn.App.Analyzers;

/// <summary>
/// Validates the sequence flows in <c>config/process/process.bpmn</c> at build time. A flow the app cannot follow
/// otherwise surfaces only when an instance tries to leave the element, as a process error in production.
/// </summary>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class ProcessFlowAnalyzer : DiagnosticAnalyzer
{
    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        [
            Diagnostics.Process.SequenceFlowLeadsToUnsupportedElement,
            Diagnostics.Process.GatewayOutgoingMismatch,
            Diagnostics.Process.GatewayDefaultNotOutgoing,
            Diagnostics.Process.ElementHasSeveralOutgoingFlows,
            Diagnostics.Process.ElementHasNoOutgoingFlow,
            Diagnostics.Process.DuplicateProcessElementId,
            Diagnostics.Process.GatewayMixesConditions,
            Diagnostics.Process.GatewayLoop,
            Diagnostics.Process.GatewayEmptyCondition,
        ];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();

        context.RegisterCompilationAction(CompilationAnalysisAction);
    }

    private static void CompilationAnalysisAction(CompilationAnalysisContext compilationContext)
    {
        if (!compilationContext.Options.AnalyzerConfigOptionsProvider.IsAltinnApp())
            return;

        var diagnostics = new List<Diagnostic>();
        ProcessFlowUtils.CollectDiagnostics(
            compilationContext.Options.AdditionalFiles,
            compilationContext.CancellationToken,
            diagnostics
        );

        foreach (var diagnostic in diagnostics)
        {
            compilationContext.ReportDiagnostic(diagnostic);
        }
    }
}
