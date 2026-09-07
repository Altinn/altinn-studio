using Altinn.App.Analyzers.Authorization;

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

        // A single app project has exactly one of each of these. More than one means a project
        // layout this analysis cannot reason about, so it stays quiet rather than guessing.
        var policyFile = Single(additionalFiles, ServiceOwnerPolicyUtils.IsPolicyFile);
        var processFile = Single(additionalFiles, ServiceOwnerPolicyUtils.IsProcessFile);
        var metadataFile = Single(additionalFiles, FormDataWrapperUtils.IsApplicationMetadataFile);

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

    private static AdditionalText? Single(
        ImmutableArray<AdditionalText> additionalFiles,
        Func<AdditionalText, bool> predicate
    )
    {
        AdditionalText? found = null;
        foreach (var file in additionalFiles)
        {
            if (!predicate(file))
                continue;

            if (found is not null)
                return null;

            found = file;
        }

        return found;
    }
}
