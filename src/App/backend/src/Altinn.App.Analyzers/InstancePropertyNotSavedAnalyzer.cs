using Altinn.App.Core.Internal.Data;
using Microsoft.CodeAnalysis.Operations;

namespace Altinn.App.Analyzers;

/// <summary>
/// Reports a change to a property of the Storage types the instance is made of, such as <c>Instance</c>,
/// <c>DataElement</c> or <c>InstanceStatus</c>, that a save of the instance data mutator does not send.
/// </summary>
/// <remarks>
/// The types and saved properties come from <see cref="InstanceSaveProperties"/>, which is shared with
/// Altinn.App.Core. The mutator's instance is passed to many app interfaces, so changes are reported anywhere in the
/// app, not only on the mutator's instance. A change is an assignment to the property, or a call that changes the
/// collection it holds, such as <c>instance.Data.Add(dataElement)</c>. Object initializers build a new object, so
/// they are not reported.
/// </remarks>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class InstancePropertyNotSavedAnalyzer : DiagnosticAnalyzer
{
    internal static readonly string SavedProperties = string.Join(
        ", ",
        InstanceSaveProperties
            .Instance.Select(name => $"Instance.{name}")
            .Concat(InstanceSaveProperties.DataElement.Select(name => $"DataElement.{name}"))
    );

    private static readonly ImmutableHashSet<string> _collectionChangingMethods =
    [
        "Add",
        "AddRange",
        "Clear",
        "Insert",
        "InsertRange",
        "Remove",
        "RemoveAll",
        "RemoveAt",
        "RemoveRange",
        "Reverse",
        "Sort",
        "TryAdd",
    ];

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        [Diagnostics.CodeSmells.InstancePropertyNotSaved];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();

        context.RegisterCompilationStartAction(startContext =>
        {
            var types = new Dictionary<INamedTypeSymbol, string[]>(SymbolEqualityComparer.Default);
            foreach (string name in InstanceSaveProperties.Types)
            {
                if (
                    startContext.Compilation.GetTypeByMetadataName($"{InstanceSaveProperties.TypeNamespace}.{name}") is
                    { } type
                )
                {
                    types[type] = name switch
                    {
                        "Instance" => InstanceSaveProperties.Instance,
                        "DataElement" => InstanceSaveProperties.DataElement,
                        _ => [],
                    };
                }
            }

            if (types.Count == 0)
                return;

            startContext.RegisterOperationAction(
                ctx => AnalyzeAssignment(ctx, types),
                OperationKind.SimpleAssignment,
                OperationKind.CompoundAssignment,
                OperationKind.CoalesceAssignment,
                OperationKind.DeconstructionAssignment,
                OperationKind.Increment,
                OperationKind.Decrement
            );
            startContext.RegisterOperationAction(ctx => AnalyzeInvocation(ctx, types), OperationKind.Invocation);
        });
    }

    private static void AnalyzeAssignment(
        OperationAnalysisContext context,
        Dictionary<INamedTypeSymbol, string[]> types
    )
    {
        var target = context.Operation switch
        {
            IAssignmentOperation assignment => assignment.Target,
            IIncrementOrDecrementOperation incrementOrDecrement => incrementOrDecrement.Target,
            _ => null,
        };

        foreach (var propertyReference in PropertyReferences(target))
        {
            // An object initializer assigns through an implicit receiver, the object it builds.
            if (
                propertyReference.Instance
                is null
                    or IInstanceReferenceOperation { ReferenceKind: InstanceReferenceKind.ImplicitReceiver }
            )
            {
                continue;
            }

            // An indexer, such as instance.Data[0] = dataElement, changes the collection the property holds.
            var changed = propertyReference.Property.IsIndexer
                ? propertyReference.Instance as IPropertyReferenceOperation
                : propertyReference;
            ReportIfNotSaved(context, changed, types);
        }
    }

    private static void AnalyzeInvocation(
        OperationAnalysisContext context,
        Dictionary<INamedTypeSymbol, string[]> types
    )
    {
        var invocation = (IInvocationOperation)context.Operation;
        if (
            _collectionChangingMethods.Contains(invocation.TargetMethod.Name)
            && invocation.TargetMethod.ContainingNamespace?.ToDisplayString() == "System.Collections.Generic"
        )
        {
            ReportIfNotSaved(context, invocation.Instance as IPropertyReferenceOperation, types);
        }
    }

    private static void ReportIfNotSaved(
        OperationAnalysisContext context,
        IPropertyReferenceOperation? propertyReference,
        Dictionary<INamedTypeSymbol, string[]> types
    )
    {
        if (propertyReference is not { Instance.Type: { } receiverType, Property: var property })
        {
            return;
        }

        // The receiver's type finds the listed type, because some properties, such as LastChanged, are declared on
        // a base class they share. A property an app's derived type declares is its own.
        for (ITypeSymbol? type = receiverType; type is not null; type = type.BaseType)
        {
            if (!types.TryGetValue((INamedTypeSymbol)type.OriginalDefinition, out string[]? savedProperties))
            {
                continue;
            }

            if (InheritsFromOrEquals(type, property.ContainingType) && !savedProperties.Contains(property.Name))
            {
                context.ReportDiagnostic(
                    Diagnostic.Create(
                        Diagnostics.CodeSmells.InstancePropertyNotSaved,
                        propertyReference.Syntax.GetLocation(),
                        type.Name,
                        property.Name,
                        SavedProperties
                    )
                );
            }
            return;
        }
    }

    private static bool InheritsFromOrEquals(ITypeSymbol type, ITypeSymbol baseType)
    {
        for (ITypeSymbol? current = type; current is not null; current = current.BaseType)
        {
            if (SymbolEqualityComparer.Default.Equals(current.OriginalDefinition, baseType.OriginalDefinition))
                return true;
        }

        return false;
    }

    // A deconstruction assigns each element of its tuple, which may be a tuple itself.
    private static IEnumerable<IPropertyReferenceOperation> PropertyReferences(IOperation? target)
    {
        switch (target)
        {
            case IPropertyReferenceOperation propertyReference:
                yield return propertyReference;
                break;
            case ITupleOperation tuple:
                foreach (var element in tuple.Elements)
                {
                    foreach (var propertyReference in PropertyReferences(element))
                    {
                        yield return propertyReference;
                    }
                }
                break;
        }
    }
}
