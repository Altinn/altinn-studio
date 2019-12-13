using Altinn.App.Common.Process;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace Altinn.App.Services.Helpers
{
    public class ProcessHelper
    {
        private readonly BpmnReader _process;

        public ProcessHelper(Stream bpmnStream)
        {
            _process = BpmnReader.Create(bpmnStream);
        }

        public BpmnReader Process 
        {
            get
            {
                return _process;
            }                
        }

        public string GetValidNextElementOrError(string currentElement, out ProcessError nextElementError)
        {
            nextElementError = null;
            string nextElementId = null;

            List<string> nextElements = _process.NextElements(currentElement);

            if (nextElements.Count > 1)
            {
                nextElementError = new ProcessError
                {
                    Code = "Conflict",
                    Text = ($"There is more than one element reachable from element {currentElement}")
                };
            }
            else
            {
                nextElementId = nextElements.First();
            }

            return nextElementId;
        }

        public bool IsTask(string nextElementId)
        {
            List<string> tasks = Process.Tasks();
            return tasks.Contains(nextElementId);
        }

        public bool IsStartEvent(string startEventId)
        {
            List<string> startEvents = Process.StartEvents();

            return startEvents.Contains(startEventId);
        }

        public bool IsEndEvent(string nextElementId)
        {
            List<string> endEvents = Process.EndEvents();

            return endEvents.Contains(nextElementId);
        }

        public string GetValidStartEventOrError(string proposedStartEvent, out ProcessError startEventError)
        {
            startEventError = null;

            List<string> possibleStartEvents = _process.StartEvents();

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

        public string GetValidNextElementOrError(string currentElementId, string proposedElementId, out ProcessError nextElementError)
        {
            nextElementError = null;

            List<string> possibleNextElements = _process.NextElements(currentElementId);

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
