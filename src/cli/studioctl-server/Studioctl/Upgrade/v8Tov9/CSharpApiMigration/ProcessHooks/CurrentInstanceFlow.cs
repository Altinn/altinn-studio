using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Operations;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>Which part of an instance's identity an expression holds.</summary>
internal enum InstancePart
{
    Instance,
    Mutator,

    /// <summary>The instance id, <c>{partyId}/{instanceGuid}</c>.</summary>
    Id,

    /// <summary><c>Id.Split('/')</c>.</summary>
    IdParts,
    Guid,
    GuidText,
    PartyId,
    PartyIdText,
    InstanceOwner,
    Identifier,
    Element,
    Elements,
    Instances,
    Tuple,

    /// <summary>A constant, which can only name a fixed instance.</summary>
    Constant,
}

/// <summary>
/// What an expression holds: a part of the hook's own instance (<see cref="IsCurrent"/>), or of another instance the
/// code proves is another one. <see cref="Items"/> holds a tuple's elements.
/// </summary>
internal sealed record InstanceFact(InstancePart Part, bool IsCurrent, IReadOnlyList<InstanceFact?>? Items = null)
{
    public static InstanceFact Current(InstancePart part) => new(part, true);

    public static InstanceFact Other(InstancePart part) => new(part, false);
}

/// <summary>Whether a Storage call targets the hook's instance.</summary>
internal enum TargetKind
{
    Current,

    /// <summary>Another instance, proven: one read for other ids, created, listed, or named by a constant.</summary>
    Other,

    /// <summary>The upgrade could not tell which instance.</summary>
    Unknown,
}

/// <param name="Expression">For <see cref="TargetKind.Other"/> and <see cref="TargetKind.Unknown"/>, the argument that decided it.</param>
internal sealed record CallTarget(TargetKind Kind, ExpressionSyntax? Expression);

/// <summary>
/// Whether the instance arguments of a Storage call denote the instance the process transition is
/// for. <c>org</c> and <c>app</c> arguments are ignored, since v8 builds every Storage URL from the party id and the
/// instance guid alone. Recognized: the hook's instance and the mutator's; its id, the parts of the id and the party
/// id, parsed; an <c>InstanceIdentifier</c> of it and its members; the instance guid of one of its data elements;
/// locals, fields and primary-constructor parameters every assignment of which is one of these; parameters of
/// window-only methods every caller passes one of these to; and what an app helper or a known package helper returns
/// from one of these, one call deep.
/// </summary>
internal sealed class CurrentInstanceFlow
{
    private static readonly HashSet<string> _sequenceMembers =
    [
        "Where",
        "OrderBy",
        "OrderByDescending",
        "ThenBy",
        "ThenByDescending",
        "ToList",
        "ToArray",
        "AsEnumerable",
        "Skip",
        "Take",
        "Reverse",
        "Distinct",
        "FindAll",
        "Concat",
    ];

    private static readonly HashSet<string> _elementMembers =
    [
        "First",
        "FirstOrDefault",
        "Single",
        "SingleOrDefault",
        "Last",
        "LastOrDefault",
        "ElementAt",
        "ElementAtOrDefault",
        "Find",
        "FindLast",
    ];

    private readonly WindowReach _reach;
    private readonly IReadOnlySet<IParameterSymbol> _instances;
    private readonly IReadOnlySet<IParameterSymbol> _contexts;
    private readonly Func<IMethodSymbol, bool> _isWindowOnly;
    private readonly HashSet<ISymbol> _evaluating = new(SymbolEqualityComparer.Default);
    private readonly Dictionary<IParameterSymbol, InstanceFact> _initial = new(SymbolEqualityComparer.Default);
    private Dictionary<IFieldSymbol, List<(IMethodSymbol Member, IOperation? Value)>>? _fieldAssignments;

    /// <param name="instances">The entries' v8 instance parameters.</param>
    /// <param name="contexts">The service tasks' context parameters, whose mutator is the instance's.</param>
    /// <param name="isWindowOnly">Whether only the process transition calls a method.</param>
    public CurrentInstanceFlow(
        WindowReach reach,
        IEnumerable<IParameterSymbol> instances,
        IEnumerable<IParameterSymbol> contexts,
        Func<IMethodSymbol, bool> isWindowOnly
    )
    {
        _reach = reach;
        _instances = instances.ToHashSet<IParameterSymbol>(SymbolEqualityComparer.Default);
        _contexts = contexts.ToHashSet<IParameterSymbol>(SymbolEqualityComparer.Default);
        _isWindowOnly = isWindowOnly;
    }

    /// <summary>Whether the call's instance arguments are all the current instance, another proven one, or unknown.</summary>
    public CallTarget Target(StorageClientCall call)
    {
        CallTarget? unknown = null;
        var any = false;
        foreach (var argument in call.Invocation.Arguments)
        {
            if (argument.Parameter is not { } parameter || Expected(parameter) is not { } expected)
            {
                continue;
            }

            any = true;
            var fact = Evaluate(argument.Value);
            var expression = StorageClientCall.Expression(argument);
            if (fact is { IsCurrent: false })
            {
                return new CallTarget(TargetKind.Other, expression);
            }

            if (fact is not { IsCurrent: true } || fact.Part != expected)
            {
                unknown ??= new CallTarget(TargetKind.Unknown, expression);
            }
        }

        return unknown ?? (any ? new CallTarget(TargetKind.Current, null) : new CallTarget(TargetKind.Unknown, null));
    }

    /// <summary>What <paramref name="operation"/> holds, or <c>null</c> when it is not recognized.</summary>
    public InstanceFact? Evaluate(IOperation? operation) => Evaluate(operation, Bindings.None);

    private static InstancePart? Expected(IParameterSymbol parameter)
    {
        var type = parameter.Type.OriginalDefinition.ToDisplayString();
        return (type, parameter.Name) switch
        {
            ("Altinn.Platform.Storage.Interface.Models.Instance", _) => InstancePart.Instance,
            ("Altinn.App.Core.Models.InstanceIdentifier", _) => InstancePart.Identifier,
            ("string", "instanceId") => InstancePart.Id,
            ("System.Guid", "instanceGuid" or "instanceId") => InstancePart.Guid,
            ("int", "instanceOwnerPartyId" or "partyId") => InstancePart.PartyId,
            _ => null,
        };
    }

    private InstanceFact? Evaluate(IOperation? operation, Bindings bindings) =>
        operation is null ? null : EvaluateUnwrapped(Unwrap(operation), bindings);

    private static IOperation Unwrap(IOperation operation)
    {
        while (true)
        {
            switch (operation)
            {
                case IConversionOperation conversion:
                    operation = conversion.Operand;
                    continue;
                case IParenthesizedOperation parenthesized:
                    operation = parenthesized.Operand;
                    continue;
                case IAwaitOperation awaited:
                    operation = awaited.Operation;
                    continue;
                case IArgumentOperation argument:
                    operation = argument.Value;
                    continue;
                case IPropertyReferenceOperation { Property.Name: "Result", Instance: { } task }
                    when task.Type?.OriginalDefinition.ToDisplayString() == "System.Threading.Tasks.Task<TResult>":
                    operation = task;
                    continue;
                default:
                    return operation;
            }
        }
    }

    private InstanceFact? EvaluateUnwrapped(IOperation operation, Bindings bindings)
    {
        if (
            operation.ConstantValue is { HasValue: true, Value: not null }
            || operation is IFieldReferenceOperation { Field.Name: "Empty" } empty
                && empty.Field.ContainingType.ToDisplayString() == "System.Guid"
        )
        {
            return InstanceFact.Other(InstancePart.Constant);
        }

        return operation switch
        {
            IParameterReferenceOperation parameter => Parameter(parameter.Parameter, operation, bindings),
            ILocalReferenceOperation local => Local(local.Local, operation, bindings),
            IConditionalAccessInstanceOperation => bindings.ConditionalReceiver,
            IConditionalAccessOperation conditional => Evaluate(
                conditional.WhenNotNull,
                bindings with
                {
                    ConditionalReceiver = Evaluate(conditional.Operation, bindings),
                }
            ),
            IPropertyReferenceOperation property => Property(property, bindings),
            IFieldReferenceOperation field => Field(field, bindings),
            IArrayElementReferenceOperation element => ArrayElement(element, bindings),
            IInvocationOperation invocation => Invocation(invocation, bindings),
            IObjectCreationOperation creation => Creation(creation, bindings),
            ITupleOperation tuple => new InstanceFact(
                InstancePart.Tuple,
                true,
                [.. tuple.Elements.Select(element => Evaluate(element, bindings))]
            ),
            _ => null,
        };
    }

    private InstanceFact? Parameter(IParameterSymbol parameter, IOperation operation, Bindings bindings)
    {
        if (bindings.Parameters.TryGetValue(parameter.OriginalDefinition, out var bound))
        {
            return bound;
        }

        if (_instances.Contains(parameter.OriginalDefinition))
        {
            return EntryInstance(parameter, operation, bindings);
        }

        if (_contexts.Contains(parameter.OriginalDefinition))
        {
            return null;
        }

        if (parameter.ContainingSymbol is IMethodSymbol { MethodKind: MethodKind.AnonymousFunction } lambda)
        {
            return LambdaParameter(parameter, lambda, operation, bindings);
        }

        if (_initial.TryGetValue(parameter.OriginalDefinition, out var initial))
        {
            return initial;
        }

        if (parameter.ContainingSymbol is not IMethodSymbol method || !_evaluating.Add(parameter))
        {
            return null;
        }

        try
        {
            if (method.MethodKind == MethodKind.Constructor)
            {
                return AssignedInItsType(method, parameter) ? null : CreatedWith(method, parameter);
            }

            if (!_isWindowOnly(method.OriginalDefinition))
            {
                return null;
            }

            var callers = _reach.CallersOf(method);
            if (callers.Count == 0 || callers.Any(static site => site.IsDelegate))
            {
                return null;
            }

            var passed = Agreed(callers.Select(site => ArgumentFor(site.Operation, parameter)));
            if (passed is null || !HasWrites(parameter, operation))
            {
                return passed;
            }

            // Assigned in the method too: every assignment must agree with what the callers pass, which the parameter
            // holds inside its own assignments.
            _initial[parameter.OriginalDefinition] = passed;
            try
            {
                return Agreed(Writes(Root(operation), parameter, bindings).Append(passed));
            }
            finally
            {
                _initial.Remove(parameter.OriginalDefinition);
            }
        }
        finally
        {
            _evaluating.Remove(parameter);
        }
    }

    /// <summary>A lambda's parameter that runs over a sequence of the instance's data elements.</summary>
    private InstanceFact? LambdaParameter(
        IParameterSymbol parameter,
        IMethodSymbol lambda,
        IOperation operation,
        Bindings bindings
    )
    {
        var function = Ancestors(operation)
            .OfType<IAnonymousFunctionOperation>()
            .FirstOrDefault(candidate => SymbolEqualityComparer.Default.Equals(candidate.Symbol, lambda));
        if (
            parameter.Ordinal != 0
            || function?.Parent
                is not IDelegateCreationOperation
                {
                    Parent: IArgumentOperation { Parent: IInvocationOperation invocation }
                }
        )
        {
            return null;
        }

        var source = invocation.Instance ?? (invocation.Arguments.Length > 0 ? invocation.Arguments[0].Value : null);
        return Evaluate(source, bindings) is { Part: InstancePart.Elements } elements
            ? elements with
            {
                Part = InstancePart.Element,
            }
            : null;
    }

    /// <summary>
    /// The entry's instance parameter, which stays current when every assignment to it is current; inside such an
    /// assignment it still has the value it came with.
    /// </summary>
    private InstanceFact? EntryInstance(IParameterSymbol parameter, IOperation operation, Bindings bindings)
    {
        var current = InstanceFact.Current(InstancePart.Instance);
        if (!_evaluating.Add(parameter))
        {
            return current;
        }

        try
        {
            return Agreed(Writes(Root(operation), parameter, bindings).Append(current));
        }
        finally
        {
            _evaluating.Remove(parameter);
        }
    }

    private InstanceFact? Local(ILocalSymbol local, IOperation operation, Bindings bindings)
    {
        if (!_evaluating.Add(local))
        {
            return null;
        }

        try
        {
            var writes = Writes(Root(operation), local, bindings).ToList();
            return writes.Count == 0 ? null : Agreed(writes);
        }
        finally
        {
            _evaluating.Remove(local);
        }
    }

    private static bool HasWrites(IParameterSymbol parameter, IOperation operation) =>
        Root(operation)
            .DescendantsAndSelf()
            .Any(descendant =>
                descendant is ISimpleAssignmentOperation { Target: IParameterReferenceOperation target }
                    && SymbolEqualityComparer.Default.Equals(target.Parameter, parameter)
                || descendant
                    is IArgumentOperation
                    {
                        Parameter.RefKind: RefKind.Out or RefKind.Ref,
                        Value: IParameterReferenceOperation passed
                    }
                    && SymbolEqualityComparer.Default.Equals(passed.Parameter, parameter)
            );

    private IEnumerable<InstanceFact?> Writes(IOperation body, ISymbol symbol, Bindings bindings)
    {
        foreach (var descendant in body.DescendantsAndSelf())
        {
            switch (descendant)
            {
                case IVariableDeclaratorOperation declarator
                    when SymbolEqualityComparer.Default.Equals(declarator.Symbol, symbol):
                    var initializer =
                        declarator.Initializer ?? (declarator.Parent as IVariableDeclarationOperation)?.Initializer;
                    if (initializer is not null)
                    {
                        yield return Evaluate(initializer.Value, bindings);
                    }
                    else if (declarator.Parent?.Parent is not IForEachLoopOperation)
                    {
                        // Declared without a value, so a later assignment or out argument gives it one.
                        continue;
                    }

                    break;
                case ISimpleAssignmentOperation assignment when Refers(assignment.Target, symbol):
                    yield return Evaluate(assignment.Value, bindings);
                    break;
                case ICompoundAssignmentOperation compound when Refers(compound.Target, symbol):
                    yield return null;
                    break;
                case IDeconstructionAssignmentOperation deconstruction:
                    if (Deconstructed(deconstruction.Target, symbol) is { } path)
                    {
                        yield return Item(Evaluate(deconstruction.Value, bindings), path);
                    }

                    break;
                case IArgumentOperation { Parameter.RefKind: RefKind.Out or RefKind.Ref } argument
                    when Refers(argument.Value, symbol):
                    yield return OutArgument(argument, bindings);
                    break;
                case IForEachLoopOperation loop when loop.Locals.Contains(symbol, SymbolEqualityComparer.Default):
                    yield return Evaluate(loop.Collection, bindings) is { Part: InstancePart.Elements } elements
                        ? elements with
                        {
                            Part = InstancePart.Element,
                        }
                        : null;
                    break;
                case IDeclarationPatternOperation pattern
                    when SymbolEqualityComparer.Default.Equals(pattern.DeclaredSymbol, symbol):
                    yield return null;
                    break;
            }
        }
    }

    private static bool Refers(IOperation target, ISymbol symbol) =>
        target switch
        {
            ILocalReferenceOperation local => SymbolEqualityComparer.Default.Equals(local.Local, symbol),
            IParameterReferenceOperation parameter => SymbolEqualityComparer.Default.Equals(
                parameter.Parameter,
                symbol
            ),
            IDeclarationExpressionOperation declaration => Refers(declaration.Expression, symbol),
            _ => false,
        };

    /// <summary>Where in a deconstruction's tuple <paramref name="symbol"/> gets its value.</summary>
    private static IReadOnlyList<int>? Deconstructed(IOperation target, ISymbol symbol)
    {
        switch (target)
        {
            case IDeclarationExpressionOperation declaration:
                return Deconstructed(declaration.Expression, symbol);
            case ITupleOperation tuple:
                for (var i = 0; i < tuple.Elements.Length; i++)
                {
                    if (Refers(tuple.Elements[i], symbol))
                    {
                        return [i];
                    }

                    if (Deconstructed(tuple.Elements[i], symbol) is { } inner)
                    {
                        return [i, .. inner];
                    }
                }

                return null;
            default:
                return null;
        }
    }

    private static InstanceFact? Item(InstanceFact? fact, IReadOnlyList<int> path)
    {
        foreach (var index in path)
        {
            if (fact is not { Part: InstancePart.Tuple, Items: { } items } || index >= items.Count)
            {
                return null;
            }

            fact = items[index];
        }

        return fact;
    }

    /// <summary><c>Guid.TryParse(text, out g)</c> and <c>int.TryParse(text, out p)</c> of the instance's parts.</summary>
    private InstanceFact? OutArgument(IArgumentOperation argument, Bindings bindings)
    {
        if (argument.Parent is not IInvocationOperation { TargetMethod: { Name: "TryParse" } method } invocation)
        {
            return null;
        }

        var parsed = Evaluate(invocation.Arguments[0].Value, bindings);
        return (method.ContainingType.SpecialType, method.ContainingType.ToDisplayString(), parsed?.Part) switch
        {
            (_, "System.Guid", InstancePart.GuidText) => parsed with { Part = InstancePart.Guid },
            (SpecialType.System_Int32, _, InstancePart.PartyIdText) => parsed with { Part = InstancePart.PartyId },
            _ => null,
        };
    }

    private InstanceFact? Property(IPropertyReferenceOperation property, Bindings bindings)
    {
        var name = property.Property.Name;
        var receiver = property.Instance is { } instance ? Evaluate(instance, bindings) : null;
        var containing = property.Property.ContainingType.OriginalDefinition.ToDisplayString();
        if (
            name == "InstanceDataMutator"
            && containing == "Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.ServiceTaskContext"
            && property.Instance is IParameterReferenceOperation context
            && _contexts.Contains(context.Parameter.OriginalDefinition)
        )
        {
            return InstanceFact.Current(InstancePart.Mutator);
        }

        if (receiver is null)
        {
            return null;
        }

        return (receiver.Part, name) switch
        {
            (InstancePart.Mutator, "Instance") => receiver with { Part = InstancePart.Instance },
            (InstancePart.Instance, "Id") => receiver with { Part = InstancePart.Id },
            (InstancePart.Instance, "InstanceOwner") => receiver with { Part = InstancePart.InstanceOwner },
            (InstancePart.InstanceOwner, "PartyId") => receiver with { Part = InstancePart.PartyIdText },
            (InstancePart.Instance, "Data") => receiver with { Part = InstancePart.Elements },
            (InstancePart.Elements, "this[]") => receiver with { Part = InstancePart.Element },
            (InstancePart.Instances, "this[]") => InstanceFact.Other(InstancePart.Instance),
            (InstancePart.Element, "InstanceGuid") => receiver with { Part = InstancePart.GuidText },
            (InstancePart.Identifier, "InstanceOwnerPartyId") => receiver with { Part = InstancePart.PartyId },
            (InstancePart.Identifier, "InstanceGuid") => receiver with { Part = InstancePart.Guid },
            _ => null,
        };
    }

    private InstanceFact? Field(IFieldReferenceOperation field, Bindings bindings)
    {
        if (field.Field.ContainingType.IsTupleType)
        {
            var tuple = field.Instance is { } receiver ? Evaluate(receiver, bindings) : null;
            var element = field.Field.CorrespondingTupleField ?? field.Field;
            var elements = field.Field.ContainingType.TupleElements;
            var index = -1;
            for (var i = 0; i < elements.Length && index < 0; i++)
            {
                if (SymbolEqualityComparer.Default.Equals(elements[i], element))
                {
                    index = i;
                }
            }

            return index >= 0 ? Item(tuple, [index]) : null;
        }

        var symbol = field.Field.OriginalDefinition;
        if (!_evaluating.Add(symbol))
        {
            return null;
        }

        try
        {
            return FieldWrites(symbol);
        }
        finally
        {
            _evaluating.Remove(symbol);
        }
    }

    /// <summary>
    /// A field of the app every assignment of which is a current expression: in a constructor of its type, from a
    /// constructor parameter every creation of the object passes a current expression to. Assignments are looked for in
    /// all of the app's code, since code outside the type can set a field it can see.
    /// </summary>
    private InstanceFact? FieldWrites(IFieldSymbol field)
    {
        foreach (var reference in field.ContainingType.DeclaringSyntaxReferences)
        {
            if (!_reach.Compilation.SyntaxTrees.Contains(reference.SyntaxTree))
            {
                return null;
            }
        }

        var writes = FieldAssignments()
            .GetValueOrDefault(field)
            ?.Select(assignment =>
                assignment.Member.MethodKind == MethodKind.Constructor
                && SymbolEqualityComparer.Default.Equals(assignment.Member.ContainingType, field.ContainingType)
                    ? Evaluate(assignment.Value)
                    : null
            )
            .ToList();
        return writes is null or [] ? null : Agreed(writes);
    }

    /// <summary>
    /// Every write to a field in the app's code, with the member it is in and the value; no value for a write other than
    /// a simple assignment.
    /// </summary>
    private Dictionary<IFieldSymbol, List<(IMethodSymbol Member, IOperation? Value)>> FieldAssignments()
    {
        if (_fieldAssignments is { } known)
        {
            return known;
        }

        var assignments = new Dictionary<IFieldSymbol, List<(IMethodSymbol, IOperation?)>>(
            SymbolEqualityComparer.Default
        );
        foreach (var body in _reach.Bodies)
        {
            foreach (var descendant in body.Operation.DescendantsAndSelf())
            {
                IEnumerable<(IFieldReferenceOperation Target, IOperation? Value)> writes = descendant switch
                {
                    ISimpleAssignmentOperation { Target: IFieldReferenceOperation target } simple =>
                    [
                        (target, simple.Value),
                    ],
                    IAssignmentOperation { Target: IFieldReferenceOperation target } => [(target, null)],
                    IArgumentOperation
                    {
                        Parameter.RefKind: RefKind.Out or RefKind.Ref,
                        Value: IFieldReferenceOperation target
                    } => [(target, null)],
                    IDeconstructionAssignmentOperation deconstruction => deconstruction
                        .Target.DescendantsAndSelf()
                        .OfType<IFieldReferenceOperation>()
                        .Select(static target => (target, (IOperation?)null)),
                    _ => [],
                };
                foreach (var (target, value) in writes)
                {
                    var field = target.Field.OriginalDefinition;
                    if (!assignments.TryGetValue(field, out var list))
                    {
                        assignments[field] = list = [];
                    }

                    list.Add((body.Method, value));
                }
            }
        }

        return _fieldAssignments = assignments;
    }

    /// <summary>
    /// Whether a member of the constructor's type assigns the parameter, which a primary-constructor parameter lets every
    /// member do. A part of the type outside the compilation counts as assigning it.
    /// </summary>
    private bool AssignedInItsType(IMethodSymbol constructor, IParameterSymbol parameter) =>
        constructor.ContainingType.DeclaringSyntaxReferences.Any(reference =>
            !_reach.Compilation.SyntaxTrees.Contains(reference.SyntaxTree)
        )
        || _reach
            .Bodies.Where(body =>
                SymbolEqualityComparer.Default.Equals(body.Method.ContainingType, constructor.ContainingType)
            )
            .Any(body => HasWrites(parameter, body.Operation));

    /// <summary>
    /// A constructor parameter, current when every creation of the object in the app passes a current expression. A
    /// chained <c>this(...)</c> or <c>base(...)</c> call creates the object too.
    /// </summary>
    private InstanceFact? CreatedWith(IMethodSymbol constructor, IParameterSymbol parameter)
    {
        var sites = _reach.CallersOf(constructor);
        return sites.Count == 0 || DerivedWithPrimaryConstructor(constructor.ContainingType)
            ? null
            : Agreed(sites.Select(site => ArgumentFor(site.Operation, parameter)));
    }

    /// <summary>
    /// Whether an app type passes arguments to the type's constructor from its primary constructor's base list, which
    /// the call graph does not hold as a call site.
    /// </summary>
    private bool DerivedWithPrimaryConstructor(INamedTypeSymbol type) =>
        _reach
            .SourceTypesOf(type)
            .Where(derived => !SymbolEqualityComparer.Default.Equals(derived, type))
            .SelectMany(static derived => derived.DeclaringSyntaxReferences)
            .Any(reference =>
                reference.GetSyntax()
                    is TypeDeclarationSyntax { BaseList.Types: [PrimaryConstructorBaseTypeSyntax, ..] }
            );

    private InstanceFact? ArgumentFor(IOperation call, IParameterSymbol parameter)
    {
        var arguments = call switch
        {
            IInvocationOperation invocation => invocation.Arguments,
            IObjectCreationOperation creation => creation.Arguments,
            _ => default,
        };
        if (arguments.IsDefault)
        {
            return null;
        }

        var argument = arguments.FirstOrDefault(candidate =>
            candidate.Parameter is { } p && p.Ordinal == parameter.Ordinal
        );
        return argument is null || argument.ArgumentKind == ArgumentKind.DefaultValue ? null : Evaluate(argument.Value);
    }

    private InstanceFact? ArrayElement(IArrayElementReferenceOperation element, Bindings bindings)
    {
        if (
            Evaluate(element.ArrayReference, bindings) is not { Part: InstancePart.IdParts } parts
            || element.Indices is not [{ ConstantValue: { HasValue: true, Value: int index } }]
        )
        {
            return null;
        }

        return index switch
        {
            0 => parts with { Part = InstancePart.PartyIdText },
            1 => parts with { Part = InstancePart.GuidText },
            _ => null,
        };
    }

    private InstanceFact? Invocation(IInvocationOperation invocation, Bindings bindings)
    {
        var method = (invocation.TargetMethod.ReducedFrom ?? invocation.TargetMethod).OriginalDefinition;
        var receiver =
            invocation.Instance
            ?? (method.IsExtensionMethod && invocation.Arguments.Length > 0 ? invocation.Arguments[0].Value : null);
        var firstArgument = invocation.Arguments.Length > 0 ? invocation.Arguments[0].Value : null;
        var containing = method.ContainingType.ToDisplayString();

        if (StorageClientCall.ClientOf(method) is StorageClient.Instance)
        {
            return InstanceRead(invocation, method, bindings);
        }

        if (KnownPackageMembers.IsElementHelper(method))
        {
            return Evaluate(receiver, bindings) is { Part: InstancePart.Instance } owner
                ? owner with
                {
                    Part = InstancePart.Element,
                }
                : null;
        }

        if (KnownPackageMembers.IdentityHelper(method) is { } helped)
        {
            return Evaluate(receiver, bindings) is { Part: InstancePart.Instance } instance
                ? instance with
                {
                    Part = helped,
                }
                : null;
        }

        switch (method.Name)
        {
            case "Split" when method.ContainingType.SpecialType == SpecialType.System_String:
                return Evaluate(invocation.Instance, bindings) is { Part: InstancePart.Id } id && IsSlash(firstArgument)
                    ? id with
                    {
                        Part = InstancePart.IdParts,
                    }
                    : null;
            case "Parse" when containing == "System.Guid":
                return Evaluate(firstArgument, bindings) is { Part: InstancePart.GuidText } guidText
                    ? guidText with
                    {
                        Part = InstancePart.Guid,
                    }
                    : null;
            case "Parse" when method.ContainingType.SpecialType == SpecialType.System_Int32:
            case "ToInt32" when containing == "System.Convert":
                return Evaluate(firstArgument, bindings) is { Part: InstancePart.PartyIdText } partyText
                    ? partyText with
                    {
                        Part = InstancePart.PartyId,
                    }
                    : null;
            case "GetInstanceId" or "ToString" when containing == "Altinn.App.Core.Models.InstanceIdentifier":
                return Evaluate(invocation.Instance, bindings) is { Part: InstancePart.Identifier } identifier
                    ? identifier with
                    {
                        Part = InstancePart.Id,
                    }
                    : null;
        }

        if (
            (_sequenceMembers.Contains(method.Name) || _elementMembers.Contains(method.Name))
            && (
                containing is "System.Linq.Enumerable"
                || method.ContainingType.OriginalDefinition.ToDisplayString() == "System.Collections.Generic.List<T>"
            )
        )
        {
            var part = _elementMembers.Contains(method.Name) ? InstancePart.Element : InstancePart.Elements;
            return Evaluate(receiver, bindings) is { Part: InstancePart.Elements } elements
                ? elements with
                {
                    Part = part,
                }
                : null;
        }

        return bindings.InHelper ? null : Helper(invocation, method);
    }

    /// <summary><c>GetInstance</c> of the current instance re-reads it; other ids, a new instance or a list are others.</summary>
    private InstanceFact? InstanceRead(IInvocationOperation invocation, IMethodSymbol method, Bindings bindings)
    {
        switch (method.Name)
        {
            case "CreateInstance":
                return InstanceFact.Other(InstancePart.Instance);
            case "GetInstances":
                return InstanceFact.Other(InstancePart.Instances);
            case "GetInstance"
            or "UpdateDataValues"
            or "UpdateDataValue"
            or "UpdatePresentationTexts"
            or "UpdateSubstatus"
            or "UpdateReadStatus"
            or "AddCompleteConfirmation":
                var parts = invocation
                    .Arguments.Where(argument => argument.Parameter is { } p && Expected(p) is not null)
                    .Select(argument => Evaluate(argument.Value, bindings))
                    .ToList();
                if (parts.Count == 0 || parts.Any(static part => part is null))
                {
                    return null;
                }

                if (parts.All(static part => part is { IsCurrent: true }))
                {
                    return InstanceFact.Current(InstancePart.Instance);
                }

                return parts.All(static part => part is { IsCurrent: false })
                    ? InstanceFact.Other(InstancePart.Instance)
                    : null;
            default:
                return null;
        }
    }

    /// <summary>
    /// An app method whose every return is current once its parameters are bound to the call's arguments,
    /// with no calls of other app methods.
    /// </summary>
    private InstanceFact? Helper(IInvocationOperation invocation, IMethodSymbol method)
    {
        if (_reach.Body(method) is not { } body || !_evaluating.Add(method))
        {
            return null;
        }

        try
        {
            var parameters = new Dictionary<IParameterSymbol, InstanceFact?>(SymbolEqualityComparer.Default);
            foreach (var argument in invocation.Arguments)
            {
                if (argument.Parameter is { } parameter)
                {
                    parameters[parameter.OriginalDefinition] = HasWrites(parameter.OriginalDefinition, body.Operation)
                        ? null
                        : Evaluate(argument.Value);
                }
            }

            var bindings = new Bindings(parameters, null, InHelper: true);
            var returned = body
                .Operation.DescendantsAndSelf()
                .OfType<IReturnOperation>()
                .Where(static ret => ret.ReturnedValue is not null && !InLambda(ret))
                .Select(ret => Evaluate(ret.ReturnedValue, bindings))
                .ToList();
            return returned.Count == 0 ? null : Agreed(returned);
        }
        finally
        {
            _evaluating.Remove(method);
        }
    }

    private static bool InLambda(IOperation operation) =>
        Ancestors(operation).Any(static ancestor => ancestor is IAnonymousFunctionOperation or ILocalFunctionOperation);

    private InstanceFact? Creation(IObjectCreationOperation creation, Bindings bindings)
    {
        var type = creation.Type?.OriginalDefinition.ToDisplayString();
        var facts = creation.Arguments.Select(argument => Evaluate(argument.Value, bindings)).ToList();
        switch (type)
        {
            case "System.Guid" when facts is [{ Part: InstancePart.GuidText } text]:
                return text with { Part = InstancePart.Guid };
            case "Altinn.App.Core.Models.InstanceIdentifier":
                return facts switch
                {
                    [{ Part: InstancePart.Instance or InstancePart.Id } single] => single with
                    {
                        Part = InstancePart.Identifier,
                    },
                    [{ Part: InstancePart.PartyId } party, { Part: InstancePart.Guid } guid]
                        when party.IsCurrent == guid.IsCurrent => party with
                    {
                        Part = InstancePart.Identifier,
                    },
                    _ => null,
                };
            default:
                return null;
        }
    }

    private static bool IsSlash(IOperation? separator) =>
        separator is not null
        && Unwrap(separator) is var value
        && (
            value.ConstantValue is { HasValue: true, Value: '/' or "/" }
            || value
                is IArrayCreationOperation
                {
                    Initializer.ElementValues: [{ ConstantValue: { HasValue: true, Value: '/' or "/" } }]
                }
        );

    /// <summary>The value every write agrees on, current or proven other; <c>null</c> when they differ or one is unknown.</summary>
    private static InstanceFact? Agreed(IEnumerable<InstanceFact?> facts)
    {
        InstanceFact? agreed = null;
        foreach (var fact in facts)
        {
            if (fact is null)
            {
                return null;
            }

            if (agreed is null)
            {
                agreed = fact;
                continue;
            }

            if (fact.IsCurrent != agreed.IsCurrent)
            {
                return null;
            }

            if (fact.Part != agreed.Part)
            {
                if (!agreed.IsCurrent)
                {
                    continue;
                }

                return null;
            }

            if (agreed.Part == InstancePart.Tuple && !Same(agreed, fact))
            {
                return null;
            }
        }

        return agreed;
    }

    private static bool Same(InstanceFact left, InstanceFact right) =>
        left.Items is { } l
        && right.Items is { } r
        && l.Count == r.Count
        && l.Zip(r)
            .All(static pair =>
                pair.First?.Part == pair.Second?.Part && pair.First?.IsCurrent == pair.Second?.IsCurrent
            );

    private static IOperation Root(IOperation operation)
    {
        var root = operation;
        while (root.Parent is { } parent)
        {
            root = parent;
        }

        return root;
    }

    private static IEnumerable<IOperation> Ancestors(IOperation operation)
    {
        for (var current = operation.Parent; current is not null; current = current.Parent)
        {
            yield return current;
        }
    }

    /// <summary>Parameters bound to what a call passes them, while a helper's returns are evaluated.</summary>
    private sealed record Bindings(
        IReadOnlyDictionary<IParameterSymbol, InstanceFact?> Parameters,
        InstanceFact? ConditionalReceiver,
        bool InHelper
    )
    {
        public static readonly Bindings None = new(
            new Dictionary<IParameterSymbol, InstanceFact?>(SymbolEqualityComparer.Default),
            null,
            false
        );
    }
}
