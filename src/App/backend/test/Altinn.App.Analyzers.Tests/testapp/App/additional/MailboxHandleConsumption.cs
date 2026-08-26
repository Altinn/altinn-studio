using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.App.Core.Features.Process;

namespace Altinn.App.Models.logic;

/// <summary>
/// The stage work and reply handlers every task below composes, so each task is nothing but its
/// <c>Define</c> — the shape ALTINNAPP0702 and ALTINNAPP0703 are about.
/// </summary>
internal static class MailboxHandlers
{
    internal static MailboxOptions Options() => new MailboxOptions { Timeout = TimeSpan.FromDays(1) };

    internal static Task<ServiceTaskStageResult> Send(ServiceTaskContext context, ServiceTaskMailbox mailbox) =>
        Task.FromResult(ServiceTaskStageResult.Completed());

    internal static Task<ServiceTaskStageExchangeResult> OnMessage(
        ServiceTaskContext context,
        ServiceTaskReply reply
    ) => Task.FromResult<ServiceTaskStageExchangeResult>(ServiceTaskStageResult.Completed());

    internal static Task<ServiceTaskStageResult> OnClosed(ServiceTaskContext context, MailboxClosedReason reason) =>
        Task.FromResult(ServiceTaskStageResult.Completed());

    internal static Task<ServiceTaskExchangeResult> OnFinalMessage(
        ServiceTaskContext context,
        ServiceTaskReply reply
    ) => Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success());

    internal static Task<ServiceTaskResult> OnFinalClosed(ServiceTaskContext context, MailboxClosedReason reason) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

    internal static Task<ServiceTaskResult> Conclude(ServiceTaskContext context) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
}

// Violates ALTINNAPP0702: two HandleReplies for one exchange in one chain - the motivating example.
internal sealed class TwoHandlersInOneChainTask : IPipelineServiceTask
{
    public string Type => "twoHandlersInOneChain";

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
        pipeline
            .Stage(MailboxHandlers.Send, MailboxHandlers.Options(), out MailboxHandle archive)
            .HandleReplies(archive, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed)
            .HandleReplies(archive, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed)
            .Finally(MailboxHandlers.Conclude);
}

// Violates ALTINNAPP0702: the mixed case - a segment handler and then the terminal, same handle. Declared
// with `out var`, the form app code is likeliest to write, so the declaration match is pinned for both forms.
internal sealed class HandledThenConcludedTask : IPipelineServiceTask
{
    public string Type => "handledThenConcluded";

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
        pipeline
            .Stage(MailboxHandlers.Send, MailboxHandlers.Options(), out var journal)
            .HandleReplies(journal, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed)
            .ConcludeOnReplies(journal, MailboxHandlers.OnFinalMessage, MailboxHandlers.OnFinalClosed);
}

// Violates ALTINNAPP0702: still one straight line, spread over statements rather than one chain.
internal sealed class TwoHandlersInSequenceTask : IPipelineServiceTask
{
    public string Type => "twoHandlersInSequence";

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline)
    {
        ServiceTaskPipelineBuilder builder = pipeline.Stage(
            MailboxHandlers.Send,
            MailboxHandlers.Options(),
            out MailboxHandle registry
        );
        builder = builder.HandleReplies(registry, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed);
        return builder.ConcludeOnReplies(registry, MailboxHandlers.OnFinalMessage, MailboxHandlers.OnFinalClosed);
    }
}

// Violates ALTINNAPP0703: the handle is never mentioned again, so nothing can answer this exchange.
internal sealed class ForgottenMailboxTask : IPipelineServiceTask
{
    public string Type => "forgottenMailbox";

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
        pipeline
            .Stage(MailboxHandlers.Send, MailboxHandlers.Options(), out MailboxHandle forgotten)
            .Finally(MailboxHandlers.Conclude);
}

// Fine: two exchanges, each answered once - the shape this phase exists to allow.
internal sealed class TwoExchangesTask : IPipelineServiceTask
{
    public string Type => "twoExchanges";

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
        pipeline
            .Stage(MailboxHandlers.Send, MailboxHandlers.Options(), out MailboxHandle first)
            .HandleReplies(first, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed)
            .Stage(MailboxHandlers.Send, MailboxHandlers.Options(), out MailboxHandle second)
            .ConcludeOnReplies(second, MailboxHandlers.OnFinalMessage, MailboxHandlers.OnFinalClosed);
}

// Fine to this analyzer: a handle handed to a helper is answered somewhere it cannot follow, so the
// double consumption here is the builder's to report at startup.
internal sealed class HelperAnsweredTask : IPipelineServiceTask
{
    public string Type => "helperAnswered";

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline)
    {
        ServiceTaskPipelineBuilder builder = pipeline.Stage(
            MailboxHandlers.Send,
            MailboxHandlers.Options(),
            out MailboxHandle viaHelper
        );
        builder = Attach(builder, viaHelper);
        return builder.ConcludeOnReplies(viaHelper, MailboxHandlers.OnFinalMessage, MailboxHandlers.OnFinalClosed);
    }

    private static ServiceTaskPipelineBuilder Attach(ServiceTaskPipelineBuilder builder, MailboxHandle handle) =>
        builder.HandleReplies(handle, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed);
}

// Fine to this analyzer: the handle travels through a field, which is not a local this rule can follow.
internal sealed class FieldAnsweredTask : IPipelineServiceTask
{
    private MailboxHandle _stored;

    public string Type => "fieldAnswered";

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline)
    {
        ServiceTaskPipelineBuilder builder = pipeline.Stage(
            MailboxHandlers.Send,
            MailboxHandlers.Options(),
            out MailboxHandle viaField
        );
        _stored = viaField;
        builder = builder.HandleReplies(_stored, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed);
        return builder.ConcludeOnReplies(_stored, MailboxHandlers.OnFinalMessage, MailboxHandlers.OnFinalClosed);
    }
}

// Fine: one handler per branch, so only one of them ever runs. Nothing here is provable.
internal sealed class BranchedAnswerTask : IPipelineServiceTask
{
    public string Type => "branchedAnswer";

    public bool EndOnTheExchange { get; set; }

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline)
    {
        ServiceTaskPipelineBuilder builder = pipeline.Stage(
            MailboxHandlers.Send,
            MailboxHandlers.Options(),
            out MailboxHandle conditional
        );

        if (EndOnTheExchange)
        {
            return builder.ConcludeOnReplies(
                conditional,
                MailboxHandlers.OnFinalMessage,
                MailboxHandlers.OnFinalClosed
            );
        }

        return builder
            .HandleReplies(conditional, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed)
            .Finally(MailboxHandlers.Conclude);
    }
}

// Fine: the same local, but reassigned by a second mailbox-opening stage, so the two handlers answer
// two different exchanges.
internal sealed class ReusedLocalTask : IPipelineServiceTask
{
    public string Type => "reusedLocal";

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline)
    {
        ServiceTaskPipelineBuilder builder = pipeline.Stage(
            MailboxHandlers.Send,
            MailboxHandlers.Options(),
            out MailboxHandle reused
        );
        builder = builder.HandleReplies(reused, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed);
        builder = builder.Stage(MailboxHandlers.Send, MailboxHandlers.Options(), out reused);
        return builder.ConcludeOnReplies(reused, MailboxHandlers.OnFinalMessage, MailboxHandlers.OnFinalClosed);
    }
}

// Fine to this analyzer: one answer is inside a lambda, whose control flow is its own, so whether it
// runs before the other is not something the rule can read off this method.
internal sealed class LambdaAnsweredTask : IPipelineServiceTask
{
    public string Type => "lambdaAnswered";

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline)
    {
        ServiceTaskPipelineBuilder builder = pipeline.Stage(
            MailboxHandlers.Send,
            MailboxHandlers.Options(),
            out MailboxHandle viaLambda
        );
        Func<ServiceTaskPipelineBuilder, ServiceTaskPipelineBuilder> attach = b =>
            b.HandleReplies(viaLambda, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed);
        return attach(builder)
            .ConcludeOnReplies(viaLambda, MailboxHandlers.OnFinalMessage, MailboxHandlers.OnFinalClosed);
    }
}

// Fine: an explicit discard declares no local, so there is nothing to follow and nothing is reported - the
// same reading of `_` that ALTINNAPP0701 takes. The builder still refuses this pipeline at startup.
internal sealed class DiscardedHandleTask : IPipelineServiceTask
{
    public string Type => "discardedHandle";

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
        pipeline.Stage(MailboxHandlers.Send, MailboxHandlers.Options(), out _).Finally(MailboxHandlers.Conclude);
}

// Fine: both answers share a basic block, but it is one the method may never enter, and the pipeline the
// method actually returns answers the exchange exactly once.
internal sealed class UnreachedBranchTask : IPipelineServiceTask
{
    public string Type => "unreachedBranch";

    public bool AnswerTwice { get; set; }

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline)
    {
        ServiceTaskPipelineBuilder builder = pipeline.Stage(
            MailboxHandlers.Send,
            MailboxHandlers.Options(),
            out MailboxHandle once
        );

        if (AnswerTwice)
        {
            builder = builder.HandleReplies(once, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed);
            builder = builder.HandleReplies(once, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed);
        }

        return builder.ConcludeOnReplies(once, MailboxHandlers.OnFinalMessage, MailboxHandlers.OnFinalClosed);
    }
}

// Fine: the same, with a loop body instead of a branch - a sequence that may hand out no iterations at all.
internal sealed class UnreachedLoopTask : IPipelineServiceTask
{
    public string Type => "unreachedLoop";

    public IEnumerable<int> Repeats { get; set; } = Array.Empty<int>();

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline)
    {
        ServiceTaskPipelineBuilder builder = pipeline.Stage(
            MailboxHandlers.Send,
            MailboxHandlers.Options(),
            out MailboxHandle perRepeat
        );

        foreach (int repeat in Repeats)
        {
            builder = builder.HandleReplies(perRepeat, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed);
            builder = builder.HandleReplies(perRepeat, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed);
        }

        return builder.ConcludeOnReplies(perRepeat, MailboxHandlers.OnFinalMessage, MailboxHandlers.OnFinalClosed);
    }
}

// Fine: a `ref` local aliases the handle, so a write through the alias would rewrite it out of sight. The
// alias makes the local unfollowable, which is the point - nothing here is provable any more.
internal sealed class RefAliasedTask : IPipelineServiceTask
{
    public string Type => "refAliased";

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline)
    {
        ServiceTaskPipelineBuilder builder = pipeline.Stage(
            MailboxHandlers.Send,
            MailboxHandlers.Options(),
            out MailboxHandle viaAlias
        );
        builder = builder.Stage(MailboxHandlers.Send, MailboxHandlers.Options(), out MailboxHandle other);
        ref MailboxHandle alias = ref viaAlias;
        builder = builder.HandleReplies(viaAlias, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed);
        alias = other;
        return builder.ConcludeOnReplies(viaAlias, MailboxHandlers.OnFinalMessage, MailboxHandlers.OnFinalClosed);
    }
}

// Fine: a deconstruction rewrites the handle without ever being an assignment to the local itself.
internal sealed class DeconstructedTask : IPipelineServiceTask
{
    public string Type => "deconstructed";

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline)
    {
        ServiceTaskPipelineBuilder builder = pipeline.Stage(
            MailboxHandlers.Send,
            MailboxHandlers.Options(),
            out MailboxHandle viaTuple
        );
        builder = builder.Stage(MailboxHandlers.Send, MailboxHandlers.Options(), out MailboxHandle spare);
        builder = builder.HandleReplies(viaTuple, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed);
        (viaTuple, _) = (spare, 0);
        return builder.ConcludeOnReplies(viaTuple, MailboxHandlers.OnFinalMessage, MailboxHandlers.OnFinalClosed);
    }
}

// Violates ALTINNAPP0702: an earlier if/else merges before the chain, so the chain still runs on every path.
// A branch anywhere earlier in the method must not buy the rest of it silence.
internal sealed class AfterBranchMergeTask : IPipelineServiceTask
{
    public string Type => "afterBranchMerge";

    public bool Urgent { get; set; }

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline)
    {
        MailboxOptions options;
        if (Urgent)
        {
            options = new MailboxOptions { Timeout = TimeSpan.FromHours(1) };
        }
        else
        {
            options = new MailboxOptions { Timeout = TimeSpan.FromDays(7) };
        }

        return pipeline
            .Stage(MailboxHandlers.Send, options, out MailboxHandle afterMerge)
            .HandleReplies(afterMerge, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed)
            .HandleReplies(afterMerge, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed)
            .Finally(MailboxHandlers.Conclude);
    }
}

// Violates ALTINNAPP0702: the same, after an earlier `??` - the shape a real Define is likeliest to have.
internal sealed class AfterNullCoalesceTask : IPipelineServiceTask
{
    public string Type => "afterNullCoalesce";

    public ProcessStepOptions Overrides { get; set; }

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline)
    {
        ProcessStepOptions steps = Overrides ?? new ProcessStepOptions();
        return pipeline
            .Stage(MailboxHandlers.Send, MailboxHandlers.Options(), out MailboxHandle afterCoalesce, steps)
            .HandleReplies(afterCoalesce, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed)
            .HandleReplies(afterCoalesce, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed)
            .Finally(MailboxHandlers.Conclude);
    }
}

// Violates ALTINNAPP0702: a `using` wraps the composition in a try/finally, and a finally cannot swallow the
// builder's complaint, so the chain still runs on every path that returns.
internal sealed class InsideUsingTask : IPipelineServiceTask
{
    public string Type => "insideUsing";

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline)
    {
        using var scope = new StringReader("");
        return pipeline
            .Stage(MailboxHandlers.Send, MailboxHandlers.Options(), out MailboxHandle insideUsing)
            .HandleReplies(insideUsing, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed)
            .HandleReplies(insideUsing, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed)
            .Finally(MailboxHandlers.Conclude);
    }
}

// Fine: this composes a valid pipeline. The first HandleReplies answers the exchange, the second one's throw is
// swallowed, and Finally is satisfied - so a catch is the one construct that lets an execution enter the block,
// throw inside it, and return anyway. Reachability alone cannot see that, which is why a try with a handler is
// refused outright.
internal sealed class SwallowedThrowTask : IPipelineServiceTask
{
    public string Type => "swallowedThrow";

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline)
    {
        ServiceTaskPipelineBuilder builder = pipeline.Stage(
            MailboxHandlers.Send,
            MailboxHandlers.Options(),
            out MailboxHandle insideTry
        );

        try
        {
            builder = builder.HandleReplies(insideTry, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed);
            builder = builder.HandleReplies(insideTry, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed);
        }
        catch (InvalidOperationException)
        {
            // The builder has already refused the second handler; the exchange is answered exactly once.
        }

        return builder.Finally(MailboxHandlers.Conclude);
    }
}

// Fine: when the parse throws, the handler returns a pipeline that answers the exchange exactly once, so an
// execution returns without ever reaching the chain below - the chain is not on every path after all. Only
// modelling the way into a catch makes that route visible; branches alone cannot see it.
internal sealed class HandlerReturnsTask : IPipelineServiceTask
{
    public string Type => "handlerReturns";

    public string Raw { get; set; } = "not a number";

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline)
    {
        ServiceTaskPipelineBuilder builder = pipeline.Stage(
            MailboxHandlers.Send,
            MailboxHandlers.Options(),
            out MailboxHandle handled
        );

        try
        {
            _ = int.Parse(Raw);
        }
        catch (FormatException)
        {
            return builder.ConcludeOnReplies(handled, MailboxHandlers.OnFinalMessage, MailboxHandlers.OnFinalClosed);
        }

        return builder
            .HandleReplies(handled, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed)
            .ConcludeOnReplies(handled, MailboxHandlers.OnFinalMessage, MailboxHandlers.OnFinalClosed);
    }
}

// Fine: the same, behind a catch filter - the filter and its handler are both ways onward, so the route out
// stays visible whichever of them the flow graph makes the region's first block.
internal sealed class FilteredHandlerTask : IPipelineServiceTask
{
    public string Type => "filteredHandler";

    public string Raw { get; set; } = "not a number";

    public bool Recover { get; set; }

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline)
    {
        ServiceTaskPipelineBuilder builder = pipeline.Stage(
            MailboxHandlers.Send,
            MailboxHandlers.Options(),
            out MailboxHandle filtered
        );

        try
        {
            _ = int.Parse(Raw);
        }
        catch (FormatException) when (Recover)
        {
            return builder.ConcludeOnReplies(filtered, MailboxHandlers.OnFinalMessage, MailboxHandlers.OnFinalClosed);
        }

        return builder
            .HandleReplies(filtered, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed)
            .ConcludeOnReplies(filtered, MailboxHandlers.OnFinalMessage, MailboxHandlers.OnFinalClosed);
    }
}

// Violates ALTINNAPP0702: a rethrowing catch opens no way out, so the two answers really do run on every path
// that returns - and nothing here returns at all. Coverage a blanket refusal of handled tries would lose.
internal sealed class RethrowingCatchTask : IPipelineServiceTask
{
    public string Type => "rethrowingCatch";

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline)
    {
        ServiceTaskPipelineBuilder builder = pipeline.Stage(
            MailboxHandlers.Send,
            MailboxHandlers.Options(),
            out MailboxHandle rethrown
        );

        try
        {
            builder = builder.HandleReplies(rethrown, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed);
            builder = builder.HandleReplies(rethrown, MailboxHandlers.OnMessage, MailboxHandlers.OnClosed);
        }
        catch (InvalidOperationException)
        {
            throw;
        }

        return builder.Finally(MailboxHandlers.Conclude);
    }
}
