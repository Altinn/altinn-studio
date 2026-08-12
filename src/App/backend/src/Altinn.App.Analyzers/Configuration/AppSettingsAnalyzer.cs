using Altinn.Studio.MaskinportenRules;

namespace Altinn.App.Analyzers.Configuration;

/// <summary>
/// Validates <c>appsettings*.json</c> at build time. Currently it reports Maskinporten configuration
/// that collides with what the platform provisions at deploy time — a failure that is otherwise silent
/// and only occurs in deployed environments, because local development never sees the provisioned
/// settings file. This is the umbrella entry point for appsettings checks — additional rule groups can
/// be added here as more collectors.
/// <para>
/// The rule definitions (key sets, guidance, verdicts) are shared with studioctl's v8→v9 upgrade
/// detectors via <see cref="MaskinportenInvariants"/>, but unlike the upgrade tooling this analyzer
/// reaches every v9 app on every build — including apps that were never upgraded from v8.
/// </para>
/// </summary>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class AppSettingsAnalyzer : DiagnosticAnalyzer
{
    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        [
            Diagnostics.Configuration.ExternalMaskinportenSectionCollision,
            Diagnostics.Configuration.MaskinportenCredentialsCollision,
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
        foreach (var file in compilationContext.Options.AdditionalFiles)
        {
            if (!MaskinportenInvariants.IsAppSettingsFileName(MaskinportenCollisionUtils.GetFileName(file.Path)))
                continue;

            MaskinportenCollisionUtils.CollectCollisionDiagnostics(
                file,
                compilationContext.CancellationToken,
                diagnostics
            );
        }

        foreach (var diagnostic in diagnostics)
        {
            compilationContext.ReportDiagnostic(diagnostic);
        }
    }
}
