using System.Collections.Concurrent;
using Altinn.App.Analyzers.Process;
using Microsoft.CodeAnalysis.Operations;

namespace Altinn.App.Analyzers;

/// <summary>
/// Reports a task in <c>config/process/process.bpmn</c> that uses the wrong BPMN element for its type: a service task
/// declared as a <c>bpmn:task</c>, or another task as a <c>bpmn:serviceTask</c>. Besides the built-in types, it knows the types of
/// the app's own task classes whose <c>Type</c> returns a constant, and assumes each such class is registered under
/// the interface it implements.
/// </summary>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class ProcessTaskElementAnalyzer : DiagnosticAnalyzer
{
    private const string ProcessTaskInterface = "Altinn.App.Core.Internal.Process.ProcessTasks.IProcessTask";
    private const string PipelineServiceTaskInterface = "Altinn.App.Core.Features.Process.IPipelineServiceTask";
    private const string TypePropertyName = "Type";

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        [Diagnostics.Process.TaskUsesWrongElement];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();

        context.RegisterCompilationStartAction(startContext =>
        {
            if (!startContext.Options.AnalyzerConfigOptionsProvider.IsAltinnApp())
                return;

            var processTask = startContext.Compilation.GetTypeByMetadataName(ProcessTaskInterface);
            var pipelineServiceTask = startContext.Compilation.GetTypeByMetadataName(PipelineServiceTaskInterface);
            var typeProperty = processTask?.GetMembers(TypePropertyName).OfType<IPropertySymbol>().FirstOrDefault();

            var constantTypeGetters = new ConcurrentDictionary<IMethodSymbol, string>(SymbolEqualityComparer.Default);
            var taskClasses = new ConcurrentBag<INamedTypeSymbol>();
            if (processTask is not null && typeProperty is not null)
            {
                startContext.RegisterOperationBlockAction(blockContext =>
                    RecordConstantTypeGetter(blockContext, constantTypeGetters)
                );
                startContext.RegisterSymbolAction(
                    symbolContext =>
                    {
                        if (
                            symbolContext.Symbol
                                is INamedTypeSymbol { TypeKind: TypeKind.Class, IsAbstract: false } type
                            && type.AllInterfaces.Contains(processTask, SymbolEqualityComparer.Default)
                        )
                        {
                            taskClasses.Add(type);
                        }
                    },
                    SymbolKind.NamedType
                );
            }

            startContext.RegisterCompilationEndAction(endContext =>
            {
                var appServiceTaskTypes = new HashSet<string>(StringComparer.Ordinal);
                var appProcessTaskTypes = new HashSet<string>(StringComparer.Ordinal);
                if (typeProperty is not null)
                {
                    foreach (var type in taskClasses)
                    {
                        if (
                            EffectiveTypeGetter(type, typeProperty) is not { } getter
                            || !constantTypeGetters.TryGetValue(getter.OriginalDefinition, out var taskType)
                        )
                        {
                            continue;
                        }

                        var isServiceTask =
                            pipelineServiceTask is not null
                            && type.AllInterfaces.Contains(pipelineServiceTask, SymbolEqualityComparer.Default);
                        (isServiceTask ? appServiceTaskTypes : appProcessTaskTypes).Add(taskType);
                    }
                }

                var diagnostics = new List<Diagnostic>();
                ProcessTaskElementUtils.CollectDiagnostics(
                    endContext.Options.AdditionalFiles,
                    appServiceTaskTypes,
                    appProcessTaskTypes,
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
    /// The getter that runs for <c>IProcessTask.Type</c> on an instance of <paramref name="type"/>: the implementing
    /// property, or the most-derived override of it, since a virtual <c>Type</c> may be overridden below the class
    /// that implements the interface.
    /// </summary>
    private static IMethodSymbol? EffectiveTypeGetter(INamedTypeSymbol type, IPropertySymbol typeProperty)
    {
        if (type.FindImplementationForInterfaceMember(typeProperty) is not IPropertySymbol implementation)
        {
            return null;
        }

        for (var current = type; current is not null; current = current.BaseType)
        {
            foreach (var property in current.GetMembers(implementation.Name).OfType<IPropertySymbol>())
            {
                if (Overrides(property, implementation))
                {
                    return property.GetMethod;
                }
            }
        }

        return implementation.GetMethod;
    }

    /// <summary>Whether <paramref name="property"/> is <paramref name="implementation"/> or overrides it.</summary>
    private static bool Overrides(IPropertySymbol property, IPropertySymbol implementation)
    {
        for (IPropertySymbol? current = property; current is not null; current = current.OverriddenProperty)
        {
            if (SymbolEqualityComparer.Default.Equals(current.OriginalDefinition, implementation.OriginalDefinition))
            {
                return true;
            }
        }

        return false;
    }

    /// <summary>
    /// Records a <c>Type</c> getter whose body does nothing but return a constant string, such as
    /// <c>public string Type => "myTask";</c> or a <c>const</c> field. Any other body could return anything, so its
    /// type is left unknown.
    /// </summary>
    private static void RecordConstantTypeGetter(
        OperationBlockAnalysisContext context,
        ConcurrentDictionary<IMethodSymbol, string> constantTypeGetters
    )
    {
        if (
            context.OwningSymbol
                is not IMethodSymbol
                {
                    MethodKind: MethodKind.PropertyGet,
                    AssociatedSymbol: IPropertySymbol property
                } getter
            // An explicit implementation (string IProcessTask.Type) is named after its interface.
            || (
                property.Name != TypePropertyName
                && !property.ExplicitInterfaceImplementations.Any(p => p.Name == TypePropertyName)
            )
            || context.OperationBlocks.FirstOrDefault() is not IBlockOperation block
            || block.Operations.FirstOrDefault()
                is not IReturnOperation { ReturnedValue.ConstantValue: { HasValue: true } constant }
            || constant.Value is not string taskType
        )
        {
            return;
        }

        constantTypeGetters[getter.OriginalDefinition] = taskType;
    }
}
