using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

using Altinn.App.Common.Process;
using Altinn.App.Common.Process.Elements;

namespace Altinn.App.Services.Helpers
{
    /// <summary>
    /// Helper class for handling the process for an instance.
    /// </summary>
    public class ProcessHelper
    {
        /// <summary>
        /// Initialize a new instance of the <see cref="ProcessHelper"/> class with the given data stream.
        /// </summary>
        /// <param name="bpmnStream">A stream with access to a BPMN file.</param>
        public ProcessHelper(Stream bpmnStream)
        {
            Process = BpmnReader.Create(bpmnStream);
        }

        /// <summary>
        /// Gets the internal <see cref="BpmnReader"/>.
        /// </summary>
        public BpmnReader Process { get; }

        /// <summary>
        /// Try to get the next valid step in the process.
        /// </summary>
        /// <param name="currentElement">The current element name.</param>
        /// <param name="nextElementError">Any error preventing the logic to identify next element.</param>
        /// <returns>The name of the next element.</returns>
        public string GetValidNextElementOrError(string currentElement, out ProcessError nextElementError)
        {
            nextElementError = null;
            string nextElementId = null;

            List<string> nextElements = Process.NextElements(currentElement);

            if (nextElements.Count > 1)
            {
                nextElementError = new ProcessError
                {
                    Code = "Conflict",
                    Text = $"There is more than one element reachable from element {currentElement}"
                };
            }
            else
            {
                nextElementId = nextElements.First();
            }

            return nextElementId;
        }

        /// <summary>
        /// Checks whether the given element id is a task.
        /// </summary>
        /// <param name="nextElementId">The name of an element from the process.</param>
        /// <returns>True if the element is a task.</returns>
        public bool IsTask(string nextElementId)
        {
            List<string> tasks = Process.Tasks();
            return tasks.Contains(nextElementId);
        }

        /// <summary>
        /// Checks whether the given element id is a start event.
        /// </summary>
        /// <param name="startEventId">The name of an element from the process.</param>
        /// <returns>True if the element is a start event.</returns>
        public bool IsStartEvent(string startEventId)
        {
            List<string> startEvents = Process.StartEvents();

            return startEvents.Contains(startEventId);
        }

        /// <summary>
        /// Checks whether the given element id is an end event.
        /// </summary>
        /// <param name="nextElementId">The name of an element from the process.</param>
        /// <returns>True if the element is an end event.</returns>
        public bool IsEndEvent(string nextElementId)
        {
            List<string> endEvents = Process.EndEvents();

            return endEvents.Contains(nextElementId);
        }

        /// <summary>
        /// Validates that the process can start from the given start event.
        /// </summary>
        /// <param name="proposedStartEvent">The name of the start event the process should start from.</param>
        /// <param name="startEventError">Any error preventing the process from starting.</param>
        /// <returns>The name of the start event or null if start event wasn't found.</returns>
        public string GetValidStartEventOrError(string proposedStartEvent, out ProcessError startEventError)
        {
            startEventError = null;

            List<string> possibleStartEvents = Process.StartEvents();

            if (!string.IsNullOrEmpty(proposedStartEvent))
            {
                if (possibleStartEvents.Contains(proposedStartEvent))
                {
                    return proposedStartEvent;
                }
                else
                {
                    startEventError = Conflict($"There is no such start event as '{proposedStartEvent}' in the process definition.");
                    return null;
                }
            }

            if (possibleStartEvents.Count == 1)
            {
                return possibleStartEvents.First();
            }
            else if (possibleStartEvents.Count > 1)
            {
                startEventError = Conflict($"There are more than one start events available. Chose one: {possibleStartEvents}");
                return null;
            }
            else
            {
                startEventError = Conflict($"There is no start events in process definition. Cannot start process!");
                return null;
            }
        }

        /// <summary>
        /// Validates that the given element name is a valid next step in the process.
        /// </summary>
        /// <param name="currentElementId">The current element name.</param>
        /// <param name="proposedElementId">The name of the proposed next element.</param>
        /// <param name="nextElementError">Any error preventing the logic to identify next element.</param>
        /// <returns>The name of the next element.</returns>
        public string GetValidNextElementOrError(string currentElementId, string proposedElementId, out ProcessError nextElementError)
        {
            nextElementError = null;
            bool ignoreGatewayDefaults = false;

            if (!string.IsNullOrEmpty(proposedElementId))
            {
                ignoreGatewayDefaults = true;
            }

            List<string> possibleNextElements = Process.NextElements(currentElementId, ignoreGatewayDefaults);

            if (!string.IsNullOrEmpty(proposedElementId))
            {
                if (possibleNextElements.Contains(proposedElementId))
                {
                    return proposedElementId;
                }
                else
                {
                    nextElementError = Conflict($"The proposed next element id '{proposedElementId}' is not among the available next process elements");
                    return null;
                }
            }

            if (possibleNextElements.Count == 1)
            {
                return possibleNextElements.First();
            }

            if (possibleNextElements.Count > 1)
            {
                nextElementError = Conflict($"There are more than one outgoing sequence flows, please select one '{possibleNextElements}'");
                return null;
            }

            if (possibleNextElements.Count == 0)
            {
                nextElementError = Conflict($"There are no outoging sequence flows from current element. Cannot find next process element. Error in bpmn file!");
                return null;
            }

            return null;
        }

        /// <summary>
        /// Find the flowtype betweeend 
        /// </summary>
        public ProcessSequenceFlowType GetSequenceFlowType(string currentId, string nextElementId)
        {
            List<SequenceFlow> flows = Process.GetSequenceFlowsBetween(currentId, nextElementId);
            foreach (SequenceFlow flow in flows)
            { 
                if (!string.IsNullOrEmpty(flow.FlowType))
                {
                    ProcessSequenceFlowType flowType;
                    if (Enum.TryParse(flow.FlowType, out flowType))
                    {
                        return flowType;
                    }
                }
            }

            return ProcessSequenceFlowType.CompleteCurrentMoveToNext;
        }

        private ProcessError Conflict(string text)
        {
            return new ProcessError
            {
                Code = "Conflict",
                Text = text
            };
        }
    }
}
