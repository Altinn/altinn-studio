using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Operations;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>
/// How a ported form read differs from the v8 read. v8 read an object of its own and saved it only where the code
/// wrote it; the mutator's <c>GetFormData</c> reads the model the transition saves.
/// </summary>
internal enum ReadDifference
{
    /// <summary>
    /// Nothing: the code never changes what it read (C-RF1 a), or writes it back to the same element right after
    /// changing it (C-RF1 b).
    /// </summary>
    None,

    /// <summary>
    /// The code changes the model, or hands it to code that may, without writing it back right after: v9 saves the
    /// changes also where the code does not reach a write (C-RF2).
    /// </summary>
    MaySaveMore,

    /// <summary>The code assigns to the model and never writes the element: v8 dropped the changes, v9 saves them.</summary>
    SavesUnwrittenChanges,

    /// <summary>Another read of the element in the method changes the model, and this read sees those changes.</summary>
    SharesChangedModel,
}

/// <summary>
/// What the port does with a form read: the difference from v8 it reports, and the write back it deletes
/// (<see cref="WriteBack"/>, C-RF1 b).
/// </summary>
internal sealed record ReadDecision(ReadDifference Difference, StorageClientCall? WriteBack)
{
    public static readonly ReadDecision Same = new(ReadDifference.None, null);
    public static readonly ReadDecision MaySaveMore = new(ReadDifference.MaySaveMore, null);
}

/// <summary>C-RF1 and C-RF2: how the live model a ported form read returns differs from what v8 read.</summary>
internal static class ReadSemantics
{
    /// <param name="writes">The form writes in the same method that the rewrite moves to the mutator.</param>
    /// <param name="everyWrite">Those and the form writes in the method that stay as they are.</param>
    /// <param name="sameElement">Whether two element arguments name the same data element.</param>
    public static ReadDecision Decide(
        StorageClientCall read,
        IReadOnlyList<StorageClientCall> writes,
        IReadOnlyList<StorageClientCall> everyWrite,
        Func<StorageClientCall, StorageClientCall, bool> sameElement
    )
    {
        var body = Root(read.Invocation);
        if (Variable(read) is not { } variable)
        {
            return
                read.Use.Kind is CallUseKind.Statement or CallUseKind.Discard || IsValueRead(Consumer(read.Invocation))
                ? ReadDecision.Same
                : ReadDecision.MaySaveMore;
        }

        if (Writes(body, variable).Count() != 1)
        {
            return ReadDecision.MaySaveMore;
        }

        var aliases = Aliases(body, variable);
        var uses = aliases
            .SelectMany(alias => References(body, alias))
            .Where(reference => reference.Syntax.SpanStart > read.Syntax.Span.End)
            .OrderBy(static reference => reference.Syntax.SpanStart)
            .ToList();
        var changes = uses.Where(use => !IsValueRead(use) && !IsAliasDeclaration(use, aliases)).ToList();
        if (changes.Count == 0)
        {
            return ReadDecision.Same;
        }

        foreach (var write in writes)
        {
            if (
                write.Syntax.SpanStart <= read.Syntax.Span.End
                || write.Use.Kind is not (CallUseKind.Statement or CallUseKind.Discard or CallUseKind.Assignment)
                || write.Use.Statement is not { } writeStatement
                || !sameElement(read, write)
                || Model(write) is not { } model
                || !aliases.Contains(Unwrapped(model) is ILocalReferenceOperation local ? local.Local : null)
            )
            {
                continue;
            }

            var rest = changes
                .Where(change => change.Syntax.Parent is not null && !write.Syntax.Span.Contains(change.Syntax.Span))
                .ToList();
            if (WritesBack(read, write, writeStatement, rest, writes, sameElement))
            {
                return new ReadDecision(ReadDifference.None, write);
            }
        }

        var written = everyWrite.Any(write =>
            write.Syntax.SpanStart > read.Syntax.Span.End && sameElement(read, write)
        );
        return !written && changes.Any(IsAssignment)
            ? new ReadDecision(ReadDifference.SavesUnwrittenChanges, null)
            : ReadDecision.MaySaveMore;
    }

    /// <summary>
    /// Every change is in the block of the write or nested in it and before the write, no jump between the first
    /// change and the write, the write not in a <c>try</c> whose catch goes on without it, no other read of the
    /// element in between, and nothing changes or keeps the model after it.
    /// </summary>
    private static bool WritesBack(
        StorageClientCall read,
        StorageClientCall write,
        StatementSyntax writeStatement,
        IReadOnlyList<IOperation> changes,
        IReadOnlyList<StorageClientCall> writes,
        Func<StorageClientCall, StorageClientCall, bool> sameElement
    )
    {
        if (writeStatement.Parent is not BlockSyntax block)
        {
            return false;
        }

        if (
            changes.Any(change =>
                change.Syntax.SpanStart > writeStatement.Span.End || !block.Span.Contains(change.Syntax.Span)
            )
        )
        {
            return false;
        }

        if (changes.Any(static change => IsCaptured(change) || IsStored(change)))
        {
            return false;
        }

        var first =
            changes.Count > 0 ? changes.Min(static change => change.Syntax.SpanStart) : writeStatement.SpanStart;
        var between = new Microsoft.CodeAnalysis.Text.TextSpan(first, writeStatement.SpanStart - first);
        var method = read.Syntax.FirstAncestorOrSelf<MemberDeclarationSyntax>();
        var jumps = method
            ?.DescendantNodes()
            .Where(static node =>
                node
                    is ReturnStatementSyntax
                        or BreakStatementSyntax
                        or ContinueStatementSyntax
                        or GotoStatementSyntax
                        or YieldStatementSyntax
            )
            .Any(jump => between.Contains(jump.Span) && !InLambda(jump));
        if (jumps is true || InSwallowingTry(writeStatement))
        {
            return false;
        }

        // Another read of the element between the two would see the model half changed.
        var otherRead = Root(read.Invocation)
            .DescendantsAndSelf()
            .OfType<IInvocationOperation>()
            .Select(StorageClientCall.From)
            .OfType<StorageClientCall>()
            .Any(other =>
                other.Syntax != read.Syntax
                && other.Syntax != write.Syntax
                && other.Syntax.SpanStart > read.Syntax.Span.End
                && other.Syntax.SpanStart < write.Syntax.SpanStart
                && other.Name == "GetFormData"
                && sameElement(read, other)
            );
        return !otherRead
            && !writes.Any(other =>
                other != write
                && other.Syntax.SpanStart > read.Syntax.Span.End
                && other.Syntax.SpanStart < write.Syntax.SpanStart
                && sameElement(read, other)
            );
    }

    /// <summary>
    /// Whether a catch that does not rethrow skips the write when something before it throws: v8 then saved nothing,
    /// while a live read keeps the changes made up to the throw.
    /// </summary>
    private static bool InSwallowingTry(StatementSyntax write) =>
        write
            .Ancestors()
            .TakeWhile(static ancestor =>
                ancestor
                    is not (
                        MemberDeclarationSyntax
                        or AnonymousFunctionExpressionSyntax
                        or LocalFunctionStatementSyntax
                    )
            )
            .OfType<TryStatementSyntax>()
            .Any(statement =>
                statement.Block.Span.Contains(write.Span)
                && statement.Catches.Any(static clause =>
                    !clause
                        .Block.DescendantNodes(static node =>
                            node is not (AnonymousFunctionExpressionSyntax or LocalFunctionStatementSyntax)
                        )
                        .Any(static node => node is ThrowStatementSyntax or ThrowExpressionSyntax)
                )
            );

    /// <summary>The local the read's result goes to, directly or through a cast or <c>as</c>.</summary>
    private static ILocalSymbol? Variable(StorageClientCall read) => Variable(read.Invocation);

    /// <summary>The local a call's result goes to, directly or through a cast or <c>as</c>.</summary>
    public static ILocalSymbol? Variable(IInvocationOperation call)
    {
        var consumer = Consumer(call);
        return consumer.Parent switch
        {
            IVariableInitializerOperation { Parent: IVariableDeclaratorOperation declarator } => declarator.Symbol,
            ISimpleAssignmentOperation { Target: ILocalReferenceOperation local } assignment
                when assignment.Value == consumer => local.Local,
            _ => null,
        };
    }

    /// <summary>The operation that holds the read's value: the call with its await and the casts around it.</summary>
    private static IOperation Consumer(IOperation operation)
    {
        var current = operation;
        while (current.Parent is IAwaitOperation or IConversionOperation or IParenthesizedOperation)
        {
            current = current.Parent;
        }

        return current;
    }

    public static IEnumerable<IOperation> Writes(IOperation body, ILocalSymbol local) =>
        body.DescendantsAndSelf()
            .Where(operation =>
                operation is IVariableDeclaratorOperation declarator
                    && SymbolEqualityComparer.Default.Equals(declarator.Symbol, local)
                || operation is ISimpleAssignmentOperation { Target: ILocalReferenceOperation target }
                    && SymbolEqualityComparer.Default.Equals(target.Local, local)
                || operation
                    is IArgumentOperation
                    {
                        Parameter.RefKind: RefKind.Out or RefKind.Ref,
                        Value: ILocalReferenceOperation passed
                    }
                    && SymbolEqualityComparer.Default.Equals(passed.Local, local)
            );

    /// <summary>
    /// The local and its aliases: pattern variables of <c>x is T y</c> and <c>x is not T y</c>, and locals initialized
    /// with <c>x</c>, <c>(T)x</c> or <c>x as T</c>.
    /// </summary>
    private static HashSet<ILocalSymbol?> Aliases(IOperation body, ILocalSymbol local)
    {
        var aliases = new HashSet<ILocalSymbol?>(SymbolEqualityComparer.Default) { local };
        var added = true;
        while (added)
        {
            added = false;
            foreach (var operation in body.DescendantsAndSelf())
            {
                ILocalSymbol? alias = operation switch
                {
                    IIsPatternOperation pattern when IsAlias(pattern.Value, aliases) => Declared(pattern.Pattern),
                    IVariableDeclaratorOperation { Initializer.Value: var value } declarator
                        when IsAlias(value, aliases) => declarator.Symbol,
                    _ => null,
                };
                if (alias is not null && aliases.Add(alias))
                {
                    added = true;
                }
            }
        }

        return aliases;
    }

    private static ILocalSymbol? Declared(IPatternOperation pattern) =>
        pattern switch
        {
            IDeclarationPatternOperation declaration => declaration.DeclaredSymbol as ILocalSymbol,
            IRecursivePatternOperation recursive => recursive.DeclaredSymbol as ILocalSymbol,
            INegatedPatternOperation negated => Declared(negated.Pattern),
            _ => null,
        };

    private static bool IsAlias(IOperation value, HashSet<ILocalSymbol?> aliases) =>
        Unwrapped(value) is ILocalReferenceOperation reference && aliases.Contains(reference.Local);

    private static bool IsAliasDeclaration(IOperation use, HashSet<ILocalSymbol?> aliases)
    {
        var holder = use;
        while (holder.Parent is IConversionOperation or IParenthesizedOperation)
        {
            holder = holder.Parent;
        }

        return holder.Parent switch
        {
            IIsPatternOperation pattern => Declared(pattern.Pattern) is { } declared && aliases.Contains(declared)
                || pattern.Pattern is ITypePatternOperation or IConstantPatternOperation or INegatedPatternOperation,
            IVariableInitializerOperation { Parent: IVariableDeclaratorOperation declarator } => aliases.Contains(
                declarator.Symbol
            ),
            IBinaryOperation { OperatorKind: BinaryOperatorKind.Equals or BinaryOperatorKind.NotEquals } comparison =>
                IsNull(comparison.LeftOperand == holder ? comparison.RightOperand : comparison.LeftOperand),
            _ => false,
        };
    }

    private static bool IsNull(IOperation operation) =>
        Unwrapped(operation) is ILiteralOperation { ConstantValue: { HasValue: true, Value: null } };

    public static IEnumerable<IOperation> References(IOperation body, ILocalSymbol? local) =>
        body.DescendantsAndSelf()
            .OfType<ILocalReferenceOperation>()
            .Where(reference =>
                SymbolEqualityComparer.Default.Equals(reference.Local, local) && !reference.IsDeclaration
            );

    /// <summary>
    /// A use that only reads a value out of the model: a chain of member accesses from it that ends in a value type
    /// or a string, and is not assigned to, incremented or passed by reference.
    /// </summary>
    private static bool IsValueRead(IOperation use)
    {
        var top = Top(use);
        if (top == use)
        {
            return false;
        }

        if (top.Type is not { } type || !(type.IsValueType || type.SpecialType == SpecialType.System_String))
        {
            return false;
        }

        return top.Parent switch
        {
            IAssignmentOperation assignment => assignment.Target != top,
            IIncrementOrDecrementOperation => false,
            IArgumentOperation { Parameter.RefKind: RefKind.Ref or RefKind.Out } => false,
            _ => true,
        };
    }

    /// <summary>A use that assigns to a member of the model, or increments one.</summary>
    public static bool IsAssignment(IOperation use)
    {
        var top = Top(use);
        return top != use
            && (
                top.Parent is IAssignmentOperation assignment && assignment.Target == top
                || top.Parent is IIncrementOrDecrementOperation
            );
    }

    /// <summary>The end of the chain of member accesses that starts at a use of the model.</summary>
    private static IOperation Top(IOperation use)
    {
        var top = use;
        while (true)
        {
            var parent = top.Parent;
            if (
                parent is IPropertyReferenceOperation property && property.Instance == top
                || parent is IFieldReferenceOperation field && field.Instance == top
                || parent is IArrayElementReferenceOperation array && array.ArrayReference == top
            )
            {
                top = parent;
                continue;
            }

            if (parent is IConditionalAccessOperation conditional && conditional.Operation == top)
            {
                top = Last(conditional.WhenNotNull) ?? parent;
                if (top == parent)
                {
                    break;
                }

                continue;
            }

            if (parent is IConditionalAccessOperation outer && outer.WhenNotNull == top)
            {
                top = parent;
                continue;
            }

            break;
        }

        return top;
    }

    /// <summary>The end of a conditional access chain, <c>.B.C</c> in <c>a?.B.C</c>.</summary>
    private static IOperation? Last(IOperation whenNotNull)
    {
        var current = whenNotNull;
        while (current is IConditionalAccessOperation nested)
        {
            current = nested.WhenNotNull;
        }

        return current;
    }

    public static IOperation? Model(StorageClientCall write) => write.Argument("dataToSerialize", "data")?.Value;

    public static IOperation Unwrapped(IOperation operation)
    {
        while (operation is IConversionOperation or IParenthesizedOperation)
        {
            operation = operation is IConversionOperation conversion
                ? conversion.Operand
                : ((IParenthesizedOperation)operation).Operand;
        }

        return operation;
    }

    private static bool IsCaptured(IOperation operation) =>
        Ancestors(operation).Any(static ancestor => ancestor is IAnonymousFunctionOperation or ILocalFunctionOperation);

    private static bool IsStored(IOperation operation) =>
        operation.Parent is ISimpleAssignmentOperation assignment
        && assignment.Value == operation
        && assignment.Target is not ILocalReferenceOperation;

    private static bool InLambda(SyntaxNode node) =>
        node.Ancestors()
            .Any(static ancestor => ancestor is AnonymousFunctionExpressionSyntax or LocalFunctionStatementSyntax);

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
}
