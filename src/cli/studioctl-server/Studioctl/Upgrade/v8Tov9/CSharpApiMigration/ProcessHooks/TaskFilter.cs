using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>
/// A set of task ids, or every task. <see cref="Sources"/> holds, for each id, the expression in the hook that named it,
/// so the filter written for v9 uses the app's own constants.
/// </summary>
internal sealed record TaskIds(IReadOnlyList<string>? Ids, IReadOnlyDictionary<string, TaskIdSource> Sources)
{
    public static readonly TaskIds Every = new(null, new Dictionary<string, TaskIdSource>(StringComparer.Ordinal));

    public bool IsEvery => Ids is null;

    /// <summary>Whether a task in both sets exists, or in both and the process, when the process's tasks are known.</summary>
    public bool Overlaps(TaskIds other, IReadOnlySet<string> processTasks) =>
        (Ids, other.Ids) switch
        {
            (null, null) => true,
            (null, { } ids) => ids.Any(id => processTasks.Count == 0 || processTasks.Contains(id)),
            ({ } ids, null) => ids.Any(id => processTasks.Count == 0 || processTasks.Contains(id)),
            ({ } left, { } right) => left.Any(id =>
                right.Contains(id, StringComparer.Ordinal) && (processTasks.Count == 0 || processTasks.Contains(id))
            ),
        };
}

/// <summary>Where a task id came from in the hook: a constant compared with the task id, or a collection of constants.</summary>
/// <param name="Expression">The constant or the collection, as the hook wrote it.</param>
/// <param name="CollectionIds">The ids in the collection, or <c>null</c> for a constant.</param>
internal sealed record TaskIdSource(ExpressionSyntax Expression, IReadOnlyList<string>? CollectionIds);

/// <summary>
/// The tasks a v8 task hook does anything for, over-approximated from its body, and the
/// <c>ShouldRunForTask</c> expression that says so. v8 called every handler at every task and the handler checked the
/// task id itself; v9 asks <c>ShouldRunForTask</c> first, and refuses to start when two handlers say yes for one task.
/// </summary>
/// <remarks>
/// The body is walked in order with the set of tasks for which a statement can be reached. A statement that does
/// something adds that set to the result; comparisons of the task id with constants (<c>==</c>, <c>!=</c>,
/// <c>Equals</c> without ignoring case, <c>Contains</c> on a <c>static readonly</c> collection of constants), their
/// negations, <c>&amp;&amp;</c> and <c>||</c>, early returns and <c>switch</c> labels narrow the set; anything else
/// leaves it as it is. So the result can be larger than the truth but never smaller, and the guards stay in the
/// body. <c>await Task.CompletedTask;</c> does nothing; a <c>throw</c>, a <c>goto</c> and an assignment, also to the task id,
/// do something, and the set only narrows after them, so no later comparison can drop the tasks they ran for.
/// </remarks>
internal sealed class TaskFilter
{
    private readonly SemanticModel _model;
    private readonly IParameterSymbol _taskId;
    private readonly Dictionary<string, TaskIdSource> _sources = new(StringComparer.Ordinal);
    private readonly List<(StatementSyntax Statement, Set Reach)> _reached = [];
    private Set _effects = Set.None;

    private TaskFilter(SemanticModel model, IParameterSymbol taskId)
    {
        _model = model;
        _taskId = taskId;
    }

    /// <summary>The tasks <paramref name="method"/> does anything for, with <paramref name="taskId"/> its task id parameter.</summary>
    public static TaskIds Of(MethodDeclarationSyntax method, IParameterSymbol taskId, SemanticModel model)
    {
        var filter = Walked(method, taskId, model);
        return filter.Ids(filter._effects);
    }

    /// <summary>
    /// The tasks for which a node of <paramref name="method"/> can run, read as <see cref="Of"/> reads the body: those
    /// for which the innermost statement that holds the node is reached.
    /// </summary>
    public static Func<SyntaxNode, TaskIds> Reached(
        MethodDeclarationSyntax method,
        IParameterSymbol taskId,
        SemanticModel model
    )
    {
        var filter = Walked(method, taskId, model);
        return node =>
        {
            var holders = filter._reached.Where(reached => reached.Statement.Span.Contains(node.Span)).ToList();
            if (holders.Count == 0)
            {
                return TaskIds.Every;
            }

            var innermost = holders.Min(static reached => reached.Statement.Span.Length);
            return filter.Ids(
                holders
                    .Where(reached => reached.Statement.Span.Length == innermost)
                    .Aggregate(Set.None, static (reach, reached) => reach.Union(reached.Reach))
            );
        };
    }

    private static TaskFilter Walked(MethodDeclarationSyntax method, IParameterSymbol taskId, SemanticModel model)
    {
        var filter = new TaskFilter(model, taskId);
        if (method.Body is { } body)
        {
            filter.Walk(body, Set.All);
        }
        else if (method.ExpressionBody is { } arrow)
        {
            filter.AddEffects(arrow.Expression, Set.All);
        }

        return filter;
    }

    private TaskIds Ids(Set set) =>
        set.Ids is { } ids
            ? new TaskIds(ids, ids.ToDictionary(static id => id, id => _sources[id], StringComparer.Ordinal))
            : TaskIds.Every;

    /// <summary>
    /// <c>taskId == "Task_1" || taskId == "Task_2"</c> for a set of tasks, with the hook's own constants and
    /// collections; <c>true</c> for every task and <c>false</c> for none.
    /// </summary>
    public static ExpressionSyntax Condition(TaskIds tasks, string parameterName)
    {
        if (tasks.Ids is not { } ids)
        {
            return SyntaxFactory.LiteralExpression(SyntaxKind.TrueLiteralExpression);
        }

        var terms = new List<ExpressionSyntax>();
        var written = new HashSet<TaskIdSource>();
        foreach (var id in ids)
        {
            var source = tasks.Sources[id];
            if (source.CollectionIds is { } collection && collection.All(ids.Contains))
            {
                if (written.Add(source))
                {
                    terms.Add(
                        SyntaxFactory.ParseExpression($"{source.Expression.WithoutTrivia()}.Contains({parameterName})")
                    );
                }
            }
            else
            {
                var constant = source.CollectionIds is null
                    ? source.Expression.WithoutTrivia().ToString()
                    : SymbolDisplay.FormatLiteral(id, quote: true);
                terms.Add(SyntaxFactory.ParseExpression($"{parameterName} == {constant}"));
            }
        }

        return terms.Count == 0
            ? SyntaxFactory.LiteralExpression(SyntaxKind.FalseLiteralExpression)
            : terms.Aggregate(
                (left, right) =>
                    SyntaxFactory.BinaryExpression(
                        SyntaxKind.LogicalOrExpression,
                        left.WithTrailingTrivia(SyntaxFactory.Space),
                        SyntaxFactory.Token(SyntaxKind.BarBarToken).WithTrailingTrivia(SyntaxFactory.Space),
                        right
                    )
            );
    }

    /// <summary>Walks a statement entered for <paramref name="reach"/>; returns the tasks for which it completes normally.</summary>
    private Set Walk(StatementSyntax statement, Set reach)
    {
        _reached.Add((statement, reach));
        if (reach.IsNone)
        {
            return reach;
        }

        switch (statement)
        {
            case BlockSyntax block:
                return block.Statements.Aggregate(reach, (current, inner) => Walk(inner, current));

            case EmptyStatementSyntax
            or LocalFunctionStatementSyntax:
                return reach;

            case LocalDeclarationStatementSyntax declaration:
                if (!declaration.UsingKeyword.IsKind(SyntaxKind.None))
                {
                    AddEffects(reach);
                }

                foreach (var variable in declaration.Declaration.Variables)
                {
                    if (variable.Initializer is { } initializer)
                    {
                        AddEffects(initializer.Value, reach);
                    }
                }

                return reach;

            case ExpressionStatementSyntax expression:
                if (!IsCompletedTask(expression.Expression))
                {
                    AddEffects(expression.Expression, reach);
                }

                return reach;

            case IfStatementSyntax ifStatement:
            {
                AddEffects(ifStatement.Condition, reach);
                var (whenTrue, whenFalse) = Branches(ifStatement.Condition);
                var afterThen = Walk(ifStatement.Statement, reach.Intersect(whenTrue));
                var afterElse = ifStatement.Else is { } elseClause
                    ? Walk(elseClause.Statement, reach.Intersect(whenFalse))
                    : reach.Intersect(whenFalse);
                return afterThen.Union(afterElse);
            }

            case ReturnStatementSyntax returnStatement:
                if (returnStatement.Expression is { } returned && !IsCompletedTask(returned))
                {
                    AddEffects(returned, reach);
                }

                return Set.None;

            case ThrowStatementSyntax:
                AddEffects(reach);
                return Set.None;

            case BreakStatementSyntax
            or ContinueStatementSyntax:
                return Set.None;

            case SwitchStatementSyntax switchStatement:
                AddEffects(switchStatement.Expression, reach);
                var onTaskId = RefersToTaskId(switchStatement.Expression);
                foreach (var section in switchStatement.Sections)
                {
                    var sectionReach = onTaskId ? reach.Intersect(Labels(section)) : reach;
                    foreach (var inner in section.Statements)
                    {
                        sectionReach = Walk(inner, sectionReach);
                    }
                }

                // Over-approximated: a break or a missing label continues after the switch.
                return reach;

            case TryStatementSyntax tryStatement:
            {
                var after = Walk(tryStatement.Block, reach);
                foreach (var catchClause in tryStatement.Catches)
                {
                    after = after.Union(Walk(catchClause.Block, reach));
                }

                if (tryStatement.Finally is { } finallyClause)
                {
                    Walk(finallyClause.Block, reach);
                }

                return after;
            }

            case CommonForEachStatementSyntax forEach:
                AddEffects(forEach.Expression, reach);
                Walk(forEach.Statement, reach);
                return reach;

            case WhileStatementSyntax
            or DoStatementSyntax
            or ForStatementSyntax:
                // A loop's condition and body are things it does, whatever they are.
                AddEffects(reach);
                return reach;

            case UsingStatementSyntax usingStatement:
                AddEffects(reach);
                Walk(usingStatement.Statement, reach);
                return reach;

            case LabeledStatementSyntax labeled:
                return Walk(labeled.Statement, reach);

            default:
                AddEffects(reach);
                return reach;
        }
    }

    /// <summary>The tasks a switch section's labels select; every task for a default or pattern label.</summary>
    private Set Labels(SwitchSectionSyntax section)
    {
        var labels = Set.None;
        foreach (var label in section.Labels)
        {
            labels = labels.Union(
                label is CaseSwitchLabelSyntax caseLabel && Constant(caseLabel.Value) is { } id
                    ? Named(id, caseLabel.Value)
                    : Set.All
            );
        }

        return labels;
    }

    /// <summary>The tasks for which <paramref name="condition"/> can be true, and those for which it can be false.</summary>
    private (Set WhenTrue, Set WhenFalse) Branches(ExpressionSyntax condition)
    {
        switch (condition)
        {
            case ParenthesizedExpressionSyntax parenthesized:
                return Branches(parenthesized.Expression);

            case PrefixUnaryExpressionSyntax { RawKind: (int)SyntaxKind.LogicalNotExpression } not:
            {
                var (whenTrue, whenFalse) = Branches(not.Operand);
                return (whenFalse, whenTrue);
            }

            case BinaryExpressionSyntax { RawKind: (int)SyntaxKind.LogicalAndExpression } and:
            {
                var left = Branches(and.Left);
                var right = Branches(and.Right);
                return (left.WhenTrue.Intersect(right.WhenTrue), left.WhenFalse.Union(right.WhenFalse));
            }

            case BinaryExpressionSyntax { RawKind: (int)SyntaxKind.LogicalOrExpression } or:
            {
                var left = Branches(or.Left);
                var right = Branches(or.Right);
                return (left.WhenTrue.Union(right.WhenTrue), left.WhenFalse.Intersect(right.WhenFalse));
            }

            case BinaryExpressionSyntax { RawKind: (int)SyntaxKind.EqualsExpression } equals
                when Comparison(equals.Left, equals.Right) is { } compared:
                return (compared, Set.All);

            case BinaryExpressionSyntax { RawKind: (int)SyntaxKind.NotEqualsExpression } notEquals
                when Comparison(notEquals.Left, notEquals.Right) is { } compared:
                return (Set.All, compared);

            case InvocationExpressionSyntax invocation when Matches(invocation) is { } matched:
                return (matched, Set.All);

            default:
                return (Set.All, Set.All);
        }
    }

    /// <summary>The task id compared with a constant, either way round.</summary>
    private Set? Comparison(ExpressionSyntax left, ExpressionSyntax right)
    {
        if (RefersToTaskId(left) && Constant(right) is { } rightId)
        {
            return Named(rightId, right);
        }

        return RefersToTaskId(right) && Constant(left) is { } leftId ? Named(leftId, left) : null;
    }

    /// <summary>
    /// <c>taskId.Equals(C)</c>, <c>C.Equals(taskId)</c>, <c>string.Equals(taskId, C)</c>, each with an optional
    /// comparison that does not ignore case, and <c>L.Contains(taskId)</c> on a collection of constants.
    /// </summary>
    private Set? Matches(InvocationExpressionSyntax invocation)
    {
        if (
            invocation.Expression is not MemberAccessExpressionSyntax access
            || _model.GetSymbolInfo(invocation).Symbol is not IMethodSymbol method
        )
        {
            return null;
        }

        var arguments = invocation.ArgumentList.Arguments.Select(static argument => argument.Expression).ToList();
        if (method.Name == "Equals" && method.ContainingType.SpecialType == SpecialType.System_String)
        {
            var operands = method.IsStatic ? arguments : [access.Expression, .. arguments];
            if (operands.Count == 3 && !IsCaseSensitive(operands[2]))
            {
                return null;
            }

            return operands.Count is 2 or 3 ? Comparison(operands[0], operands[1]) : null;
        }

        if (
            method.Name == "Contains"
            && arguments is [var argument]
            && RefersToTaskId(argument)
            && _model.GetSymbolInfo(access.Expression).Symbol is IFieldSymbol { IsStatic: true, IsReadOnly: true } field
            && CollectionIds(field) is { } ids
        )
        {
            var source = new TaskIdSource(access.Expression, ids);
            foreach (var id in ids)
            {
                _sources.TryAdd(id, source);
            }

            return new Set(ids);
        }

        return null;
    }

    /// <summary>A <c>StringComparison</c> argument that compares case: ordinal, invariant or current culture.</summary>
    private bool IsCaseSensitive(ExpressionSyntax comparison) =>
        _model.GetConstantValue(comparison) is { HasValue: true, Value: int value }
        && _model.GetTypeInfo(comparison).Type?.ToDisplayString() == "System.StringComparison"
        && Enum.IsDefined((StringComparison)value)
        && !((StringComparison)value).ToString().EndsWith("IgnoreCase", StringComparison.Ordinal);

    /// <summary>The constants a <c>static readonly</c> field of the app is initialized with, if they are all strings.</summary>
    private IReadOnlyList<string>? CollectionIds(IFieldSymbol field)
    {
        if (
            field.DeclaringSyntaxReferences is not [var reference]
            || reference.GetSyntax() is not VariableDeclaratorSyntax { Initializer.Value: var initializer }
            || !_model.Compilation.SyntaxTrees.Contains(reference.SyntaxTree)
        )
        {
            return null;
        }

        IEnumerable<ExpressionSyntax>? elements = initializer switch
        {
            CollectionExpressionSyntax collection => collection.Elements.All(static e => e is ExpressionElementSyntax)
                ? collection.Elements.OfType<ExpressionElementSyntax>().Select(static e => e.Expression)
                : null,
            ArrayCreationExpressionSyntax { Initializer: { } arrayInitializer } => arrayInitializer.Expressions,
            ImplicitArrayCreationExpressionSyntax implicitArray => implicitArray.Initializer.Expressions,
            // A constructor argument could be a comparer that ignores case.
            BaseObjectCreationExpressionSyntax { ArgumentList.Arguments.Count: 0, Initializer: { } objectInitializer }
                when objectInitializer.IsKind(SyntaxKind.CollectionInitializerExpression) =>
                objectInitializer.Expressions,
            BaseObjectCreationExpressionSyntax { ArgumentList: null, Initializer: { } objectInitializer }
                when objectInitializer.IsKind(SyntaxKind.CollectionInitializerExpression) =>
                objectInitializer.Expressions,
            _ => null,
        };
        if (elements is null)
        {
            return null;
        }

        var model = _model.Compilation.GetSemanticModel(reference.SyntaxTree);
        var ids = new List<string>();
        foreach (var element in elements)
        {
            if (model.GetConstantValue(element) is not { HasValue: true, Value: string id })
            {
                return null;
            }

            if (!ids.Contains(id, StringComparer.Ordinal))
            {
                ids.Add(id);
            }
        }

        return ids;
    }

    private string? Constant(ExpressionSyntax expression) =>
        _model.GetConstantValue(expression) is { HasValue: true, Value: string id } ? id : null;

    /// <summary>
    /// The task <paramref name="expression"/> names, recording where it came from the first time it is seen. A
    /// constant the filter cannot name outside the method, such as a local constant, is written as its value.
    /// </summary>
    private Set Named(string id, ExpressionSyntax expression)
    {
        if (_sources.ContainsKey(id))
        {
            return new Set([id]);
        }

        var usesLocals = expression
            .DescendantNodesAndSelf()
            .OfType<IdentifierNameSyntax>()
            .Any(name => _model.GetSymbolInfo(name).Symbol is ILocalSymbol or IParameterSymbol);
        _sources[id] = new TaskIdSource(
            usesLocals ? SyntaxFactory.ParseExpression(SymbolDisplay.FormatLiteral(id, quote: true)) : expression,
            null
        );
        return new Set([id]);
    }

    private bool RefersToTaskId(ExpressionSyntax expression)
    {
        while (expression is ParenthesizedExpressionSyntax parenthesized)
        {
            expression = parenthesized.Expression;
        }

        return expression is IdentifierNameSyntax
            && SymbolEqualityComparer.Default.Equals(_model.GetSymbolInfo(expression).Symbol, _taskId);
    }

    /// <summary>Adds the tasks for which evaluating <paramref name="expression"/> does something.</summary>
    private void AddEffects(ExpressionSyntax expression, Set reach)
    {
        switch (expression)
        {
            case ParenthesizedExpressionSyntax parenthesized:
                AddEffects(parenthesized.Expression, reach);
                return;

            case PrefixUnaryExpressionSyntax { RawKind: (int)SyntaxKind.LogicalNotExpression } not:
                AddEffects(not.Operand, reach);
                return;

            case BinaryExpressionSyntax { RawKind: (int)SyntaxKind.LogicalAndExpression } and:
                AddEffects(and.Left, reach);
                AddEffects(and.Right, reach.Intersect(Branches(and.Left).WhenTrue));
                return;

            case BinaryExpressionSyntax { RawKind: (int)SyntaxKind.LogicalOrExpression } or:
                AddEffects(or.Left, reach);
                AddEffects(or.Right, reach.Intersect(Branches(or.Left).WhenFalse));
                return;

            case InvocationExpressionSyntax invocation when Matches(invocation) is not null:
                return;

            default:
                if (DoesSomething(expression))
                {
                    AddEffects(reach);
                }

                return;
        }
    }

    private void AddEffects(Set reach) => _effects = _effects.Union(reach);

    /// <summary>Whether evaluating the expression can change anything: a call, an await, an assignment or a new object.</summary>
    private static bool DoesSomething(ExpressionSyntax expression) =>
        expression
            .DescendantNodesAndSelf(static node => node is not AnonymousFunctionExpressionSyntax)
            .Any(static node =>
                node
                    is InvocationExpressionSyntax
                        or AwaitExpressionSyntax
                        or AssignmentExpressionSyntax
                        or BaseObjectCreationExpressionSyntax
                        or ThrowExpressionSyntax
                        or PostfixUnaryExpressionSyntax
                        {
                            RawKind: (int)SyntaxKind.PostIncrementExpression or (int)SyntaxKind.PostDecrementExpression
                        }
                        or PrefixUnaryExpressionSyntax
                        {
                            RawKind: (int)SyntaxKind.PreIncrementExpression or (int)SyntaxKind.PreDecrementExpression
                        }
            );

    /// <summary><c>Task.CompletedTask</c>, awaited or not: it does nothing.</summary>
    private bool IsCompletedTask(ExpressionSyntax expression) =>
        (expression is AwaitExpressionSyntax awaited ? awaited.Expression : expression)
            is MemberAccessExpressionSyntax access
        && _model.GetSymbolInfo(access).Symbol is IPropertySymbol { Name: "CompletedTask" } property
        && property.ContainingType.ToDisplayString() == "System.Threading.Tasks.Task";

    /// <summary>A set of task ids in the order the hook names them, or every task (<c>null</c>).</summary>
    private sealed record Set(IReadOnlyList<string>? Ids)
    {
        public static readonly Set All = new((IReadOnlyList<string>?)null);
        public static readonly Set None = new([]);

        public bool IsNone => Ids is { Count: 0 };

        public Set Union(Set other) =>
            Ids is null || other.Ids is null ? All : new([.. Ids, .. other.Ids.Where(id => !Ids.Contains(id))]);

        public Set Intersect(Set other)
        {
            if (Ids is null)
            {
                return other;
            }

            return other.Ids is null ? this : new([.. Ids.Where(other.Ids.Contains)]);
        }
    }
}
