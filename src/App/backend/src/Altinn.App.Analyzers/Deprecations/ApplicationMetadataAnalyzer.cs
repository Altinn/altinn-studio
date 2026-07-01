namespace Altinn.App.Analyzers.Deprecations;

/// <summary>
/// Validates <c>applicationmetadata.json</c> at build time. Currently it reports use of configuration
/// that is no longer honoured by this version of the app backend, so apps fail the build instead of
/// silently shipping a broken feature. This is the umbrella entry point for applicationmetadata.json
/// checks — additional rule groups (e.g. sanity/usage checks) can be added here as more collectors.
/// </summary>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class ApplicationMetadataAnalyzer : DiagnosticAnalyzer
{
    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        [Diagnostics.Deprecations.EnablePdfCreation, Diagnostics.Deprecations.LegacyEFormidling];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();

        context.RegisterCompilationAction(CompilationAnalysisAction);
    }

    private void CompilationAnalysisAction(CompilationAnalysisContext compilationContext)
    {
        if (!compilationContext.Options.AnalyzerConfigOptionsProvider.IsAltinnApp())
            return;

        var appMetadataFiles = compilationContext
            .Options.AdditionalFiles.Where(FormDataWrapperUtils.IsApplicationMetadataFile)
            .ToList();

        // The FormDataWrapperAnalyzer owns reporting of missing/duplicate applicationmetadata.json,
        // so we only act when there's exactly one file to inspect.
        if (appMetadataFiles.Count != 1)
            return;

        var diagnostics = new List<Diagnostic>();
        MetadataDeprecationUtils.CollectDeprecationDiagnostics(
            appMetadataFiles[0],
            compilationContext.CancellationToken,
            diagnostics
        );

        foreach (var diagnostic in diagnostics)
        {
            compilationContext.ReportDiagnostic(diagnostic);
        }
    }
}
