using Microsoft.CodeAnalysis.Operations;

namespace Altinn.App.Analyzers;

/// <summary>
/// Reports calls to <c>IDataClient</c>, <c>IInstanceClient</c> and <c>IDataService</c> in process hooks, service tasks
/// and <c>IInstantiationProcessor.DataCreation</c>, where Storage refuses most of their writes while the process is
/// transitioning.
/// </summary>
/// <remarks>
/// Only the body of the hook and of methods that take a <c>StageContext</c> is checked, not the methods they call.
/// <c>IInstanceClient.GetInstances</c> and <c>CreateInstance</c> never concern the current instance, so they are not
/// reported.
/// </remarks>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class ProcessHookStorageClientAnalyzer : DiagnosticAnalyzer
{
    private const string DataClientTypeName = "Altinn.App.Core.Internal.Data.IDataClient";
    private const string InstanceClientTypeName = "Altinn.App.Core.Internal.Instances.IInstanceClient";
    private const string StageContextTypeName = "Altinn.App.Core.Features.Process.StageContext";

    // The message format ends each of these with a period.
    private const string UseTheMutator = "Use the instance data mutator from the context for the current instance";
    private const string RefusedWithoutMutatorReplacement =
        "Storage refuses this call then, and the instance data mutator has no replacement for it";
    private const string NoMutatorReplacement = "The instance data mutator has no replacement for it";
    private const string ConfirmOnProcessEnd =
        "Storage refuses this call then. Set autoConfirmCompleteOnProcessEnd in applicationmetadata.json to confirm "
        + "the instance as complete when the process ends";

    private static readonly string[] _instanceClientMethodsForOtherInstances = ["GetInstances", "CreateInstance"];

    private static readonly Dictionary<(string ClientTypeName, string MethodName), string> _callsWithoutReplacement =
        new()
        {
            [(DataClientTypeName, "LockDataElement")] = RefusedWithoutMutatorReplacement,
            [(DataClientTypeName, "UnlockDataElement")] = RefusedWithoutMutatorReplacement,
            [(InstanceClientTypeName, "AddCompleteConfirmation")] = ConfirmOnProcessEnd,
            [(InstanceClientTypeName, "DeleteInstance")] = RefusedWithoutMutatorReplacement,
            [(InstanceClientTypeName, "UpdateProcess")] = RefusedWithoutMutatorReplacement,
            [(InstanceClientTypeName, "UpdateProcessAndEvents")] = RefusedWithoutMutatorReplacement,
            [(InstanceClientTypeName, "UpdateSubstatus")] = RefusedWithoutMutatorReplacement,
            // Storage sets the read status without checking the process status.
            [(InstanceClientTypeName, "UpdateReadStatus")] = NoMutatorReplacement,
        };

    private static readonly string[] _clientTypeNames =
    [
        DataClientTypeName,
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

            var stageContext = startContext.Compilation.GetTypeByMetadataName(StageContextTypeName);
            startContext.RegisterOperationAction(
                ctx => Analyze(ctx, clients, hookMembers, stageContext),
                OperationKind.Invocation,
                OperationKind.MethodReference
            );
        });
    }

    private static void Analyze(
        OperationAnalysisContext context,
        HashSet<INamedTypeSymbol> clients,
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
        if (target is null)
            return;

        // An extension method on a client, such as IDataClientExtensions.GetFormData<T>, is a call to that client.
        var definition = target.ReducedFrom ?? target;
        var client =
            definition.IsExtensionMethod && definition.Parameters.Length > 0
                ? definition.Parameters[0].Type as INamedTypeSymbol
                : target.ContainingType;
        if (client is null || !clients.Contains(client.OriginalDefinition))
            return;

        string clientTypeName = client.OriginalDefinition.ToDisplayString();
        if (clientTypeName == InstanceClientTypeName && _instanceClientMethodsForOtherInstances.Contains(target.Name))
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
                client.Name,
                target.Name,
                hook,
                _callsWithoutReplacement.TryGetValue((clientTypeName, target.Name), out string? advice)
                    ? advice
                    : UseTheMutator
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
