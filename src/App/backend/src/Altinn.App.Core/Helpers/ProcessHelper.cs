using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;

namespace Altinn.App.Core.Helpers;

/// <summary>
/// Helper class for handling the process for an instance.
/// </summary>
public static class ProcessHelper
{
    /// <summary>
    /// Validates that the process can start from the given start event.
    /// </summary>
    /// <param name="proposedStartEvent">The name of the start event the process should start from.</param>
    /// <param name="possibleStartEvents">List of possible start events <see cref="IProcessReader.GetStartEventIds"/></param>
    /// <returns>The name of the start event.</returns>
    /// <exception cref="ProcessException">Thrown when the start event cannot be determined.</exception>
    public static string GetValidStartEventOrError(string? proposedStartEvent, List<string> possibleStartEvents)
    {
        if (!string.IsNullOrEmpty(proposedStartEvent))
        {
            if (possibleStartEvents.Contains(proposedStartEvent))
            {
                return proposedStartEvent;
            }

            throw new ProcessException(
                $"There is no such start event as '{proposedStartEvent}' in the process definition."
            );
        }

        if (possibleStartEvents.Count == 1)
        {
            return possibleStartEvents.First();
        }

        if (possibleStartEvents.Count > 1)
        {
            throw new ProcessException(
                $"There are more than one start events available. Chose one: [{string.Join(", ", possibleStartEvents)}]"
            );
        }

        // No start events in process definition - this is an invalid process configuration
        throw new ProcessException("There is no start events in process definition. Cannot start process!");
    }

    /// <summary>
    /// Validates that the given element name is a valid next step in the process.
    /// </summary>
    /// <param name="proposedElementId">The name of the proposed next element.</param>
    /// <param name="possibleNextElements">List of possible next elements</param>
    /// <param name="nextElementError">Any error preventing the logic to identify next element.</param>
    /// <returns>The name of the next element.</returns>
    public static string? GetValidNextElementOrError(
        string? proposedElementId,
        List<string> possibleNextElements,
        out ProcessError? nextElementError
    )
    {
        nextElementError = null;

        if (!string.IsNullOrEmpty(proposedElementId))
        {
            if (possibleNextElements.Contains(proposedElementId))
            {
                return proposedElementId;
            }
            else
            {
                nextElementError = Conflict(
                    $"The proposed next element id '{proposedElementId}' is not among the available next process elements"
                );
                return null;
            }
        }

        if (possibleNextElements.Count == 1)
        {
            return possibleNextElements.First();
        }

        if (possibleNextElements.Count > 1)
        {
            nextElementError = Conflict(
                $"There are more than one outgoing sequence flows, please select one '{possibleNextElements}'"
            );
            return null;
        }

        if (possibleNextElements.Count == 0)
        {
            nextElementError = Conflict(
                $"There are no outgoing sequence flows from current element. Cannot find next process element. Error in bpmn file!"
            );
            return null;
        }

        return null;
    }

    /// <summary>
    /// Find the flowtype between
    /// </summary>
    public static ProcessSequenceFlowType GetSequenceFlowType(List<SequenceFlow> flows)
    {
        foreach (SequenceFlow flow in flows)
        {
            if (
                !string.IsNullOrEmpty(flow.FlowType)
                && Enum.TryParse(flow.FlowType, out ProcessSequenceFlowType flowType)
            )
            {
                return flowType;
            }
        }

        return ProcessSequenceFlowType.CompleteCurrentMoveToNext;
    }

    private static ProcessError Conflict(string text)
    {
        return new ProcessError { Code = "Conflict", Text = text };
    }
}
