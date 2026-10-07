using Altinn.App.Analyzers.Process;

namespace Altinn.App.Analyzers;

/// <summary>
/// Validates the data types that <c>config/process/process.bpmn</c> uses against <c>config/applicationmetadata.json</c>
/// at build time. A data type that is missing, or cannot hold what a task stores in it, otherwise surfaces only when an
/// instance reaches the task - often after the user has signed or paid.
/// </summary>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class ProcessDataTypeAnalyzer : DiagnosticAnalyzer
{
    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        [
            Diagnostics.Process.UnknownDataType,
            Diagnostics.Process.PdfDataTypeMissing,
            Diagnostics.Process.DataTypeCannotHoldTaskData,
            Diagnostics.Process.DataTypeNotAppOwned,
            Diagnostics.Process.DataTypeTaskNotFound,
            Diagnostics.Process.DataTypeIgnored,
            Diagnostics.Process.GatewayUnknownDataType,
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
        ProcessDataTypeUtils.CollectDiagnostics(
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
