using Microsoft.CodeAnalysis.Operations;

namespace Altinn.App.Analyzers.Process;

/// <summary>
/// What a task hook's <c>ShouldRunForTask</c> returns, reduced to comparisons of the task id with constant strings,
/// so it can be evaluated for each task in the process.
/// </summary>
/// <remarks>
/// A body reduces when it is a single <c>return</c> (or <c>=&gt;</c>) of a constant <c>bool</c>, or of comparisons
/// of the parameter with a constant string joined by <c>!</c>, <c>&amp;&amp;</c> and <c>||</c>. A comparison is
/// <c>==</c> or <c>!=</c>, <c>string.Equals(taskId, "X")</c>, <c>taskId.Equals("X")</c>, either with
/// <c>StringComparison.Ordinal</c>, or a pattern of constants with <c>and</c>, <c>or</c> and <c>not</c>
/// (<c>taskId is "A" or "B"</c>). Any other body may depend on more than the task id, so what it returns is
/// unknown, and the rules that need it skip the hook.
/// </remarks>
internal abstract class TaskIdCondition
{
    private const string MethodName = "ShouldRunForTask";

    /// <summary>Whether the hook runs for the task <paramref name="taskId"/>.</summary>
    internal abstract bool Holds(string taskId);

    /// <summary>The comparisons with a constant task id, in source order.</summary>
    internal abstract IEnumerable<Comparison> Comparisons();

    /// <summary>
    /// Whether <paramref name="method"/> could implement <c>ShouldRunForTask</c>: named after it, or explicitly
    /// implementing it, and taking a string to return a bool.
    /// </summary>
    internal static bool IsShouldRunForTask(IMethodSymbol method) =>
        (method.Name == MethodName || method.ExplicitInterfaceImplementations.Any(m => m.Name == MethodName))
        && method.ReturnType.SpecialType == SpecialType.System_Boolean
        && method.Parameters.Length == 1
        && method.Parameters[0].Type.SpecialType == SpecialType.System_String;

    /// <summary>The condition a <c>ShouldRunForTask</c> body returns, or null when it does not reduce.</summary>
    internal static TaskIdCondition? TryReduce(IMethodSymbol method, ImmutableArray<IOperation> operationBlocks)
    {
        if (
            method.Parameters.Length != 1
            || operationBlocks.FirstOrDefault() is not IBlockOperation { Operations: { Length: 1 } operations }
            || operations[0] is not IReturnOperation { ReturnedValue: { } returned }
        )
        {
            return null;
        }

        return Reduce(returned, method.Parameters[0]);
    }

    private static TaskIdCondition? Reduce(IOperation operation, IParameterSymbol taskId)
    {
        if (operation.ConstantValue is { HasValue: true, Value: bool constant })
        {
            return new Constant(constant);
        }

        switch (operation)
        {
            case IUnaryOperation { OperatorKind: UnaryOperatorKind.Not, Operand: var operand }:
                return Reduce(operand, taskId) is { } negated ? new Not(negated) : null;

            case IBinaryOperation
            {
                OperatorKind: BinaryOperatorKind.ConditionalAnd
                    or BinaryOperatorKind.And
                    or BinaryOperatorKind.ConditionalOr
                    or BinaryOperatorKind.Or,
            } logical when logical.Type?.SpecialType == SpecialType.System_Boolean:
                return
                    Reduce(logical.LeftOperand, taskId) is { } left && Reduce(logical.RightOperand, taskId) is { } right
                    ? new Junction(
                        left,
                        right,
                        logical.OperatorKind is BinaryOperatorKind.ConditionalAnd or BinaryOperatorKind.And
                    )
                    : null;

            // Compare takes the parameter and a string constant as they are, so with a cast to object, which compares
            // references, nothing reduces.
            case IBinaryOperation { OperatorKind: BinaryOperatorKind.Equals or BinaryOperatorKind.NotEquals } equality:
                return Compare(equality.LeftOperand, equality.RightOperand, taskId) is { } comparison
                    ? equality.OperatorKind == BinaryOperatorKind.Equals
                        ? comparison
                        : new Not(comparison)
                    : null;

            case IInvocationOperation invocation:
                return ReduceEquals(invocation, taskId);

            case IIsPatternOperation { Value: var value, Pattern: var pattern } when IsTaskId(value, taskId):
                return ReducePattern(pattern);

            default:
                return null;
        }
    }

    /// <summary>
    /// <c>string.Equals(a, b)</c> and <c>a.Equals(b)</c> with strings, either with <c>StringComparison.Ordinal</c>,
    /// which compare like <c>==</c>.
    /// </summary>
    private static Comparison? ReduceEquals(IInvocationOperation invocation, IParameterSymbol taskId)
    {
        var method = invocation.TargetMethod;
        if (method is not { Name: "Equals", ContainingType.SpecialType: SpecialType.System_String })
        {
            return null;
        }

        var operands = new List<IOperation>();
        if (invocation.Instance is { } instance)
        {
            operands.Add(instance);
        }

        foreach (var argument in invocation.Arguments.OrderBy(argument => argument.Parameter?.Ordinal))
        {
            if (argument.Parameter?.Type.SpecialType == SpecialType.System_String)
            {
                operands.Add(argument.Value);
            }
            else if (argument.Value.ConstantValue is not { HasValue: true, Value: (int)StringComparison.Ordinal })
            {
                return null;
            }
        }

        return operands.Count == 2 ? Compare(operands[0], operands[1], taskId) : null;
    }

    private static TaskIdCondition? ReducePattern(IPatternOperation pattern) =>
        pattern switch
        {
            IConstantPatternOperation { Value: var value } => Comparison.TryCreate(value),
            INegatedPatternOperation { Pattern: var negated } => ReducePattern(negated) is { } inner
                ? new Not(inner)
                : null,
            IBinaryPatternOperation
            {
                OperatorKind: var kind,
                LeftPattern: var leftPattern,
                RightPattern: var rightPattern
            } when kind is BinaryOperatorKind.And or BinaryOperatorKind.Or => ReducePattern(leftPattern) is { } left
            && ReducePattern(rightPattern) is { } right
                ? new Junction(left, right, kind == BinaryOperatorKind.And)
                : null,
            _ => null,
        };

    private static Comparison? Compare(IOperation left, IOperation right, IParameterSymbol taskId) =>
        IsTaskId(left, taskId) ? Comparison.TryCreate(right)
        : IsTaskId(right, taskId) ? Comparison.TryCreate(left)
        : null;

    private static bool IsTaskId(IOperation operation, IParameterSymbol taskId) =>
        operation is IParameterReferenceOperation { Parameter: var parameter }
        && SymbolEqualityComparer.Default.Equals(parameter, taskId);

    /// <summary>A comparison of the task id with a constant string, which holds for that id only.</summary>
    internal sealed class Comparison : TaskIdCondition
    {
        private Comparison(string taskId, Location location)
        {
            TaskId = taskId;
            Location = location;
        }

        /// <summary>The id the task id is compared with.</summary>
        internal string TaskId { get; }

        /// <summary>Where the id is written.</summary>
        internal Location Location { get; }

        /// <summary>A comparison with <paramref name="operand"/>, or null when it is not a constant string.</summary>
        internal static Comparison? TryCreate(IOperation operand) =>
            operand
                is { Type.SpecialType: SpecialType.System_String, ConstantValue: { HasValue: true, Value: string id } }
                ? new Comparison(id, operand.Syntax.GetLocation())
                : null;

        internal override bool Holds(string taskId) => string.Equals(taskId, TaskId, StringComparison.Ordinal);

        internal override IEnumerable<Comparison> Comparisons() => [this];
    }

    private sealed class Constant(bool value) : TaskIdCondition
    {
        internal override bool Holds(string taskId) => value;

        internal override IEnumerable<Comparison> Comparisons() => [];
    }

    private sealed class Not(TaskIdCondition condition) : TaskIdCondition
    {
        internal override bool Holds(string taskId) => !condition.Holds(taskId);

        internal override IEnumerable<Comparison> Comparisons() => condition.Comparisons();
    }

    private sealed class Junction(TaskIdCondition left, TaskIdCondition right, bool isAnd) : TaskIdCondition
    {
        internal override bool Holds(string taskId) =>
            isAnd ? left.Holds(taskId) && right.Holds(taskId) : left.Holds(taskId) || right.Holds(taskId);

        internal override IEnumerable<Comparison> Comparisons() => left.Comparisons().Concat(right.Comparisons());
    }
}
