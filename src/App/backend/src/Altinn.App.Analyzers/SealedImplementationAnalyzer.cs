namespace Altinn.App.Analyzers;

/// <summary>
/// Reports a class that replaces an interface default implementation marked with
/// <c>[SealedImplementation]</c> (an internal Altinn.App.Core attribute). Such a default is the
/// contract — e.g. <c>IServiceTask</c> forwards <c>IPipelineServiceTask.Define</c> to
/// <c>Finally(Execute)</c>, and a class providing its own <c>Define</c> would silently turn its
/// <c>Execute</c> into dead code. The attribute carries the remediation text, so this analyzer
/// stays generic over whichever members the SDK seals.
/// </summary>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class SealedImplementationAnalyzer : DiagnosticAnalyzer
{
    private const string AttributeFullName = "Altinn.App.Core.Features.SealedImplementationAttribute";

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        [Diagnostics.Contracts.SealedImplementationReplaced];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();

        context.RegisterCompilationStartAction(startContext =>
        {
            var attributeSymbol = startContext.Compilation.GetTypeByMetadataName(AttributeFullName);
            if (attributeSymbol is null)
                return;

            startContext.RegisterSymbolAction(ctx => Analyze(ctx, attributeSymbol), SymbolKind.NamedType);
        });
    }

    private static void Analyze(SymbolAnalysisContext context, INamedTypeSymbol attributeSymbol)
    {
        if (context.Symbol is not INamedTypeSymbol type || type.TypeKind != TypeKind.Class)
            return;

        foreach (INamedTypeSymbol iface in type.AllInterfaces)
        {
            foreach (ISymbol member in iface.GetMembers())
            {
                if (member is not IMethodSymbol sealedDefault)
                    continue;
                if (sealedDefault.ExplicitInterfaceImplementations.IsEmpty)
                    continue;
                if (
                    !sealedDefault
                        .GetAttributes()
                        .Any(a => SymbolEqualityComparer.Default.Equals(a.AttributeClass, attributeSymbol))
                )
                    continue;

                // The annotated method is a default implementation of a base interface member
                // (e.g. IServiceTask's implementation of IPipelineServiceTask.Define). The class
                // must resolve that base member to the annotated default itself.
                IMethodSymbol contractMember = sealedDefault.ExplicitInterfaceImplementations[0];
                ISymbol? implementation = type.FindImplementationForInterfaceMember(contractMember);
                if (implementation is null || SymbolEqualityComparer.Default.Equals(implementation, sealedDefault))
                    continue;

                string guidance =
                    sealedDefault
                        .GetAttributes()
                        .First(a => SymbolEqualityComparer.Default.Equals(a.AttributeClass, attributeSymbol))
                        .ConstructorArguments.FirstOrDefault()
                        .Value as string
                    ?? "";

                // Report on the replacing member when it is declared on this class; when it is
                // inherited from a base class, report on the class declaration itself — and only
                // on the type that declares the interface in its base list, so one violation
                // yields one diagnostic.
                Location location;
                if (SymbolEqualityComparer.Default.Equals(implementation.ContainingType, type))
                {
                    location = implementation.Locations.FirstOrDefault() ?? type.Locations[0];
                }
                else if (type.Interfaces.Any(i => SymbolEqualityComparer.Default.Equals(i, iface)))
                {
                    location = type.Locations[0];
                }
                else
                {
                    continue;
                }

                context.ReportDiagnostic(
                    Diagnostic.Create(
                        Diagnostics.Contracts.SealedImplementationReplaced,
                        location,
                        type.Name,
                        contractMember.ToDisplayString(SymbolDisplayFormat.MinimallyQualifiedFormat),
                        sealedDefault.ContainingType.Name,
                        guidance
                    )
                );
            }
        }
    }
}
