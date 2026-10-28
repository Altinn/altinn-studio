using System.Collections.Concurrent;
using Altinn.App.Analyzers.Process;
using Microsoft.CodeAnalysis.Operations;

namespace Altinn.App.Analyzers;

/// <summary>
/// Reports process hooks that the app does not allow together: more than one task hook of a kind that runs for the
/// same task in <c>config/process/process.bpmn</c>, and more than one <c>IOnProcessEndedHandler</c>. Also warns when
/// a task hook compares the task id with an id that is not a task.
/// </summary>
/// <remarks>
/// <para>
/// A hook counts when the app registers it, the way the runtime counts: an app adds its hooks with calls such as
/// <c>services.AddTransient&lt;IOnTaskStartingHandler, MyHook&gt;()</c> in <c>Program.cs</c>, nothing scans for
/// them, and a class that is not registered never runs. So a class registered twice counts twice, and one that is
/// never registered does not count. <see cref="HookRegistration"/> says which registrations are read. The analyzer
/// does not follow calls, so a registration in a method that runs only sometimes still counts.
/// </para>
/// <para>
/// For a task hook, the rules also need its class and a <c>ShouldRunForTask</c> that <see cref="TaskIdCondition"/>
/// can reduce. Every other hook is left to the startup check in <c>ProcessTaskConfigurationValidationService</c>.
/// </para>
/// </remarks>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class ProcessHookAnalyzer : DiagnosticAnalyzer
{
    private const string HookNamespace = "Altinn.App.Core.Features.Process.";
    private const string ProcessEndedHook = HookNamespace + "IOnProcessEndedHandler";
    private static readonly string[] _taskHooks =
    [
        HookNamespace + "IOnTaskStartingHandler",
        HookNamespace + "IOnTaskEndingHandler",
        HookNamespace + "IOnTaskAbandoningHandler",
    ];

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        [
            Diagnostics.Process.TaskHooksOverlap,
            Diagnostics.Process.SeveralProcessEndedHooks,
            Diagnostics.Process.TaskHookUnknownTask,
        ];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();

        context.RegisterCompilationStartAction(startContext =>
        {
            if (!startContext.Options.AnalyzerConfigOptionsProvider.IsAltinnApp())
                return;

            var compilation = startContext.Compilation;
            var registrationMethods = compilation.GetTypeByMetadataName(HookRegistration.RegistrationMethods);
            var processEndedHook = compilation.GetTypeByMetadataName(ProcessEndedHook);
            var taskHooks = _taskHooks
                .Select(compilation.GetTypeByMetadataName)
                .OfType<INamedTypeSymbol>()
                .ToImmutableArray();
            if (registrationMethods is null || processEndedHook is null || taskHooks.Length != _taskHooks.Length)
                return;

            var hooks = taskHooks.Add(processEndedHook);
            var registrations = new ConcurrentBag<HookRegistration>();
            var conditions = new ConcurrentDictionary<IMethodSymbol, TaskIdCondition>(SymbolEqualityComparer.Default);

            startContext.RegisterOperationAction(
                operationContext =>
                {
                    if (
                        HookRegistration.TryRead(
                            (IInvocationOperation)operationContext.Operation,
                            registrationMethods,
                            hooks
                        ) is
                        { } registration
                    )
                    {
                        registrations.Add(registration);
                    }
                },
                OperationKind.Invocation
            );
            startContext.RegisterOperationBlockAction(blockContext =>
            {
                if (
                    blockContext.OwningSymbol is IMethodSymbol method
                    && TaskIdCondition.IsShouldRunForTask(method)
                    && TaskIdCondition.TryReduce(method, blockContext.OperationBlocks) is { } condition
                )
                {
                    conditions[method.OriginalDefinition] = condition;
                }
            });

            startContext.RegisterCompilationEndAction(endContext =>
            {
                // In source order, so the first registration is the one a reader meets first.
                var ordered = registrations
                    .OrderBy(registration => registration.Location.SourceTree?.FilePath, StringComparer.Ordinal)
                    .ThenBy(registration => registration.Location.SourceSpan.Start)
                    .ToList();

                var diagnostics = new List<Diagnostic>();
                ProcessHookUtils.CollectDiagnostics(
                    endContext.Options.AdditionalFiles,
                    ordered,
                    processEndedHook,
                    taskHooks,
                    (registration, interfaceMethod) =>
                        registration.Implementation is { } implementation
                        && EffectiveImplementation(implementation, interfaceMethod) is { } method
                        && conditions.TryGetValue(method.OriginalDefinition, out var condition)
                            ? condition
                            : null,
                    endContext.CancellationToken,
                    diagnostics
                );

                foreach (var diagnostic in diagnostics)
                {
                    endContext.ReportDiagnostic(diagnostic);
                }
            });
        });
    }

    /// <summary>
    /// The method that runs for <paramref name="interfaceMethod"/> on an instance of <paramref name="type"/>: the
    /// implementing method, or the most-derived override of it, since a virtual implementation may be overridden below
    /// the class that implements the interface.
    /// </summary>
    private static IMethodSymbol? EffectiveImplementation(INamedTypeSymbol type, IMethodSymbol interfaceMethod)
    {
        if (type.FindImplementationForInterfaceMember(interfaceMethod) is not IMethodSymbol implementation)
        {
            return null;
        }

        for (var current = type; current is not null; current = current.BaseType)
        {
            foreach (var method in current.GetMembers(implementation.Name).OfType<IMethodSymbol>())
            {
                for (
                    IMethodSymbol? overridden = method;
                    overridden is not null;
                    overridden = overridden.OverriddenMethod
                )
                {
                    if (
                        SymbolEqualityComparer.Default.Equals(
                            overridden.OriginalDefinition,
                            implementation.OriginalDefinition
                        )
                    )
                    {
                        return method;
                    }
                }
            }
        }

        return implementation;
    }
}
