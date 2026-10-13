using Altinn.App.Analyzers.Authorization;
using Altinn.App.Analyzers.Metadata;
using Altinn.App.Analyzers.Process;
using Altinn.App.Analyzers.Utils;

namespace Altinn.App.Analyzers;

/// <summary>
/// Validates <c>config/authorization/policy.xml</c> at build time: the app owner (org) must be
/// permitted everything the app does against Storage as the service owner. A policy that only grants
/// the end user - the common shape of a v8 policy - leaves the app unable to advance its own
/// process, which otherwise surfaces only as an unexplained authorization failure the first time a
/// citizen submits.
/// </summary>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class ServiceOwnerPolicyAnalyzer : DiagnosticAnalyzer
{
    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        [Diagnostics.Authorization.MissingServiceOwnerGrant, Diagnostics.Authorization.ServiceOwnerGrantNotVerifiable];

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

        var additionalFiles = compilationContext.Options.AdditionalFiles;

        var policyFile = AdditionalFiles.Single(additionalFiles, ServiceOwnerPolicyUtils.IsPolicyFile);
        var processFile = ProcessFile.FindSingle(additionalFiles);
        var metadataFile = MetadataFile.FindSingle(additionalFiles);

        var diagnostics = new List<Diagnostic>();
        ServiceOwnerPolicyUtils.CollectPolicyDiagnostics(
            policyFile,
            processFile,
            metadataFile,
            compilationContext.CancellationToken,
            diagnostics
        );

        foreach (var diagnostic in diagnostics)
        {
            compilationContext.ReportDiagnostic(diagnostic);
        }
    }
}
