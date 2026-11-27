using System;
using System.Threading.Tasks;
using Altinn.App.Core.Features.Process;
using Altinn.Platform.Storage.Interface.Models;
using TestApp.Shared;

#nullable enable

namespace Altinn.App.Integration.Tests.Scenarios.WorkflowEngineStepRerun;

/// <summary>
/// A service task whose one stage opens a mailbox and decides differently on its second run. The first run concludes
/// the task, and the scenario loses its answer after the save. The second run only completes the stage, which on its
/// own would start a receive workflow for the exchange that the first run closed. Each run records itself in the
/// instance's data values, so Storage shows whose save it kept.
/// </summary>
public sealed class DecidesOnceServiceTask : IServiceTask
{
    public const string ServiceTaskType = "rerun-result";
    public const string DecidedByKey = "decidedBy";

    public string Type => ServiceTaskType;

    public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
        pipeline
            .Stage(
                Decide,
                new MailboxOptions { Timeout = TimeSpan.FromMinutes(20) },
                out MailboxHandle exchange,
                // A short constant backoff, capped so that a regression fails the test fast.
                new ProcessStepOptions
                {
                    RetryStrategy = ProcessStepRetryStrategy.Constant(TimeSpan.FromSeconds(1), maxRetries: 3),
                }
            )
            .ConcludeOnReplies(exchange, onMessage: Unexpected, onClosed: UnexpectedClosure);

    private static Task<ServiceTaskOpeningStageResult> Decide(StageContext context, ServiceTaskMailbox mailbox)
    {
        int run = StepRerunState.NextDecideRun();
        Instance instance = context.InstanceDataMutator.Instance;
        instance.DataValues ??= [];
        instance.DataValues[DecidedByKey] = $"run-{run}";

        if (run == 1)
        {
            AnswerLoss.LoseThisAnswer();
            SnapshotLogger.LogInfo("StepRerun.Decide.Run1.Concluded");
            return Task.FromResult(ServiceTaskOpeningStageResult.Conclude(ServiceTaskResult.Success()));
        }

        SnapshotLogger.LogInfo($"StepRerun.Decide.Run{run}.Completed");
        return Task.FromResult(ServiceTaskOpeningStageResult.Completed());
    }

    private static Task<ServiceTaskExchangeResult> Unexpected(StageContext context, ServiceTaskReply reply)
    {
        SnapshotLogger.LogInfo("StepRerun.Decide.UnexpectedMessage");
        return Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.FailedPermanent("No message is sent."));
    }

    private static Task<ServiceTaskResult> UnexpectedClosure(StageContext context, MailboxClosedReason reason)
    {
        SnapshotLogger.LogInfo("StepRerun.Decide.UnexpectedClosure");
        return Task.FromResult<ServiceTaskResult>(
            ServiceTaskResult.FailedPermanent("The exchange is never waited on.")
        );
    }
}
