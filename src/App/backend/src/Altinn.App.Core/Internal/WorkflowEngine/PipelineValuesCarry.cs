using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Moves a pipeline's <see cref="PipelineValues"/> between the workflow state carry and the step that runs one
/// of its items. The same rules for every host, service task and side effect alike.
/// </summary>
internal static class PipelineValuesCarry
{
    /// <summary>
    /// The values the item at <paramref name="itemIndex"/> starts with. The first item starts with none, so a
    /// new visit to a pipeline never reads what an earlier visit left behind.
    /// </summary>
    public static PipelineValues Restore(WorkflowCallbackStateCarry carry, string valuesKey, int itemIndex) =>
        new(itemIndex == 0 ? null : carry.FindValues(valuesKey));

    /// <summary>
    /// Keeps what the step recorded when it completed, drops the pipeline's values when it concluded, and turns
    /// a deferral that recorded something into a permanent failure: a deferral is stateless, so its values would
    /// be lost without a word.
    /// </summary>
    /// <param name="result">What the step answered.</param>
    /// <param name="values">The values the step was handed and may have changed.</param>
    /// <param name="carry">The carry the callback publishes.</param>
    /// <param name="valuesKey">The pipeline's key in the carry.</param>
    /// <param name="concludes">Whether a successful result concludes the pipeline.</param>
    /// <param name="owner">How failures name the pipeline, for example <c>Service task 'pdf'</c>.</param>
    public static ProcessEngineCommandResult Publish(
        ProcessEngineCommandResult result,
        PipelineValues values,
        WorkflowCallbackStateCarry carry,
        string valuesKey,
        bool concludes,
        string owner
    )
    {
        switch (result)
        {
            case DeferredProcessEngineCommandResult when values.IsChanged:
                return FailedProcessEngineCommandResult.Permanent(
                    $"{owner} recorded pipeline values and then deferred. A deferral is stateless, so nothing it "
                        + "records is kept: record values in a stage that completes, before the stage that waits.",
                    "PipelineValuesRecordedOnDeferral"
                );

            case SuccessfulProcessEngineCommandResult when concludes:
                carry.RecordValuesConcluded(valuesKey);
                return result;

            case SuccessfulProcessEngineCommandResult:
                carry.RecordValues(valuesKey, values.Snapshot());
                return result;

            default:
                return result;
        }
    }
}
