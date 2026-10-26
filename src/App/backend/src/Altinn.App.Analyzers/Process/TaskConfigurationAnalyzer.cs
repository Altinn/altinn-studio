using Altinn.App.Analyzers.Process;

namespace Altinn.App.Analyzers;

/// <summary>
/// Validates the configuration of the tasks in <c>config/process/process.bpmn</c> at build time. A setting that is
/// empty, misspelled, or missing for an environment other than the one the app runs in otherwise surfaces only when
/// the app starts in that environment, or when an instance reaches the task.
/// </summary>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class TaskConfigurationAnalyzer : DiagnosticAnalyzer
{
    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        [
            Diagnostics.Process.TaskSettingInvalid,
            Diagnostics.Process.TaskConfigurationElementIgnored,
            Diagnostics.Process.UnusableEnvironmentAttribute,
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
        TaskConfigurationUtils.CollectDiagnostics(
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
