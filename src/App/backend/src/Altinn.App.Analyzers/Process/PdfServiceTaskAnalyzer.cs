using Altinn.App.Analyzers.Process;

namespace Altinn.App.Analyzers;

/// <summary>
/// Validates the <c>pdf</c> service tasks in <c>config/process/process.bpmn</c> against the app's UI folders
/// at build time. A PDF service task the frontend cannot render otherwise surfaces only when an instance
/// reaches it - as a PDF generator timeout whose cause is logged only in the generator's browser console.
/// </summary>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class PdfServiceTaskAnalyzer : DiagnosticAnalyzer
{
    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        [
            Diagnostics.Process.PdfServiceTaskHasNothingToRender,
            Diagnostics.Process.PdfServiceTaskMissingPdfLayoutName,
            Diagnostics.Process.PdfServiceTaskIncludesTaskWithoutUi,
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
        PdfServiceTaskUtils.CollectDiagnostics(
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
