using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>
/// A hook method moved to its v9 signature. <see cref="CompatLocals"/> maps each v8 parameter the body still uses to
/// the local that now holds it.
/// </summary>
/// <param name="PrecedingMember">
/// The member to insert before the method: the filter of a family that has one, or the <c>Define</c> member that runs
/// a custom process task's stage.
/// </param>
internal sealed record PortedMethod(
    MethodDeclarationSyntax Rewritten,
    MethodDeclarationSyntax? PrecedingMember,
    string ContextName,
    IReadOnlyDictionary<HookParameterRole, string> CompatLocals
);

/// <summary>
/// Moves a v8 hook method to its v9 signature: the context replaces the parameters, the body reads what it used from
/// the context into locals named as the parameters were, and every way out of the method returns success, a
/// <c>HandlerResult</c> or a stage's <c>StageResult</c>. Nothing else in the body changes.
/// </summary>
internal static class HookMethodPort
{
    /// <summary>What the port's warning says about v9 retrying a hook.</summary>
    public const string RunsAgain =
        "v9 runs it inside the process transition and runs it again when a step fails, so calls it makes to other "
        + "systems, such as e-mail, case numbers or external APIs, can repeat.";

    private const string FilterName = "ShouldRunForTask";
    private const string TaskIdParameter = "taskId";
    private const string StageResult = "Altinn.App.Core.Features.Process.StageResult";
    private const string PipelineBuilder = "Altinn.App.Core.Features.Process.PipelineBuilder";
    private const string ProcessTaskPipeline = "Altinn.App.Core.Features.Process.ProcessTaskPipeline";

    /// <summary>
    /// Why the hook cannot be moved by the upgrade, in the words of the to-do; <c>null</c> when it can.
    /// <paramref name="calls"/> holds where the app calls each of its methods.
    /// </summary>
    public static string? BlockingReason(HookImplementation hook, IReadOnlyDictionary<IMethodSymbol, string> calls)
    {
        if (hook.Declaration is not { } method)
        {
            return "it is declared in a package";
        }

        if (
            method.Modifiers.Any(SyntaxKind.PartialKeyword)
            || hook.TypeDeclaration.Modifiers.Any(SyntaxKind.PartialKeyword)
        )
        {
            return "the class is partial";
        }

        if (
            hook.Method.IsVirtual
            || hook.Method.IsAbstract
            || hook.Method.IsOverride
            || method.Modifiers.Any(SyntaxKind.NewKeyword)
        )
        {
            return "it overrides or is overridden";
        }

        if (MemberClash(hook) is { } clash)
        {
            return $"it already has a member named {clash}";
        }

        for (var i = 0; i < hook.Family.V8Parameters.Count; i++)
        {
            var parameter = hook.Method.Parameters[i];
            switch (hook.Family.V8Parameters[i])
            {
                case HookParameterRole.Prefill when IsReferenced(method, parameter, hook.Model):
                    return "it reads prefill, which v9 does not pass to task start; use IInstantiationProcessor.DataCreation, which gets it";
                case HookParameterRole.Events when IsReferenced(method, parameter, hook.Model):
                    return "it reads events, which v9 does not pass; read context.InstanceDataMutator.Instance.Process";
            }
        }

        if (!IsTaskType(method.ReturnType))
        {
            return "its return type is not written as Task";
        }

        return calls.TryGetValue(hook.Method, out var call) ? $"the app calls it at {call}" : null;
    }

    /// <summary>
    /// The method in its v9 shape, and for a family with a task filter the <c>ShouldRunForTask</c> that goes before it,
    /// or for a custom process task the <c>Define</c> member: <paramref name="explicitFilter"/> makes the filter an
    /// explicit implementation, for a class that implements more than one task hook, and
    /// <paramref name="asPublicMethod"/> turns an explicit implementation into a public method, for a class another
    /// handler runs instead of v9, and for a stage, which implements no interface member.
    /// </summary>
    public static PortedMethod Rewrite(
        HookImplementation hook,
        TaskIds tasks,
        bool explicitFilter,
        bool asPublicMethod,
        string lineEnding
    )
    {
        var original = hook.Declaration ?? throw new InvalidOperationException("A package's hook cannot be rewritten.");
        var family = hook.Family;
        var contextName = ContextName(original);
        var locals = new List<StatementSyntax>();
        var compatLocals = new Dictionary<HookParameterRole, string>();
        for (var i = 0; i < family.V8Parameters.Count; i++)
        {
            var role = family.V8Parameters[i];
            var parameter = original.ParameterList.Parameters[i];
            if (
                role is not (HookParameterRole.TaskId or HookParameterRole.Instance)
                || !IsReferenced(original, hook.Method.Parameters[i], hook.Model)
            )
            {
                continue;
            }

            var path = role == HookParameterRole.TaskId ? family.TaskIdInContext : "InstanceDataMutator.Instance";
            locals.Add(
                SyntaxFactory.ParseStatement($"{parameter.Type} {parameter.Identifier.Text} = {contextName}.{path};")
            );
            compatLocals[role] = parameter.Identifier.Text;
        }

        var method = WithResults(original, family, hook.Model, lineEnding);
        var contextParameter = SyntaxFactory
            .Parameter(SyntaxFactory.Identifier(contextName))
            .WithType(GeneratedTypeReferenceFinalizer.Reference(family.Context).WithTrailingTrivia(SyntaxFactory.Space))
            .WithLeadingTrivia(original.ParameterList.Parameters[0].GetLeadingTrivia());
        method = method
            .WithIdentifier(SyntaxFactory.Identifier(family.V9Member).WithTriviaFrom(original.Identifier))
            .WithParameterList(
                method.ParameterList.WithParameters(SyntaxFactory.SingletonSeparatedList(contextParameter))
            );
        method = method.WithReturnType(WithResultArgument(method.ReturnType, family));
        method = WithInterface(method, family, asPublicMethod);
        if (locals.Count > 0)
        {
            method = SyntaxEditing.WithStatementsFirst(method, locals, lineEnding);
        }

        MethodDeclarationSyntax? preceding = null;
        if (family.FiltersTasks)
        {
            preceding = Filter(family, tasks, explicitFilter && !asPublicMethod);
        }
        else if (!family.ReturnsHandlerResult)
        {
            preceding = Pipeline(family);
        }

        if (preceding is not null)
        {
            var (blankLines, remainder) = SplitBlankLines(original.GetLeadingTrivia());
            preceding = preceding
                .WithLeadingTrivia(blankLines.Add(SyntaxFactory.Whitespace(SyntaxEditing.Indentation(original))))
                .WithTrailingTrivia(SyntaxFactory.EndOfLine(lineEnding));
            method = method.WithLeadingTrivia(remainder.Insert(0, SyntaxFactory.EndOfLine(lineEnding)));
        }

        return new PortedMethod(method, preceding, contextName, compatLocals);
    }

    /// <summary>
    /// The method with nothing left in it to port: a body that only returns <c>Task.CompletedTask</c>, or an async one
    /// that awaits nothing else.
    /// </summary>
    public static bool DoesNothing(MethodDeclarationSyntax method, SemanticModel model)
    {
        var isAsync = method.Modifiers.Any(SyntaxKind.AsyncKeyword);
        if (method.ExpressionBody is { } arrow)
        {
            return !isAsync && IsCompletedTask(arrow.Expression, model);
        }

        var statements = method.Body?.Statements ?? default;
        return isAsync
            ? statements.All(statement =>
                statement is ExpressionStatementSyntax { Expression: AwaitExpressionSyntax awaited }
                && IsCompletedTask(awaited.Expression, model)
            )
            : statements is [ReturnStatementSyntax { Expression: { } returned }] && IsCompletedTask(returned, model);
    }

    /// <summary>The lines where the method throws, outside lambdas and local functions.</summary>
    public static IEnumerable<SyntaxNode> Throws(MethodDeclarationSyntax method) =>
        OwnNodes(method).Where(static node => node is ThrowStatementSyntax or ThrowExpressionSyntax);

    private static MethodDeclarationSyntax Filter(HookFamily family, TaskIds tasks, bool isExplicit)
    {
        if (
            SyntaxFactory.ParseMemberDeclaration($"public bool {FilterName}(string {TaskIdParameter}) => true;")
            is not MethodDeclarationSyntax { ExpressionBody: { } arrow } filter
        )
        {
            throw new InvalidOperationException("The task filter does not parse.");
        }

        filter = filter.WithExpressionBody(arrow.WithExpression(TaskFilter.Condition(tasks, TaskIdParameter)));
        return isExplicit
            ? filter
                .WithModifiers(default)
                .WithExplicitInterfaceSpecifier(
                    SyntaxFactory.ExplicitInterfaceSpecifier(
                        GeneratedTypeReferenceFinalizer.Reference(family.V9Interface)
                    )
                )
            : filter;
    }

    /// <summary>
    /// The member that runs the stage, such as
    /// <c>public ProcessTaskPipeline DefineStart(PipelineBuilder pipeline) => pipeline.Stage(Start).Build();</c>
    /// </summary>
    private static MethodDeclarationSyntax Pipeline(HookFamily family)
    {
        if (
            SyntaxFactory.ParseMemberDeclaration(
                $"public ProcessTaskPipeline Define{family.V9Member}(PipelineBuilder pipeline) => "
                    + $"pipeline.Stage({family.V9Member}).Build();"
            )
            is not MethodDeclarationSyntax { ParameterList.Parameters: [{ Type: { } builder }] } pipeline
        )
        {
            throw new InvalidOperationException("The pipeline does not parse.");
        }

        pipeline = pipeline.ReplaceNode(
            builder,
            GeneratedTypeReferenceFinalizer.Reference(PipelineBuilder).WithTriviaFrom(builder)
        );
        return pipeline.WithReturnType(
            GeneratedTypeReferenceFinalizer.Reference(ProcessTaskPipeline).WithTriviaFrom(pipeline.ReturnType)
        );
    }

    /// <summary>
    /// The method's explicit interface specifier moved to the v9 interface, or, for a class that will not implement it,
    /// removed in favor of <c>public</c>.
    /// </summary>
    private static MethodDeclarationSyntax WithInterface(
        MethodDeclarationSyntax method,
        HookFamily family,
        bool asPublicMethod
    )
    {
        if (method.ExplicitInterfaceSpecifier is not { } specifier)
        {
            return method;
        }

        if (!asPublicMethod)
        {
            return method.WithExplicitInterfaceSpecifier(
                specifier.WithName(
                    GeneratedTypeReferenceFinalizer.Reference(family.V9Interface).WithTriviaFrom(specifier.Name)
                )
            );
        }

        var leading = method.GetLeadingTrivia();
        method = method.WithoutLeadingTrivia();
        return method
            .WithExplicitInterfaceSpecifier(null)
            .WithModifiers(
                method.Modifiers.Insert(
                    0,
                    SyntaxFactory.Token(SyntaxKind.PublicKeyword).WithTrailingTrivia(SyntaxFactory.Space)
                )
            )
            .WithLeadingTrivia(leading);
    }

    /// <summary>
    /// The body with every way out returning the family's success: <c>return;</c> in an async method, and the end of it
    /// when that can be reached. A method that is not async returns <c>Task.FromResult</c> when it only ever returned
    /// <c>Task.CompletedTask</c>, and otherwise becomes async and awaits what it returned.
    /// </summary>
    private static MethodDeclarationSyntax WithResults(
        MethodDeclarationSyntax method,
        HookFamily family,
        SemanticModel model,
        string lineEnding
    )
    {
        var isAsync = method.Modifiers.Any(SyntaxKind.AsyncKeyword);
        if (method.ExpressionBody is { } arrow)
        {
            if (arrow.Expression is ThrowExpressionSyntax)
            {
                return method;
            }

            if (!isAsync && IsCompletedTask(arrow.Expression, model))
            {
                return method.WithExpressionBody(
                    arrow.WithExpression(FromResult(arrow.Expression, family).WithTriviaFrom(arrow.Expression))
                );
            }

            var expression = isAsync ? arrow.Expression : Awaited(arrow.Expression);
            var block = SyntaxEditing.WithBlockBody(
                method,
                [SyntaxFactory.ExpressionStatement(expression.WithoutTrivia()), ReturnSuccess(family)],
                lineEnding
            );
            return isAsync ? block : WithAsync(block);
        }

        if (method.Body is not { } body)
        {
            return method;
        }

        var returns = OwnNodes(method).OfType<ReturnStatementSyntax>().ToList();
        var endReachable =
            body.Statements.Count == 0
            || model.AnalyzeControlFlow(body.Statements[0], body.Statements[^1])
                is { Succeeded: true, EndPointIsReachable: true };

        if (
            !isAsync
            && returns.All(statement => statement.Expression is { } returned && IsCompletedTask(returned, model))
        )
        {
            return method.ReplaceNodes(
                returns.Select(static statement => statement.Expression).OfType<ExpressionSyntax>(),
                (original, _) => FromResult(original, family).WithTriviaFrom(original)
            );
        }

        method = method.TrackNodes(returns);
        foreach (var original in returns)
        {
            var statement =
                method.GetCurrentNode(original) ?? throw new InvalidOperationException("Lost track of a return.");
            var returned = original.Expression;
            if (returned is null || IsCompletedTask(returned, model))
            {
                method = method.ReplaceNode(statement, ReturnSuccess(family).WithTriviaFrom(statement));
                continue;
            }

            var awaited = SyntaxFactory
                .ExpressionStatement(Awaited(returned))
                .WithLeadingTrivia(statement.GetLeadingTrivia());
            if (statement.Parent is BlockSyntax or SwitchSectionSyntax)
            {
                var indentation = statement
                    .GetLeadingTrivia()
                    .LastOrDefault(static t => t.IsKind(SyntaxKind.WhitespaceTrivia));
                method = method.ReplaceNode(
                    statement,
                    [
                        awaited.WithTrailingTrivia(SyntaxFactory.EndOfLine(lineEnding)),
                        ReturnSuccess(family)
                            .WithLeadingTrivia(SyntaxEditing.Indented(indentation))
                            .WithTrailingTrivia(statement.GetTrailingTrivia()),
                    ]
                );
            }
            else
            {
                method = method.ReplaceNode(
                    statement,
                    SyntaxFactory
                        .Block(
                            awaited.WithLeadingTrivia(SyntaxFactory.Space).WithTrailingTrivia(SyntaxFactory.Space),
                            ReturnSuccess(family).WithTrailingTrivia(SyntaxFactory.Space)
                        )
                        .WithTriviaFrom(statement)
                );
            }
        }

        if (isAsync && endReachable && method.Body is { } rewrittenBody)
        {
            var indentation =
                rewrittenBody.Statements.Count > 0
                    ? rewrittenBody
                        .Statements[^1]
                        .GetLeadingTrivia()
                        .LastOrDefault(static t => t.IsKind(SyntaxKind.WhitespaceTrivia))
                    : SyntaxFactory.Whitespace(SyntaxEditing.BodyIndentation(method));
            method = method.WithBody(
                rewrittenBody.AddStatements(
                    ReturnSuccess(family)
                        .WithLeadingTrivia(SyntaxEditing.Indented(indentation))
                        .WithTrailingTrivia(SyntaxFactory.EndOfLine(lineEnding))
                )
            );
        }

        return isAsync ? method : WithAsync(method);
    }

    private static MethodDeclarationSyntax WithAsync(MethodDeclarationSyntax method)
    {
        var asyncKeyword = SyntaxFactory.Token(SyntaxKind.AsyncKeyword).WithTrailingTrivia(SyntaxFactory.Space);
        if (method.Modifiers.Count > 0)
        {
            return method.WithModifiers(method.Modifiers.Add(asyncKeyword));
        }

        // Without modifiers the return type starts the declaration's line, and its leading trivia moves to async.
        return method
            .WithReturnType(method.ReturnType.WithLeadingTrivia())
            .WithModifiers(
                SyntaxFactory.TokenList(asyncKeyword.WithLeadingTrivia(method.ReturnType.GetLeadingTrivia()))
            );
    }

    /// <summary>
    /// <c>Task</c> as <c>Task&lt;HandlerResult&gt;</c>, or a stage's <c>Task&lt;StageResult&gt;</c>, keeping how the
    /// app spelled <c>Task</c>.
    /// </summary>
    private static TypeSyntax WithResultArgument(TypeSyntax returnType, HookFamily family)
    {
        var argument = SyntaxFactory.TypeArgumentList(
            SyntaxFactory.SingletonSeparatedList<TypeSyntax>(GeneratedTypeReferenceFinalizer.Reference(Result(family)))
        );
        return returnType switch
        {
            IdentifierNameSyntax task => SyntaxFactory
                .GenericName(task.Identifier.WithoutTrivia(), argument)
                .WithTriviaFrom(task),
            QualifiedNameSyntax { Right: IdentifierNameSyntax task } qualified => qualified.WithRight(
                SyntaxFactory.GenericName(task.Identifier.WithoutTrivia(), argument).WithTriviaFrom(task)
            ),
            _ => throw new InvalidOperationException($"Not a Task return type: {returnType}"),
        };
    }

    private static bool IsTaskType(TypeSyntax type) =>
        type
            is IdentifierNameSyntax { Identifier.ValueText: "Task" }
                or QualifiedNameSyntax { Right: IdentifierNameSyntax { Identifier.ValueText: "Task" } };

    private static string Result(HookFamily family) =>
        family.ReturnsHandlerResult ? HookFamily.HandlerResult : StageResult;

    private static StatementSyntax ReturnSuccess(HookFamily family) =>
        SyntaxFactory.ReturnStatement(
            SyntaxFactory.Token(SyntaxKind.ReturnKeyword).WithTrailingTrivia(SyntaxFactory.Space),
            Success(family),
            SyntaxFactory.Token(SyntaxKind.SemicolonToken)
        );

    /// <summary><c>HandlerResult.Success()</c>, or a stage's <c>StageResult.Completed()</c>.</summary>
    private static ExpressionSyntax Success(HookFamily family) =>
        SyntaxFactory.InvocationExpression(
            SyntaxFactory.MemberAccessExpression(
                SyntaxKind.SimpleMemberAccessExpression,
                GeneratedTypeReferenceFinalizer.Reference(Result(family)),
                SyntaxFactory.IdentifierName(family.ReturnsHandlerResult ? "Success" : "Completed")
            )
        );

    /// <summary>
    /// <c>X.CompletedTask</c> as <c>X.FromResult&lt;HandlerResult&gt;(HandlerResult.Success())</c>, or with a stage's
    /// success.
    /// </summary>
    private static ExpressionSyntax FromResult(ExpressionSyntax completedTask, HookFamily family)
    {
        var task = ((MemberAccessExpressionSyntax)completedTask).Expression.WithoutTrivia();
        return SyntaxFactory.InvocationExpression(
            SyntaxFactory.MemberAccessExpression(
                SyntaxKind.SimpleMemberAccessExpression,
                task,
                SyntaxFactory.GenericName(
                    SyntaxFactory.Identifier("FromResult"),
                    SyntaxFactory.TypeArgumentList(
                        SyntaxFactory.SingletonSeparatedList<TypeSyntax>(
                            GeneratedTypeReferenceFinalizer.Reference(Result(family))
                        )
                    )
                )
            ),
            SyntaxFactory.ArgumentList(SyntaxFactory.SingletonSeparatedList(SyntaxFactory.Argument(Success(family))))
        );
    }

    /// <summary>
    /// <c>await</c> of the task, in parentheses unless it is a primary expression: <c>await</c> binds tighter than a
    /// conditional, <c>??</c> or any binary operator.
    /// </summary>
    private static AwaitExpressionSyntax Awaited(ExpressionSyntax task)
    {
        var operand = task.WithoutTrivia();
        if (
            operand
            is not (
                InvocationExpressionSyntax
                or MemberAccessExpressionSyntax
                or ConditionalAccessExpressionSyntax
                or ElementAccessExpressionSyntax
                or SimpleNameSyntax
                or ParenthesizedExpressionSyntax
            )
        )
        {
            operand = SyntaxFactory.ParenthesizedExpression(operand);
        }

        return SyntaxFactory.AwaitExpression(operand.WithLeadingTrivia(SyntaxFactory.Space));
    }

    private static bool IsCompletedTask(ExpressionSyntax expression, SemanticModel model) =>
        expression is MemberAccessExpressionSyntax access
        && model.GetSymbolInfo(access).Symbol is IPropertySymbol { Name: "CompletedTask" } property
        && property.ContainingType.ToDisplayString() == "System.Threading.Tasks.Task";

    /// <summary>The method's nodes outside lambdas and local functions, whose returns and throws are their own.</summary>
    private static IEnumerable<SyntaxNode> OwnNodes(MethodDeclarationSyntax method) =>
        ((SyntaxNode?)method.Body ?? method.ExpressionBody)?.DescendantNodes(static node =>
            node is not (AnonymousFunctionExpressionSyntax or LocalFunctionStatementSyntax)
        ) ?? [];

    private static bool IsReferenced(MethodDeclarationSyntax method, IParameterSymbol parameter, SemanticModel model) =>
        ((SyntaxNode?)method.Body ?? method.ExpressionBody) is { } body
        && body.DescendantNodes()
            .OfType<IdentifierNameSyntax>()
            .Any(name =>
                name.Identifier.ValueText == parameter.Name
                && SymbolEqualityComparer.Default.Equals(model.GetSymbolInfo(name).Symbol, parameter)
            );

    /// <summary>
    /// <c>context</c>, or another name for the context parameter when the method already uses that one, so that no
    /// name in the body changes meaning.
    /// </summary>
    private static string ContextName(MethodDeclarationSyntax method)
    {
        var used = method
            .DescendantTokens()
            .Where(static token => token.IsKind(SyntaxKind.IdentifierToken))
            .Select(static token => token.ValueText)
            .ToHashSet(StringComparer.Ordinal);
        var name = "context";
        var suffix = 1;
        while (used.Contains(name))
        {
            name = suffix == 1 ? "hookContext" : $"hookContext{suffix}";
            suffix++;
        }

        return name;
    }

    /// <summary>
    /// A name the type already has, or inherits, that the v9 member or its filter would take: a method with one
    /// parameter, or any other kind of member.
    /// </summary>
    private static string? MemberClash(HookImplementation hook)
    {
        var names = hook.Family.FiltersTasks ? new[] { hook.Family.V9Member, FilterName } : [hook.Family.V9Member];
        for (
            var type = hook.Type;
            type is not null && type.SpecialType != SpecialType.System_Object;
            type = type.BaseType
        )
        {
            foreach (var name in names)
            {
                if (
                    type.GetMembers(name)
                        .Any(member =>
                            !SymbolEqualityComparer.Default.Equals(member, hook.Method)
                            && member is not IMethodSymbol { Parameters.Length: not 1 }
                        )
                )
                {
                    return name;
                }
            }
        }

        return null;
    }

    /// <summary>The whitespace-only lines a member's leading trivia starts with, and the rest of it.</summary>
    private static (SyntaxTriviaList BlankLines, SyntaxTriviaList Remainder) SplitBlankLines(SyntaxTriviaList trivia)
    {
        var end = 0;
        var index = 0;
        while (index < trivia.Count)
        {
            var next = index;
            while (next < trivia.Count && trivia[next].IsKind(SyntaxKind.WhitespaceTrivia))
            {
                next++;
            }

            if (next == trivia.Count || !trivia[next].IsKind(SyntaxKind.EndOfLineTrivia))
            {
                break;
            }

            index = next + 1;
            end = index;
        }

        return (SyntaxFactory.TriviaList(trivia.Take(end)), SyntaxFactory.TriviaList(trivia.Skip(end)));
    }
}
