using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Text;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

internal sealed partial class PreviewPipelineMigration
{
    /// <summary>
    /// A send, the mailbox-opening <c>Stage</c>, and the <c>HandleReplies</c> or <c>ConcludeOnReplies</c> that
    /// answers it, which become one <c>ExternalStage(send, onReply, timeout:, onTimeout:, options:)</c>.
    /// </summary>
    /// <param name="SameChain">
    /// Whether the handler is called on the send itself. Otherwise it starts the statement after the send's.
    /// </param>
    private sealed record ExternalStagePlan(
        InvocationExpressionSyntax Send,
        InvocationExpressionSyntax Handler,
        bool SameChain,
        ArgumentSyntax Work,
        ArgumentSyntax Mailbox,
        ExpressionSyntax Timeout,
        ArgumentSyntax OnMessage,
        ArgumentSyntax OnClosed,
        ArgumentSyntax? Options
    );

    /// <summary>
    /// Pairs each send with the handler that answers it and plans them as one <c>ExternalStage</c>. That only keeps
    /// the pipeline's meaning when the handler directly follows its send, in its chain or as the next statement on
    /// the same builder: anything between them would run before the replies are handled, where it ran after. So
    /// another step between them, two sends before their handlers, a handle that goes anywhere else and
    /// <c>out _</c> are reported, as is a mailbox timeout that is not written in place and options the two calls
    /// give differently.
    /// </summary>
    private static void PlanExternalStages(
        PipelineMethod method,
        List<InvocationExpressionSyntax> sends,
        List<InvocationExpressionSyntax> handlers,
        MethodRewriter rewriter,
        List<(ArgumentSyntax Argument, StepRole Role)> stepArguments,
        List<string> unsupported
    )
    {
        var file = method.File;
        var answers = new Dictionary<InvocationExpressionSyntax, InvocationExpressionSyntax>();
        foreach (var handler in handlers)
        {
            var name = CalledName(handler);
            var line = CallLine(file, handler);
            if (Argument(handler, "handle", 0) is not { Expression: IdentifierNameSyntax handle })
            {
                unsupported.Add($"{name} at line {line}, whose MailboxHandle is not the local a send declares");
                continue;
            }

            if (sends.FirstOrDefault(send => HandleName(send) == handle.Identifier.ValueText) is not { } answered)
            {
                unsupported.Add($"{name} at line {line}, whose MailboxHandle does not come from a send in this method");
                continue;
            }

            answers[answered] = handler;
        }

        foreach (
            var send in sends.OrderBy(static send => ((MemberAccessExpressionSyntax)send.Expression).Name.SpanStart)
        )
        {
            var line = CallLine(file, send);
            var outArgument = send.ArgumentList.Arguments.First(static a =>
                a.RefKindKeyword.IsKind(SyntaxKind.OutKeyword)
            );
            if (HandleName(send) is not { } handleName)
            {
                unsupported.Add(
                    outArgument.Expression is IdentifierNameSyntax { Identifier.ValueText: not "_" }
                        ? $"the send at line {line}, whose MailboxHandle goes to a variable declared elsewhere"
                        : $"the send at line {line}, whose MailboxHandle is discarded, so that nothing handles its replies"
                );
                continue;
            }

            if (!answers.TryGetValue(send, out var handler))
            {
                unsupported.Add($"the send at line {line}, whose replies nothing in this method handles");
                continue;
            }

            var handlerName = CalledName(handler);
            var handlerLine = CallLine(file, handler);
            var handleUses = method
                .Method.DescendantNodes()
                .OfType<IdentifierNameSyntax>()
                .Where(use =>
                    use.Identifier.ValueText == handleName && use != Argument(handler, "handle", 0)?.Expression
                )
                .ToList();
            foreach (var use in handleUses)
            {
                unsupported.Add($"the MailboxHandle {handleName} {HandleUse(use)} at line {Line(file, use)}");
            }

            if (handleUses.Count > 0)
            {
                continue;
            }

            var sameChain =
                handler.Expression is MemberAccessExpressionSyntax { Expression: var receiver }
                && Unwrap(receiver) == send;
            var nextStatement = sameChain ? null : NextStatementHandling(send, handler);
            if (!sameChain && nextStatement is null)
            {
                unsupported.Add(
                    $"{handlerName} at line {handlerLine}, not directly after its send at line {line}, where one "
                        + "ExternalStage would change when the send goes out"
                );
                continue;
            }

            var mailbox = Argument(send, "mailbox", 1);
            var timeout = mailbox is null ? null : TimeoutInPlace(mailbox.Expression);
            if (mailbox is null || timeout is null)
            {
                unsupported.Add(
                    $"the MailboxOptions of the send at line {line}, whose timeout is not written in the call as "
                        + "new MailboxOptions { Timeout = ... }"
                );
                continue;
            }

            var sendOptions = Argument(send, "options", 3);
            var handlerOptions = Argument(handler, "options", 3);
            if (
                sendOptions is not null
                && handlerOptions is not null
                && !SyntaxFactory.AreEquivalent(sendOptions.Expression, handlerOptions.Expression)
            )
            {
                unsupported.Add(
                    $"options at lines {line} and {handlerLine} that differ, where ExternalStage takes one for the "
                        + "send and each reply"
                );
                continue;
            }

            if (
                Argument(send, "work", 0) is not { } work
                || Argument(handler, "onMessage", 1) is not { } onMessage
                || Argument(handler, "onClosed", 2) is not { } onClosed
            )
            {
                unsupported.Add($"the send at line {line} and its {handlerName}, whose arguments it cannot place");
                continue;
            }

            var plan = new ExternalStagePlan(
                send,
                handler,
                sameChain,
                work,
                mailbox,
                timeout,
                onMessage,
                onClosed,
                sendOptions ?? handlerOptions
            );
            if (DroppedTrivia(plan) is { } dropped)
            {
                unsupported.Add(
                    $"a comment or preprocessor directive at line {Line(file, dropped)} between the send at line "
                        + $"{line} and its {handlerName}, which one ExternalStage has no place for"
                );
                continue;
            }

            if (sameChain)
            {
                rewriter.ExternalStages[handler] = plan;
            }
            else
            {
                rewriter.ExternalStages[send] = plan;
                rewriter.Strips.Add(handler);
                if (nextStatement is ExpressionStatementSyntax { Expression: var expression } && expression == handler)
                {
                    rewriter.Removed.Add(nextStatement);
                }
            }

            var concludes = handlerName == PreviewApi.ConcludeOnReplies;
            stepArguments.Add((work, StepRole.Send));
            stepArguments.Add((onMessage, concludes ? StepRole.ConcludingReply : StepRole.CarryOnReply));
            stepArguments.Add((onClosed, concludes ? StepRole.ConcludingTimeout : StepRole.CarryOnTimeout));
        }
    }

    private static string CalledName(InvocationExpressionSyntax invocation) =>
        ((MemberAccessExpressionSyntax)invocation.Expression).Name.Identifier.ValueText;

    /// <summary>
    /// The local a send declares for its handle with <c>out var handle</c> or <c>out MailboxHandle handle</c>.
    /// </summary>
    private static string? HandleName(InvocationExpressionSyntax send) =>
        send.ArgumentList.Arguments.FirstOrDefault(static a => a.RefKindKeyword.IsKind(SyntaxKind.OutKeyword))
            is { Expression: DeclarationExpressionSyntax { Designation: SingleVariableDesignationSyntax designation } }
            ? designation.Identifier.ValueText
            : null;

    private static string HandleUse(IdentifierNameSyntax use)
    {
        if (use.Ancestors().Any(static ancestor => ancestor is AnonymousFunctionExpressionSyntax))
        {
            return "used in a lambda";
        }

        return use.Parent is ArgumentSyntax { Parent.Parent: InvocationExpressionSyntax call }
            ? $"passed to {call.Expression.WithoutTrivia()}"
            : "stored";
    }

    /// <summary>
    /// The statement after the send's, when the handler starts it on the same builder: the send ends its own
    /// statement, as the whole of it, the value assigned or the one local declared, and the handler is called on the
    /// name the send's chain starts from or that statement declares.
    /// </summary>
    private static StatementSyntax? NextStatementHandling(
        InvocationExpressionSyntax send,
        InvocationExpressionSyntax handler
    )
    {
        var (statement, declared) = send.Parent switch
        {
            ExpressionStatementSyntax whole => (whole, null),
            AssignmentExpressionSyntax
            {
                Left: IdentifierNameSyntax target,
                Parent: ExpressionStatementSyntax assignment,
            } value when value.Right == send => (assignment, target.Identifier.ValueText),
            EqualsValueClauseSyntax
            {
                Parent: VariableDeclaratorSyntax
                {
                    Parent: VariableDeclarationSyntax
                    {
                        Variables.Count: 1,
                        Parent: LocalDeclarationStatementSyntax local,
                    },
                } declarator,
            } => (local, declarator.Identifier.ValueText),
            _ => ((StatementSyntax?)null, (string?)null),
        };
        if (statement?.Parent is not BlockSyntax block)
        {
            return null;
        }

        var index = block.Statements.IndexOf(statement);
        if (index + 1 >= block.Statements.Count)
        {
            return null;
        }

        var next = block.Statements[index + 1];
        return
            handler.FirstAncestorOrSelf<StatementSyntax>() == next
            && handler.Expression is MemberAccessExpressionSyntax { Expression: IdentifierNameSyntax receiver }
            && (receiver.Identifier.ValueText == declared || receiver.Identifier.ValueText == ChainRoot(send))
            ? next
            : null;
    }

    /// <summary>
    /// The name a chain of calls starts from.
    /// </summary>
    private static string? ChainRoot(InvocationExpressionSyntax call)
    {
        ExpressionSyntax expression = call;
        while (Unwrap(expression) is InvocationExpressionSyntax { Expression: MemberAccessExpressionSyntax access })
        {
            expression = access.Expression;
        }

        return Unwrap(expression) is IdentifierNameSyntax root ? root.Identifier.ValueText : null;
    }

    /// <summary>
    /// <c>X</c> from <c>new MailboxOptions { Timeout = X }</c>, or from a target-typed <c>new() { Timeout = X }</c>.
    /// </summary>
    private static ExpressionSyntax? TimeoutInPlace(ExpressionSyntax mailbox) =>
        Unwrap(mailbox) switch
        {
            ObjectCreationExpressionSyntax
            {
                ArgumentList: null or { Arguments.Count: 0 },
                Initializer: { } initializer,
            } creation when SimpleName(creation.Type) == PreviewApi.MailboxOptions => AssignedTimeout(initializer),
            ImplicitObjectCreationExpressionSyntax { ArgumentList.Arguments.Count: 0, Initializer: { } initializer } =>
                AssignedTimeout(initializer),
            _ => null,
        };

    private static ExpressionSyntax? AssignedTimeout(InitializerExpressionSyntax initializer) =>
        initializer.Expressions
            is [
                AssignmentExpressionSyntax
                {
                    Left: IdentifierNameSyntax { Identifier.ValueText: "Timeout" },
                    Right: var value
                },
            ]
            ? value
            : null;

    /// <summary>
    /// A comment or directive that merging the two calls would lose: one between their arguments other than around
    /// the arguments <c>ExternalStage</c> keeps, which go with them.
    /// </summary>
    private static int? DroppedTrivia(ExternalStagePlan plan)
    {
        var kept = new List<TextSpan>
        {
            plan.Work.FullSpan,
            plan.OnMessage.FullSpan,
            plan.OnClosed.FullSpan,
            TextSpan.FromBounds(plan.Mailbox.FullSpan.Start, plan.Mailbox.SpanStart),
            plan.Timeout.FullSpan,
        };
        if (plan.Options is { } options)
        {
            kept.Add(options.FullSpan);
        }

        var send = plan.Send.ArgumentList;
        var handler = plan.Handler.ArgumentList;
        var handlerReceiver = ((MemberAccessExpressionSyntax)plan.Handler.Expression).Expression;
        TextSpan[] regions = plan.SameChain
            ? [TextSpan.FromBounds(send.OpenParenToken.Span.End, handler.CloseParenToken.SpanStart)]
            :
            [
                TextSpan.FromBounds(send.OpenParenToken.Span.End, send.CloseParenToken.SpanStart),
                TextSpan.FromBounds(handlerReceiver.Span.End, handler.CloseParenToken.SpanStart),
            ];
        var root = plan.Send.SyntaxTree.GetRoot();
        foreach (var region in regions)
        {
            var dropped = root.DescendantTrivia(region)
                .FirstOrDefault(trivia =>
                    region.Contains(trivia.Span) && IsKept(trivia) && !kept.Any(span => span.Contains(trivia.Span))
                );
            if (IsKept(dropped))
            {
                return dropped.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
            }
        }

        return null;
    }
}
