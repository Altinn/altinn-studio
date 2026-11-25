using System;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

/// <summary>A user task type whose <see cref="StartAction"/> starts the pipeline a test composes.</summary>
internal sealed class TestActionPipelineTask(Func<PipelineBuilder, ServiceTaskPipeline> definePipeline)
    : IActionPipelineTask
{
    public const string TaskType = "testAttempt";
    public const string Action = "attempt";
    public const string RefusalCode = "AttemptNotFinished";
    public const string RefusalTextKey = "attempt.notFinished";

    public static readonly PipelineId Pipeline = PipelineId.ActionPipeline(TaskType, Action);

    public string Type => TaskType;

    public string StartAction { get; init; } = Action;

    public ServiceTaskPipeline DefineActionPipeline(PipelineBuilder pipeline) => definePipeline(pipeline);

    public ValidationIssue ProcessNextRefusal(string taskId) =>
        new()
        {
            Code = RefusalCode,
            Severity = ValidationIssueSeverity.Error,
            CustomTextKey = RefusalTextKey,
        };
}
