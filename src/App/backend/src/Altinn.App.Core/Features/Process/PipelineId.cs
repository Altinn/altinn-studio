using System.Globalization;

namespace Altinn.App.Core.Features.Process;

/// <summary>Which pipeline a step runs: a service task's, or the action pipeline a user task type declares.</summary>
/// <param name="TaskType">The task type that composes the pipeline.</param>
/// <param name="Action">The user action that starts an action pipeline; null for a service task.</param>
internal readonly record struct PipelineId(string TaskType, string? Action)
{
    public static PipelineId ServiceTask(string taskType) => new(taskType, null);

    public static PipelineId ActionPipeline(string taskType, string action) => new(taskType, action);

    public bool IsActionPipeline => Action is not null;

    /// <summary>Starts a sentence in error texts, so a service task reads as it did before action pipelines.</summary>
    public override string ToString() =>
        Action is null
            ? string.Create(CultureInfo.InvariantCulture, $"Service task '{TaskType}'")
            : string.Create(CultureInfo.InvariantCulture, $"Action pipeline '{Action}' of task type '{TaskType}'");
}
