using System.Collections.Concurrent;
using Microsoft.CodeAnalysis.Operations;

namespace Altinn.App.Analyzers.Deprecations;

/// <summary>
/// Reports a <c>DataCreation(Instance, object, Dictionary&lt;string, string&gt;?)</c> method on a type that implements
/// <c>IInstantiationProcessor</c>. v8 called that overload; v9 calls only the one that takes an
/// <c>IInstanceDataMutator</c>, so a v8 implementation left next to it compiles and never runs.
/// </summary>
/// <remarks>
/// An app that implements only the old overload already fails with CS0535, and an explicit implementation of it with
/// CS0539. What compiles is the old method kept beside the new one, or declared in a base class of the processor, so
/// that is what is reported. A method the app calls itself, such as a helper the new overload calls, is not reported.
/// </remarks>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class LegacyInstantiationProcessorAnalyzer : DiagnosticAnalyzer
{
    private const string InterfaceName = "Altinn.App.Core.Features.IInstantiationProcessor";
    private const string InstanceName = "Altinn.Platform.Storage.Interface.Models.Instance";
    private const string MethodName = "DataCreation";

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        [Diagnostics.Deprecations.LegacyInstantiationProcessorDataCreation];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();

        context.RegisterCompilationStartAction(startContext =>
        {
            if (!startContext.Options.AnalyzerConfigOptionsProvider.IsAltinnApp())
                return;

            var compilation = startContext.Compilation;
            var processor = compilation.GetTypeByMetadataName(InterfaceName);
            var instance = compilation.GetTypeByMetadataName(InstanceName);
            var dictionary = compilation.GetTypeByMetadataName("System.Collections.Generic.Dictionary`2");
            var task = compilation.GetTypeByMetadataName("System.Threading.Tasks.Task");
            if (processor is null || instance is null || dictionary is null || task is null)
                return;

            var legacyMethods = new ConcurrentBag<IMethodSymbol>();
            var implementers = new ConcurrentBag<INamedTypeSymbol>();
            var calledMethods = new ConcurrentDictionary<IMethodSymbol, byte>(SymbolEqualityComparer.Default);

            startContext.RegisterSymbolAction(
                symbolContext =>
                {
                    switch (symbolContext.Symbol)
                    {
                        case IMethodSymbol method when HasLegacySignature(method, instance, dictionary, task):
                            legacyMethods.Add(method);
                            break;
                        case INamedTypeSymbol type
                            when type.AllInterfaces.Contains(processor, SymbolEqualityComparer.Default):
                            implementers.Add(type);
                            break;
                    }
                },
                SymbolKind.Method,
                SymbolKind.NamedType
            );

            startContext.RegisterOperationAction(
                operationContext =>
                {
                    var target = operationContext.Operation switch
                    {
                        IInvocationOperation invocation => invocation.TargetMethod,
                        IMethodReferenceOperation reference => reference.Method,
                        _ => null,
                    };
                    if (target is { Name: MethodName })
                        calledMethods.TryAdd(target.OriginalDefinition, 0);
                },
                OperationKind.Invocation,
                OperationKind.MethodReference
            );

            startContext.RegisterCompilationEndAction(endContext =>
            {
                // A v8 method in a base class implemented the interface for a derived processor too, so a method
                // counts when its own type or any type derived from it implements the interface.
                var processorTypes = new HashSet<INamedTypeSymbol>(SymbolEqualityComparer.Default);
                foreach (var implementer in implementers)
                {
                    for (INamedTypeSymbol? type = implementer; type is not null; type = type.BaseType)
                        processorTypes.Add(type.OriginalDefinition);
                }

                // A call through an interface of the app's own, such as one that declares the same method, runs the
                // processor's implementation of it.
                foreach (var implementer in implementers)
                {
                    foreach (var called in calledMethods.Keys)
                    {
                        if (
                            called.ContainingType.TypeKind == TypeKind.Interface
                            && implementer.AllInterfaces.Any(i =>
                                SymbolEqualityComparer.Default.Equals(i.OriginalDefinition, called.ContainingType)
                            )
                            && implementer.FindImplementationForInterfaceMember(called) is IMethodSymbol implementation
                        )
                        {
                            calledMethods.TryAdd(implementation.OriginalDefinition, 0);
                        }
                    }
                }

                foreach (var method in legacyMethods)
                {
                    if (!processorTypes.Contains(method.ContainingType.OriginalDefinition))
                        continue;
                    if (IsCalled(method, calledMethods))
                        continue;

                    var location = method.Locations.FirstOrDefault(l => l.IsInSource);
                    if (location is null)
                        continue;

                    endContext.ReportDiagnostic(
                        Diagnostic.Create(
                            Diagnostics.Deprecations.LegacyInstantiationProcessorDataCreation,
                            location,
                            method.ContainingType.Name
                        )
                    );
                }
            });
        });
    }

    private static bool HasLegacySignature(
        IMethodSymbol method,
        INamedTypeSymbol instance,
        INamedTypeSymbol dictionary,
        INamedTypeSymbol task
    )
    {
        if (
            method.MethodKind != MethodKind.Ordinary
            || method.Name != MethodName
            || method.IsStatic
            || method.IsGenericMethod
            || !SymbolEqualityComparer.Default.Equals(method.ReturnType, task)
        )
            return false;

        var parameters = method.Parameters;
        return parameters.Length == 3
            && parameters.All(p => p.RefKind == RefKind.None)
            && SymbolEqualityComparer.Default.Equals(parameters[0].Type, instance)
            && parameters[1].Type.SpecialType == SpecialType.System_Object
            && parameters[2].Type is INamedTypeSymbol prefill
            && SymbolEqualityComparer.Default.Equals(prefill.OriginalDefinition, dictionary)
            && prefill.TypeArguments.All(t => t.SpecialType == SpecialType.System_String);
    }

    private static bool IsCalled(IMethodSymbol method, ConcurrentDictionary<IMethodSymbol, byte> calledMethods)
    {
        // A call through a virtual method in a base class can dispatch to an override of it.
        for (IMethodSymbol? current = method; current is not null; current = current.OverriddenMethod)
        {
            if (calledMethods.ContainsKey(current.OriginalDefinition))
                return true;
        }

        return false;
    }
}
