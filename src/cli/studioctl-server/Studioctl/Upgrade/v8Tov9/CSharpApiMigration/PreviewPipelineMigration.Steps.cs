using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

internal sealed partial class PreviewPipelineMigration
{
    /// <summary>
    /// What a function passed to a service task composition is now: what it returns, the result types renamed in it,
    /// and whether it loses the <c>MailboxClosedReason</c> an <c>onClosed</c> took.
    /// </summary>
    /// <param name="Parameters">How many parameters the function took, or <c>-1</c> for any.</param>
    private sealed record StepRole(
        string Description,
        string Result,
        IReadOnlyDictionary<string, string> Renames,
        bool UnwrapsConclude,
        bool DropsReason,
        int Parameters
    )
    {
        /// <summary>
        /// A plain stage, whose <c>StageResult</c> ended nothing and carried on.
        /// </summary>
        public static readonly StepRole Stage = new(
            "stage",
            "Task<ServiceTaskResult>",
            Map(("StageResult", "ServiceTaskResult")),
            false,
            false,
            1
        );

        /// <summary>
        /// <c>Finally</c>'s work, which already returned <c>ServiceTaskResult</c>.
        /// </summary>
        public static readonly StepRole Final = new("stage", "Task<ServiceTaskResult>", Map(), false, false, 1);

        public static readonly StepRole Send = new(
            "send",
            "Task<ServiceTaskResult>",
            Map(("ServiceTaskOpeningStageResult", "ServiceTaskResult")),
            true,
            false,
            2
        );

        /// <summary>
        /// <c>HandleReplies</c>' <c>onMessage</c>, which carried on with <c>StageResult.Completed()</c>.
        /// </summary>
        public static readonly StepRole CarryOnReply = new(
            "reply handler",
            "Task<ServiceTaskReplyResult>",
            Map(("StageExchangeResult", "ServiceTaskReplyResult"), ("StageResult", "ServiceTaskReplyResult")),
            false,
            false,
            2
        );

        /// <summary>
        /// <c>ConcludeOnReplies</c>' <c>onMessage</c>, which ended the task with a <c>ServiceTaskResult</c>.
        /// </summary>
        public static readonly StepRole ConcludingReply = new(
            "reply handler",
            "Task<ServiceTaskReplyResult>",
            Map(("ServiceTaskExchangeResult", "ServiceTaskReplyResult")),
            false,
            false,
            2
        );

        public static readonly StepRole CarryOnTimeout = new(
            "onTimeout",
            "Task<ServiceTaskResult>",
            Map(("StageResult", "ServiceTaskResult")),
            false,
            true,
            2
        );

        public static readonly StepRole ConcludingTimeout = new(
            "onTimeout",
            "Task<ServiceTaskResult>",
            Map(),
            false,
            true,
            2
        );

        /// <summary>
        /// Whether anything in a function of this role can change.
        /// </summary>
        public bool CanChange => Renames.Count > 0 || UnwrapsConclude || DropsReason;

        /// <summary>
        /// The role of a function whose result one of this role returns: the same result, with its own parameters.
        /// </summary>
        public StepRole Callee => this with { DropsReason = false, Parameters = -1 };

        /// <summary>
        /// What the function must become, for a to-do.
        /// </summary>
        public string Shape => $"returns {Result}" + (DropsReason ? " and takes only the StageContext" : "");

        public bool RewritesLike(StepRole other) =>
            UnwrapsConclude == other.UnwrapsConclude
            && DropsReason == other.DropsReason
            && Renames.Count == other.Renames.Count
            && Renames.All(rename => other.Renames.TryGetValue(rename.Key, out var to) && to == rename.Value);

        private static Dictionary<string, string> Map(params (string From, string To)[] renames) =>
            renames.ToDictionary(static rename => rename.From, static rename => rename.To, StringComparer.Ordinal);
    }

    /// <summary>
    /// A method or local function of the app that a composition can pass as a step.
    /// </summary>
    private sealed class StepFunction(ScannedCSharpFile file, SyntaxNode declaration)
    {
        public ScannedCSharpFile File { get; } = file;

        /// <summary>
        /// A <see cref="MethodDeclarationSyntax"/> or a <see cref="LocalFunctionStatementSyntax"/>.
        /// </summary>
        public SyntaxNode Declaration { get; } = declaration;

        public bool IsLocal => Declaration is LocalFunctionStatementSyntax;

        public string Name =>
            Declaration switch
            {
                MethodDeclarationSyntax method => method.Identifier.ValueText,
                LocalFunctionStatementSyntax local => local.Identifier.ValueText,
                _ => "",
            };

        public ParameterListSyntax Parameters =>
            Declaration switch
            {
                MethodDeclarationSyntax method => method.ParameterList,
                LocalFunctionStatementSyntax local => local.ParameterList,
                _ => SyntaxFactory.ParameterList(),
            };
    }

    /// <summary>
    /// Ties the functions a service task composition passes as steps to what they are now, and rewrites their result
    /// types: a stage's <c>StageResult</c> becomes <c>ServiceTaskResult</c>, a send's
    /// <c>ServiceTaskOpeningStageResult</c> does too, with <c>Conclude(result)</c> as the result itself, a reply
    /// handler's exchange result becomes <c>ServiceTaskReplyResult</c>, and an <c>onClosed</c> that becomes
    /// <c>onTimeout</c> loses its <c>MailboxClosedReason</c>. A method whose result a step returns, as in
    /// <c>return Answer(reply);</c>, gets the step's result type too.
    /// </summary>
    /// <remarks>
    /// A lambda is part of its composition, which is reported when the lambda uses the reason. A method is rewritten
    /// only when nothing else uses it that the upgrade cannot tell apart, such as a lifecycle stage, when it is one
    /// kind of step, and when an <c>onClosed</c> does not use its reason; otherwise it is reported, and so is a step
    /// that is neither a lambda nor a method the upgrade finds.
    /// </remarks>
    private sealed class StepTies(IReadOnlyList<ScannedCSharpFile> files, HelperResolver resolver, TypeNames names)
    {
        /// <summary>
        /// A use of a function as a step, or as what a step returns.
        /// </summary>
        /// <param name="Reference">The name that refers to the function there.</param>
        /// <param name="Owner">The composition, or the function whose result it returns.</param>
        private sealed record Site(StepFunction Target, StepRole Role, SyntaxNode Reference, object Owner);

        private readonly List<Site> _sites = [];
        private readonly List<(ScannedCSharpFile File, SyntaxNode Node, StepRole Role)> _unfollowed = [];
        private readonly Dictionary<StepFunction, MethodRewriter> _localOwners = [];

        /// <summary>
        /// What makes a composition's steps impossible to rewrite in place: an <c>onClosed</c> lambda that uses its
        /// reason.
        /// </summary>
        public static IEnumerable<string> Check(
            PipelineMethod method,
            List<(ArgumentSyntax Argument, StepRole Role)> stepArguments
        )
        {
            foreach (var (argument, role) in stepArguments)
            {
                if (
                    role.DropsReason
                    && Unwrap(argument.Expression) is AnonymousFunctionExpressionSyntax lambda
                    && UsesReason(lambda)
                )
                {
                    yield return $"an onClosed at line {Line(method.File, lambda)} that uses its "
                        + "MailboxClosedReason, which onTimeout is not given";
                }
            }
        }

        /// <summary>
        /// Records the steps of a composition that will be rewritten.
        /// </summary>
        public void Add(
            PipelineMethod composition,
            MethodRewriter rewriter,
            List<(ArgumentSyntax Argument, StepRole Role)> stepArguments
        )
        {
            foreach (var (argument, role) in stepArguments)
            {
                switch (Unwrap(argument.Expression))
                {
                    case AnonymousFunctionExpressionSyntax lambda:
                        if (role.CanChange)
                        {
                            rewriter.Steps[lambda] = new StepRewriter(role, names, composition.Model);
                        }

                        foreach (var call in ReturnedCalls(lambda))
                        {
                            Follow(composition.File, call, role.Callee, composition, rewriter);
                        }

                        break;
                    case (IdentifierNameSyntax or MemberAccessExpressionSyntax) and var group:
                        var targets = resolver.ResolveFunction(
                            group,
                            composition.File,
                            parameters => parameters.Parameters.Count == role.Parameters
                        );
                        if (targets is [var target] && (!target.IsLocal || IsWithin(target, composition.Method)))
                        {
                            _sites.Add(new Site(target, role, ReferenceName(group), composition));
                            if (target.IsLocal)
                            {
                                _localOwners[target] = rewriter;
                            }
                        }
                        else if (role.CanChange)
                        {
                            _unfollowed.Add((composition.File, argument, role));
                        }

                        break;
                    default:
                        if (role.CanChange)
                        {
                            _unfollowed.Add((composition.File, argument, role));
                        }

                        break;
                }
            }
        }

        /// <summary>
        /// Ties the app function that a step returns the result of, when the upgrade finds exactly one.
        /// </summary>
        private void Follow(
            ScannedCSharpFile file,
            InvocationExpressionSyntax call,
            StepRole role,
            object owner,
            MethodRewriter? rewriter
        )
        {
            var arguments = call.ArgumentList.Arguments.Count;
            if (
                resolver.ResolveFunction(call.Expression, file, parameters => Fits(parameters, arguments))
                is not [var target]
            )
            {
                return;
            }

            // A local function inside a rewritten function is rewritten with it.
            if (target.IsLocal && rewriter is null)
            {
                return;
            }

            _sites.Add(new Site(target, role, ReferenceName(call.Expression), owner));
            if (target.IsLocal && rewriter is not null)
            {
                _localOwners[target] = rewriter;
            }
        }

        /// <summary>
        /// Decides which tied functions are rewritten and which are reported, and reports what the compositions pass
        /// that the upgrade cannot follow.
        /// </summary>
        /// <remarks>
        /// A reported function stays visible to the renames and the report of what is left of the previews' API, so
        /// that running the upgrade again, when its composition is no longer the previews', reports nothing new.
        /// </remarks>
        public List<(ScannedCSharpFile File, SyntaxNode Node, SyntaxNode Rewritten)> Decide(
            List<UpgradeMessage> messages
        )
        {
            // Each function a step returns the result of becomes a step's too, under the role of the first site.
            var expanded = new HashSet<StepFunction>();
            for (var i = 0; i < _sites.Count; i++)
            {
                var site = _sites[i];
                if (expanded.Add(site.Target) && Changes(site.Target, site.Role))
                {
                    foreach (var call in ReturnedCalls(site.Target.Declaration))
                    {
                        Follow(site.Target.File, call, site.Role.Callee, site.Target, null);
                    }
                }
            }

            // A reported function's result is no longer a step's, which can leave a function it calls used elsewhere.
            var blocked = new Dictionary<StepFunction, (string Reason, string Instead)>();
            List<Site> live;
            bool blockedMore;
            do
            {
                live = [.. _sites.Where(site => site.Owner is not StepFunction owner || !blocked.ContainsKey(owner))];
                blockedMore = false;
                foreach (var group in live.GroupBy(static site => site.Target))
                {
                    if (!blocked.ContainsKey(group.Key) && Blocked(group.Key, [.. group], live) is { } reason)
                    {
                        blocked[group.Key] = reason;
                        blockedMore = true;
                    }
                }
            } while (blockedMore);

            var members = new List<(ScannedCSharpFile File, SyntaxNode Node, SyntaxNode Rewritten)>();
            var targets = live.GroupBy(static site => site.Target)
                .OrderBy(static group => group.Key.File.RelativePath, StringComparer.Ordinal)
                .ThenBy(static group => group.Key.Declaration.SpanStart);
            foreach (var group in targets)
            {
                var target = group.Key;
                var role = group.First().Role;
                var location = $"{Location(target.File, target.Declaration)}: {MemberName(target.Declaration)}";
                if (blocked.TryGetValue(target, out var reason))
                {
                    messages.Todo(
                        $"{location} {reason.Reason}, so its result type and parameters were not rewritten. "
                            + $"{reason.Instead}."
                    );
                    continue;
                }

                if (!Changes(target, role))
                {
                    continue;
                }

                var rewriter = new StepRewriter(role, names, target.File.SemanticModel);
                if (target.IsLocal)
                {
                    _localOwners[target].Steps[target.Declaration] = rewriter;
                }
                else
                {
                    members.Add((target.File, target.Declaration, rewriter.Rewrite(target.Declaration)));
                }

                messages.Ok($"{location} {role.Shape}, as {A(role.Description)} does now.");
            }

            foreach (var (file, node, role) in _unfollowed)
            {
                messages.Todo(
                    $"{Location(file, node)}: the {role.Description} passed here is not a lambda or a method the "
                        + $"upgrade can find in the app, so it was not changed. {Capitalized(A(role.Description))} {role.Shape}."
                );
            }

            return members;
        }

        /// <summary>
        /// Why the function cannot be rewritten for its sites, or <c>null</c> when it can or need not be.
        /// </summary>
        private (string Reason, string Instead)? Blocked(StepFunction target, List<Site> sites, List<Site> live)
        {
            var first = sites[0].Role;
            if (sites.FirstOrDefault(site => !site.Role.RewritesLike(first)) is { } other)
            {
                return sites.Any(site => Changes(target, site.Role))
                    ? (
                        $"is both {A(first.Description)} and {A(other.Role.Description)}, which return different results",
                        $"Give each its own method: {A(first.Description)} {first.Shape}, and "
                            + $"{A(other.Role.Description)} {other.Role.Shape}"
                    )
                    : null;
            }

            if (!Changes(target, first))
            {
                return null;
            }

            var references = live.Where(site => site.Target == target)
                .Select(static site => site.Reference)
                .ToHashSet();
            if (OtherReference(target, references) is { } elsewhere)
            {
                return (
                    $"is {A(first.Description)} and is also used at {elsewhere}, where the upgrade cannot follow it",
                    $"Give the {first.Description} a method of its own that {first.Shape}"
                );
            }

            if (first.DropsReason && UsesReason(target.Declaration))
            {
                return (
                    "uses its MailboxClosedReason, which onTimeout is not given",
                    $"Make it a method that {first.Shape}: onTimeout runs when the timeout passes"
                );
            }

            if (SharedSignature(target) is { } shared)
            {
                return (
                    $"shares its signature with {shared}",
                    $"Make it, and each method that shares its signature, a method that {first.Shape}"
                );
            }

            return null;
        }

        /// <summary>
        /// What else declares the method's signature, which a rewrite of the method alone would break: the method it
        /// overrides, the overrides of an abstract or virtual method, or an interface of the app's that its type
        /// implements with it. <c>null</c> when nothing does.
        /// </summary>
        private string? SharedSignature(StepFunction target)
        {
            if (target.Declaration is not MethodDeclarationSyntax method)
            {
                return null;
            }

            if (method.Modifiers.Any(SyntaxKind.OverrideKeyword))
            {
                return "the method it overrides";
            }

            if (method.Modifiers.Any(SyntaxKind.AbstractKeyword))
            {
                return "its overrides";
            }

            var sameName = files
                .SelectMany(static file =>
                    file.Root.DescendantNodes().OfType<MethodDeclarationSyntax>().Select(other => (file, other))
                )
                .Where(pair => pair.other.Identifier.ValueText == target.Name)
                .ToList();
            if (method.Modifiers.Any(SyntaxKind.VirtualKeyword))
            {
                foreach (
                    var (file, other) in sameName.Where(static pair =>
                        pair.other.Modifiers.Any(SyntaxKind.OverrideKeyword)
                    )
                )
                {
                    return $"its override at {file.RelativePath}:{Line(file, other)}";
                }
            }

            var bases = ((method.Parent as TypeDeclarationSyntax)?.BaseList?.Types ?? default)
                .Select(static type => SimpleName(type.Type) ?? (type.Type as GenericNameSyntax)?.Identifier.ValueText)
                .ToHashSet(StringComparer.Ordinal);
            foreach (var (_, other) in sameName)
            {
                if (other.Parent is InterfaceDeclarationSyntax owner && bases.Contains(owner.Identifier.ValueText))
                {
                    return $"{owner.Identifier.ValueText}, which its type implements";
                }
            }

            return null;
        }

        private bool Changes(StepFunction target, StepRole role) =>
            role.CanChange
            && !new StepRewriter(role, names, target.File.SemanticModel)
                .Rewrite(target.Declaration)
                .IsEquivalentTo(target.Declaration, topLevel: false);

        /// <summary>
        /// Where else the app names the function, other than at its sites: a name that the upgrade cannot resolve to
        /// another function.
        /// </summary>
        private string? OtherReference(StepFunction target, HashSet<SyntaxNode> references)
        {
            IEnumerable<(ScannedCSharpFile File, SyntaxNode Scope)> scopes = target.IsLocal
                ? [(target.File, target.Declaration.Ancestors().OfType<MemberDeclarationSyntax>().First())]
                : files.Select(static file => (file, (SyntaxNode)file.Root));
            foreach (var (file, scope) in scopes)
            {
                foreach (var name in scope.DescendantNodes().OfType<IdentifierNameSyntax>())
                {
                    if (
                        name.Identifier.ValueText == target.Name
                        && !references.Contains(name)
                        && !IsInNameof(name)
                        && !ResolvesElsewhere(name, file, target)
                    )
                    {
                        return $"{file.RelativePath}:{Line(file, name)}";
                    }
                }
            }

            return null;
        }

        private bool ResolvesElsewhere(IdentifierNameSyntax name, ScannedCSharpFile file, StepFunction target)
        {
            ExpressionSyntax expression =
                name.Parent is MemberAccessExpressionSyntax access && access.Name == name ? access : name;
            int? arguments =
                expression.Parent is InvocationExpressionSyntax call && call.Expression == expression
                    ? call.ArgumentList.Arguments.Count
                    : null;
            var found = resolver.ResolveFunction(
                expression,
                file,
                parameters => arguments is not { } count || Fits(parameters, count)
            );
            return found.Count > 0 && !found.Any(function => function.Declaration == target.Declaration);
        }

        private static bool IsWithin(StepFunction local, SyntaxNode method) =>
            local.Declaration.Ancestors().Contains(method);

        private static bool IsInNameof(SyntaxNode node) =>
            node.Ancestors()
                .OfType<InvocationExpressionSyntax>()
                .Any(static call => call.Expression is IdentifierNameSyntax { Identifier.ValueText: "nameof" });

        private static SyntaxNode ReferenceName(ExpressionSyntax expression) =>
            expression is MemberAccessExpressionSyntax access ? access.Name : expression;
    }

    /// <summary>
    /// Whether a method can take this many arguments.
    /// </summary>
    private static bool Fits(ParameterListSyntax parameterList, int arguments)
    {
        var parameters = parameterList.Parameters;
        if (parameters.Any(static p => p.Modifiers.Any(SyntaxKind.ParamsKeyword)))
        {
            return arguments >= parameters.Count - 1;
        }

        return arguments >= parameters.Count(static p => p.Default is null) && arguments <= parameters.Count;
    }

    /// <summary>
    /// The calls whose result a function returns: <c>return Answer(reply);</c>, <c>=> await Answer(reply)</c>.
    /// </summary>
    private static IEnumerable<InvocationExpressionSyntax> ReturnedCalls(SyntaxNode function)
    {
        IEnumerable<ExpressionSyntax?> returned = function switch
        {
            MethodDeclarationSyntax { ExpressionBody: { } arrow } => [arrow.Expression],
            LocalFunctionStatementSyntax { ExpressionBody: { } arrow } => [arrow.Expression],
            AnonymousFunctionExpressionSyntax { ExpressionBody: { } body } => [body],
            _ => function
                .DescendantNodes()
                .OfType<ReturnStatementSyntax>()
                .Where(statement => OwningFunction(statement) == function)
                .Select(static statement => statement.Expression),
        };
        foreach (var expression in returned.OfType<ExpressionSyntax>())
        {
            var value = Unwrap(expression);
            if (value is AwaitExpressionSyntax awaited)
            {
                value = Unwrap(awaited.Expression);
            }

            if (
                value is InvocationExpressionSyntax
                {
                    Expression: MemberAccessExpressionSyntax { Name.Identifier.ValueText: "ConfigureAwait" } configured,
                }
            )
            {
                value = Unwrap(configured.Expression);
            }

            if (
                value is InvocationExpressionSyntax
                {
                    Expression: SimpleNameSyntax or MemberAccessExpressionSyntax
                } call
            )
            {
                yield return call;
            }
        }
    }

    /// <summary>
    /// Whether an <c>onClosed</c> uses its <c>MailboxClosedReason</c>, its second parameter.
    /// </summary>
    private static bool UsesReason(SyntaxNode function)
    {
        var (parameters, body) = function switch
        {
            MethodDeclarationSyntax method => (method.ParameterList, (SyntaxNode?)method.Body ?? method.ExpressionBody),
            LocalFunctionStatementSyntax local => (
                local.ParameterList,
                (SyntaxNode?)local.Body ?? local.ExpressionBody
            ),
            ParenthesizedLambdaExpressionSyntax lambda => (lambda.ParameterList, lambda.Body),
            AnonymousMethodExpressionSyntax { ParameterList: { } list } anonymous => (list, anonymous.Body),
            _ => (null, null),
        };
        if (parameters?.Parameters is not [var first, var reason] || body is null)
        {
            return false;
        }

        // Two discards in a lambda cannot be named.
        var name = reason.Identifier.ValueText;
        if (function is AnonymousFunctionExpressionSyntax && name == "_" && first.Identifier.ValueText == "_")
        {
            return false;
        }

        return body.DescendantNodesAndSelf()
            .OfType<IdentifierNameSyntax>()
            .Any(identifier => identifier.Identifier.ValueText == name);
    }

    /// <summary>
    /// Rewrites one function passed as a step: renames its role's result types where they name the Altinn ones,
    /// unwraps <c>Conclude(result)</c> in a send, and drops an <c>onClosed</c>'s reason.
    /// </summary>
    private sealed class StepRewriter(StepRole role, TypeNames names, SemanticModel? model) : CSharpSyntaxRewriter
    {
        public SyntaxNode Rewrite(SyntaxNode function)
        {
            var rewritten =
                Visit(function) ?? throw new InvalidOperationException($"Rewriting removed a {function.Kind()}.");
            return role.DropsReason ? WithoutReason(rewritten) : rewritten;
        }

        public override SyntaxNode? VisitIdentifierName(IdentifierNameSyntax node) =>
            role.Renames.TryGetValue(node.Identifier.ValueText, out var renamed)
            && IsTypeReference(node)
            && names.IsAltinn(node, model)
                ? node.WithIdentifier(SyntaxFactory.Identifier(renamed).WithTriviaFrom(node.Identifier))
                : base.VisitIdentifierName(node);

        public override SyntaxNode? VisitInvocationExpression(InvocationExpressionSyntax node)
        {
            if (
                role.UnwrapsConclude
                && node
                    is {
                        Expression: MemberAccessExpressionSyntax
                        {
                            Name.Identifier.ValueText: "Conclude",
                            Expression: var receiver,
                        },
                        ArgumentList.Arguments: [{ RefKindKeyword.RawKind: (int)SyntaxKind.None } result],
                    }
                && NamesAltinnType(receiver, "ServiceTaskOpeningStageResult", names, model)
            )
            {
                return (Visit(result.Expression) ?? result.Expression).WithTriviaFrom(node);
            }

            return base.VisitInvocationExpression(node);
        }

        /// <summary>
        /// The function without its second parameter. A lambda of two untyped parameters becomes a lambda of one.
        /// </summary>
        private static SyntaxNode WithoutReason(SyntaxNode function) =>
            function switch
            {
                MethodDeclarationSyntax method => method.WithParameterList(WithoutSecond(method.ParameterList)),
                LocalFunctionStatementSyntax local => local.WithParameterList(WithoutSecond(local.ParameterList)),
                ParenthesizedLambdaExpressionSyntax
                {
                    ReturnType: null,
                    ParameterList: { Parameters: [var first, _] } list,
                } lambda when first is { Type: null, Modifiers.Count: 0, AttributeLists.Count: 0 } =>
                    SyntaxFactory.SimpleLambdaExpression(
                        lambda.AttributeLists,
                        lambda.Modifiers,
                        first
                            .WithLeadingTrivia(list.OpenParenToken.LeadingTrivia)
                            .WithTrailingTrivia(list.CloseParenToken.TrailingTrivia),
                        lambda.ArrowToken,
                        lambda.Block,
                        lambda.ExpressionBody
                    ),
                ParenthesizedLambdaExpressionSyntax lambda => lambda.WithParameterList(
                    WithoutSecond(lambda.ParameterList)
                ),
                AnonymousMethodExpressionSyntax { ParameterList: { } list } anonymous => anonymous.WithParameterList(
                    WithoutSecond(list)
                ),
                _ => function,
            };

        private static ParameterListSyntax WithoutSecond(ParameterListSyntax list) =>
            list.Parameters is [var first, var second]
                ? list.WithParameters(
                    SyntaxFactory.SingletonSeparatedList(first.WithTrailingTrivia(second.GetTrailingTrivia()))
                )
                : list;
    }
}
