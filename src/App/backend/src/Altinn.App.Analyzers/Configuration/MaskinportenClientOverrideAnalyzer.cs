using Altinn.Studio.MaskinportenRules;
using Microsoft.CodeAnalysis.Operations;

namespace Altinn.App.Analyzers.Configuration;

/// <summary>
/// Reports a <c>ConfigureMaskinportenClient</c> call that redirects the built-in Maskinporten client
/// away from the credentials the platform provisions. <c>AddMaskinportenClient</c> only binds the
/// provisioned <c>MaskinportenSettings</c> section if nothing configured those options first, and the
/// app's registrations run before the SDK's — so a call with a custom section path or a configuration
/// lambda wins and the provisioned credentials are never read. In v9 that same default client is what
/// mints the service owner tokens the workflow engine's callbacks run on, so the redirect breaks the
/// app's process transitions — silently, and only in deployed environments.
/// </summary>
/// <remarks>
/// <para>
/// Re-binding the provisioned section by name is what the default registration would have done anyway
/// and is not reported. The section path is resolved as a compile-time constant, so a <c>const</c>
/// reference is exempt just like a literal, and the comparison is case-insensitive because
/// configuration keys are. A section path that is not a compile-time constant cannot be proven
/// harmless and is reported.
/// </para>
/// <para>
/// Gated on <see cref="AnalyzerConfigOptionsProviderExtensions.IsAltinnApp"/>: the analyzer travels
/// transitively into app unit-test projects, where configuring the client with test credentials is
/// legitimate.
/// </para>
/// </remarks>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class MaskinportenClientOverrideAnalyzer : DiagnosticAnalyzer
{
    /// <summary>
    /// The public facade apps call. The Core-layer overloads live on an internal class that app code
    /// cannot reach, so matching the facade is exact.
    /// </summary>
    private const string ExtensionsTypeFullName = "Altinn.App.Api.Extensions.ServiceCollectionExtensions";

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        [Diagnostics.Configuration.MaskinportenClientOverride];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();

        context.RegisterCompilationStartAction(startContext =>
        {
            if (!startContext.Options.AnalyzerConfigOptionsProvider.IsAltinnApp())
                return;

            var extensionsType = startContext.Compilation.GetTypeByMetadataName(ExtensionsTypeFullName);
            if (extensionsType is null)
                return;

            startContext.RegisterOperationAction(ctx => Analyze(ctx, extensionsType), OperationKind.Invocation);
        });
    }

    private static void Analyze(OperationAnalysisContext context, INamedTypeSymbol extensionsType)
    {
        if (context.Operation is not IInvocationOperation invocation)
            return;

        var method = invocation.TargetMethod;
        if (method.Name != MaskinportenInvariants.ConfigureClientMethodName)
            return;

        if (!SymbolEqualityComparer.Default.Equals(method.ContainingType, extensionsType))
            return;

        if (RebindsTheProvisionedSection(invocation, method))
            return;

        context.ReportDiagnostic(
            Diagnostic.Create(
                Diagnostics.Configuration.MaskinportenClientOverride,
                invocation.Syntax.GetLocation(),
                method.Name
            )
        );
    }

    /// <summary>
    /// Whether the call just re-binds the provisioned section by name, which is what the default
    /// registration would have done anyway and therefore changes nothing.
    /// </summary>
    private static bool RebindsTheProvisionedSection(IInvocationOperation invocation, IMethodSymbol method)
    {
        // Extension methods surface unreduced here: parameter 0 is the IServiceCollection receiver,
        // parameter 1 is either the section path or the configuration lambda.
        if (method.Parameters.Length != 2 || method.Parameters[1].Type.SpecialType != SpecialType.System_String)
            return false;

        foreach (var argument in invocation.Arguments)
        {
            if (argument.Parameter?.Ordinal != 1)
                continue;

            return argument.Value.ConstantValue is { HasValue: true, Value: string sectionPath }
                && MaskinportenInvariants.RebindsProvisionedSection(sectionPath);
        }

        return false;
    }
}
