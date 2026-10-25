using Microsoft.CodeAnalysis.Operations;

namespace Altinn.App.Analyzers;

/// <summary>
/// Reports a call to <c>IDataClient</c>, <c>IInstanceClient</c> or <c>IDataService</c> in a process hook, a service
/// task or <c>IInstantiationProcessor.DataCreation</c>. These can run while the process is transitioning, when Storage
/// refuses the clients' writes; the instance data mutator in the hook's context reads and writes the current instance
/// and saves the changes with the transition.
/// </summary>
/// <remarks>
/// Only calls in the body of the member that implements the hook, or overrides that member, and in a method that takes
/// a <c>StageContext</c> (a stage) are reported, lambdas and local functions included. A helper method the hook calls,
/// a base class method that becomes a hook only in a derived class, a wrapper interface of the app's own, or code in a
/// referenced package is not seen.
/// <c>IInstanceClient.GetInstances</c> reads other instances, so it is not reported; calls that target another
/// instance on purpose can suppress the warning.
/// </remarks>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class ProcessHookStorageClientAnalyzer : DiagnosticAnalyzer
{
    private const string InstanceClientTypeName = "Altinn.App.Core.Internal.Instances.IInstanceClient";
    private const string GetInstancesMethodName = "GetInstances";
    private const string StageContextTypeName = "Altinn.App.Core.Features.Process.StageContext";

    private static readonly string[] _clientTypeNames =
    [
        "Altinn.App.Core.Internal.Data.IDataClient",
        InstanceClientTypeName,
        "Altinn.App.Core.Internal.Data.IDataService",
    ];

    private static readonly (string TypeName, string[] MemberNames)[] _hooks =
    [
        ("Altinn.App.Core.Features.Process.IOnTaskStartingHandler", ["Execute"]),
        ("Altinn.App.Core.Features.Process.IOnTaskEndingHandler", ["Execute"]),
        ("Altinn.App.Core.Features.Process.IOnTaskAbandoningHandler", ["Execute"]),
        ("Altinn.App.Core.Features.Process.IOnProcessEndedHandler", ["Execute"]),
        ("Altinn.App.Core.Features.Process.IServiceTask", ["DefineExecute"]),
        ("Altinn.App.Core.Internal.Process.ProcessTasks.IProcessTask", ["DefineStart", "DefineEnd", "DefineAbandon"]),
        ("Altinn.App.Core.Features.IInstantiationProcessor", ["DataCreation"]),
    ];

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        [Diagnostics.CodeSmells.StorageClientInProcessHook];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();

        context.RegisterCompilationStartAction(startContext =>
        {
            var clients = new HashSet<INamedTypeSymbol>(SymbolEqualityComparer.Default);
            foreach (var clientTypeName in _clientTypeNames)
            {
                if (startContext.Compilation.GetTypeByMetadataName(clientTypeName) is { } client)
                {
                    clients.Add(client);
                }
            }

            var hookMembers = new List<IMethodSymbol>();
            foreach (var (typeName, memberNames) in _hooks)
            {
                if (startContext.Compilation.GetTypeByMetadataName(typeName) is not { } hook)
                {
                    continue;
                }

                foreach (var memberName in memberNames)
                {
                    hookMembers.AddRange(hook.GetMembers(memberName).OfType<IMethodSymbol>());
                }
            }

            if (clients.Count == 0 || hookMembers.Count == 0)
                return;

            var instanceClient = startContext.Compilation.GetTypeByMetadataName(InstanceClientTypeName);
            var stageContext = startContext.Compilation.GetTypeByMetadataName(StageContextTypeName);
            startContext.RegisterOperationAction(
                ctx => Analyze(ctx, clients, instanceClient, hookMembers, stageContext),
                OperationKind.Invocation,
                OperationKind.MethodReference
            );
        });
    }

    private static void Analyze(
        OperationAnalysisContext context,
        HashSet<INamedTypeSymbol> clients,
        INamedTypeSymbol? instanceClient,
        List<IMethodSymbol> hookMembers,
        INamedTypeSymbol? stageContext
    )
    {
        var target = context.Operation switch
        {
            IInvocationOperation invocation => invocation.TargetMethod,
            IMethodReferenceOperation methodReference => methodReference.Method,
            _ => null,
        };
        if (target is null || !clients.Contains(target.ContainingType.OriginalDefinition))
            return;

        if (
            target.Name == GetInstancesMethodName
            && SymbolEqualityComparer.Default.Equals(target.ContainingType.OriginalDefinition, instanceClient)
        )
            return;

        if (context.ContainingSymbol is not IMethodSymbol { ContainingType: { } containingType } method)
            return;

        string? hook = null;
        foreach (var hookMember in hookMembers)
        {
            if (
                containingType.AllInterfaces.Contains(hookMember.ContainingType, SymbolEqualityComparer.Default)
                && containingType.FindImplementationForInterfaceMember(hookMember) is IMethodSymbol implementation
                && IsOrOverrides(method, implementation)
            )
            {
                hook = $"{hookMember.ContainingType.Name}.{hookMember.Name}";
                break;
            }
        }

        // Stages are usually methods the Define member passes to the pipeline builder, outside its body.
        if (
            hook is null
            && method.Parameters.Any(parameter => SymbolEqualityComparer.Default.Equals(parameter.Type, stageContext))
        )
        {
            hook = $"{containingType.Name}.{method.Name}";
        }

        if (hook is null)
            return;

        context.ReportDiagnostic(
            Diagnostic.Create(
                Diagnostics.CodeSmells.StorageClientInProcessHook,
                context.Operation.Syntax.GetLocation(),
                target.ContainingType.Name,
                target.Name,
                hook
            )
        );
    }

    // The interface maps to the base class's abstract or virtual member, also when a derived class overrides it.
    private static bool IsOrOverrides(IMethodSymbol method, IMethodSymbol implementation)
    {
        for (IMethodSymbol? current = method; current is not null; current = current.OverriddenMethod)
        {
            if (SymbolEqualityComparer.Default.Equals(current, implementation))
                return true;
        }

        return false;
    }
}
