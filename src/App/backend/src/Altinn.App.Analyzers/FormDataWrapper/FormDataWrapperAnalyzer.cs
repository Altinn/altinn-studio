namespace Altinn.App.Analyzers.FormDataWrapper;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public class FormDataWrapperAnalyzer : DiagnosticAnalyzer
{
    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        [Diagnostics.FormDataWrapperGenerator.AppMetadataError];

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
        if (appMetadataFiles.Count == 0)
        {
            compilationContext.ReportDiagnostic(
                Diagnostic.Create(
                    Diagnostics.FormDataWrapperGenerator.AppMetadataError,
                    Location.None,
                    "No applicationmetadata.json file found"
                )
            );
            return;
        }

        if (appMetadataFiles.Count > 1)
        {
            compilationContext.ReportDiagnostic(
                Diagnostic.Create(
                    Diagnostics.FormDataWrapperGenerator.AppMetadataError,
                    Location.Create(appMetadataFiles[0].Path, default, default),
                    "Multiple applicationmetadata.json file found"
                )
            );
            return;
        }

        var appMetadata = appMetadataFiles[0];
        var diagnostics = new List<Diagnostic>();
        foreach (
            var (classFullName, classLocation) in FormDataWrapperUtils.ParseModelClassOrDiagnostic(
                appMetadata,
                compilationContext.CancellationToken,
                diagnostics
            )
        )
        {
            var modelPathNode = FormDataWrapperUtils.CreateRootSymbolNode(
                classFullName,
                compilationContext.Compilation,
                diagnostics
            );
            if (modelPathNode is null)
            {
                diagnostics.Add(
                    Diagnostic.Create(
                        Diagnostics.FormDataWrapperGenerator.AppMetadataError,
                        classLocation,
                        $"Could not find class {classFullName} in the compilation"
                    )
                );
            }
        }

        foreach (var diagnostic in diagnostics)
        {
            compilationContext.ReportDiagnostic(diagnostic);
        }
    }
}
