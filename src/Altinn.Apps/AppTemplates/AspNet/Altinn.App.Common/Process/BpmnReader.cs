using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Xml.Serialization;

using Altinn.App.Common.Process.Elements;

namespace Altinn.App.Common.Process
{
    /// <summary>
    /// Represents an engine that can provide information about the next step in a process based on its definition and given task.
    /// </summary>
    public class BpmnReader
    {
        private readonly Definitions definitions;

        /// <summary>
        /// Initializes a new instance of the <see cref="BpmnReader"/> class with the provided process definitions.
        /// </summary>
        /// <param name="definitions">The workflow definitions to be used by this BPMN reader.</param>
        private BpmnReader(Definitions definitions)
        {
            this.definitions = definitions;
        }

        /// <summary>
        /// Creates a new <see cref="BpmnReader"/> instance by using the specified string.
        /// </summary>
        /// <param name="definitions">The string that contains the BPMN description.</param>
        /// <returns>An object that is used to read the BPMN data in the string.</returns>
        /// <exception cref="ArgumentNullException">The <paramref name="definitions"/> parameter is null.</exception>
        /// <exception cref="InvalidOperationException">
        /// An error occurred during deserialization. The original exception is available using the InnerException property.
        /// </exception>
        public static BpmnReader Create(string definitions)
        {
            XmlSerializer serializer = new XmlSerializer(typeof(Definitions));
            using TextReader tr = new StringReader(definitions);

            return new BpmnReader((Definitions)serializer.Deserialize(tr));
        }

        /// <summary>
        /// Creates a new <see cref="BpmnReader"/> instance by using the specified stream.
        /// </summary>
        /// <param name="definitions">The stream that contains the BPMN description.</param>
        /// <returns>An object that is used to read the BPMN data in the stream.</returns>
        /// <exception cref="InvalidOperationException">
        /// An error occurred during deserialization. The original exception is available using the InnerException property.
        /// </exception>
        public static BpmnReader Create(Stream definitions)
        {
            XmlSerializer serializer = new XmlSerializer(typeof(Definitions));
            return new BpmnReader((Definitions)serializer.Deserialize(definitions));
        }

        /// <summary>
        /// Retrieve information about an element in the BPMN by its id.
        /// </summary>
        /// <param name="elementId">The id to get information about.</param>
        /// <returns>Information about an element.</returns>
        /// <exception cref="ArgumentNullException">The <paramref name="elementId"/> parameter is null.</exception>
        public ElementInfo GetElementInfo(string elementId)
        {
            if (elementId == null)
            {
                throw new ArgumentNullException(nameof(elementId));
            }

            ProcessTask task = definitions.Process.Tasks.Find(t => t.Id == elementId);
            if (task != null)
            {
                return new ElementInfo { Id = task.Id, ElementType = "Task", Name = task.Name, AltinnTaskType = task.TaskType };
            }

            EndEvent endEvent = definitions.Process.EndEvents.Find(e => e.Id == elementId);
            if (endEvent != null)
            {
                return new ElementInfo { Id = endEvent.Id, ElementType = "EndEvent", Name = endEvent.Name };
            }

            StartEvent startEvent = definitions.Process.StartEvents.Find(e => e.Id == elementId);
            if (startEvent != null)
            {
                return new ElementInfo { Id = startEvent.Id, ElementType = "StartEvent", Name = startEvent.Name };
            }

            return null;
        }

        /// <summary>
        /// Identifies the step to follow the given step.
        /// </summary>
        /// <param name="elementId">The id of the current process element. Usually a task.</param>
        /// <param name="ignoreGatewayDefaults">Tell if code should ignore default sequence</param>
        /// <returns>The id of the next step.</returns>
        public List<string> NextElements(string elementId, bool ignoreGatewayDefaults = false)
        {
            if (elementId == null)
            {
                throw new ArgumentNullException(nameof(elementId));
            }

            List<string> elementIds = new List<string>();

            string currentStepId = null;
            ProcessTask currentTask = definitions.Process.Tasks.Find(task => task.Id == elementId);
            if (currentTask != null)
            {
                currentStepId = currentTask.Id;
            }

            if (currentStepId == null)
            {
                StartEvent startEvent = definitions.Process.StartEvents.Find(se => se.Id == elementId);
                if (startEvent != null)
                {
                    currentStepId = startEvent.Id;
                }
            }

            if (currentStepId == null)
            {
                throw new ProcessException($"Unable to find a start event or task using element id {elementId}.");
            }

            foreach (SequenceFlow sequenceFlow in definitions.Process.SequenceFlow.FindAll(s => s.SourceRef == currentStepId))
            {
                if (AddExclusiveGateways(ignoreGatewayDefaults, elementIds, sequenceFlow))
                {
                    continue;
                }

                ProcessTask task = definitions.Process.Tasks.Find(t => t.Id == sequenceFlow.TargetRef);
                if (task != null)
                {
                    elementIds.Add(task.Id);
                    continue;
                }

                EndEvent endEvent = definitions.Process.EndEvents.Find(e => e.Id == sequenceFlow.TargetRef);
                if (endEvent != null)
                {
                    elementIds.Add(endEvent.Id);
                    continue;
                }
            }

            return elementIds;
        }

        /// <summary>
        /// Returns a list of sequence flow to be followed between current step and next element
        /// </summary>
        public List<SequenceFlow> GetSequenceFlowsBetween(string currentStepId, string nextElementId)
        {
            List<SequenceFlow> flowsToReachTarget = new List<SequenceFlow>();
            foreach (SequenceFlow sequenceFlow in definitions.Process.SequenceFlow.FindAll(s => s.SourceRef == currentStepId))
            {
                if (sequenceFlow.TargetRef.Equals(nextElementId))
                {
                    flowsToReachTarget.Add(sequenceFlow);
                    return flowsToReachTarget;
                }

                if (definitions.Process.ExclusiveGateway != null && definitions.Process.ExclusiveGateway.FirstOrDefault(g => g.Id == sequenceFlow.TargetRef) != null)
                {
                    List<SequenceFlow> subGatewayFlows = GetSequenceFlowsBetween(sequenceFlow.TargetRef, nextElementId);
                    if (subGatewayFlows.Any())
                    {
                        flowsToReachTarget.Add(sequenceFlow);
                        flowsToReachTarget.AddRange(subGatewayFlows);
                        return flowsToReachTarget;
                    }
                }
            }

            return flowsToReachTarget;
        }

        private List<string> GetElementsFromGateway(string gatewayId, string defaultSequence, bool ignoreGatewayDefaults)
        {
            List<string> elementIds = new List<string>();

            foreach (SequenceFlow sequenceFlow in definitions.Process.SequenceFlow.FindAll(s => s.SourceRef == gatewayId))
            {
                if (!ignoreGatewayDefaults && !string.IsNullOrEmpty(defaultSequence) && !defaultSequence.Equals(sequenceFlow.Id))
                {
                    continue;
                }

                if (AddExclusiveGateways(ignoreGatewayDefaults, elementIds, sequenceFlow))
                {
                    continue;
                }

                ProcessTask task = definitions.Process.Tasks.Find(t => t.Id == sequenceFlow.TargetRef);
                if (task != null)
                {
                    elementIds.Add(task.Id);
                    continue;
                }

                EndEvent endEvent = definitions.Process.EndEvents.Find(e => e.Id == sequenceFlow.TargetRef);
                if (endEvent != null)
                {
                    elementIds.Add(endEvent.Id);
                }
            }

            return elementIds;
        }

        private bool AddExclusiveGateways(bool ignoreGatewayDefaults, List<string> elementIds, SequenceFlow sequenceFlow)
        {
            ExclusiveGateway exclusiveGateway = definitions.Process.ExclusiveGateway.Find(g => g.Id == sequenceFlow.TargetRef);
            if (exclusiveGateway != null)
            {
                List<string> gateWayElements = GetElementsFromGateway(exclusiveGateway.Id, exclusiveGateway.Default, ignoreGatewayDefaults);
                if (gateWayElements != null)
                {
                    elementIds.AddRange(gateWayElements);
                    return true;
                }
            }

            return false;
        }

        /// <summary>
        /// Identifies the first task in the process. 
        /// </summary>
        /// <returns>The first task in the process</returns>
        public string GetStartElementId()
        {
            if (definitions.Process.StartEvents.Count != 1)
            {
                throw new ProcessException("The number of start events are different from one. Unable to identify the correct start.");
            }

            SequenceFlow currentSequenceFlow = definitions.Process.SequenceFlow.Find(seq => seq.Id == definitions.Process.StartEvents[0].Outgoing);
            if (currentSequenceFlow != null)
            {
                ProcessTask nextStepObj = definitions.Process.Tasks.Find(task => task.Id == currentSequenceFlow.TargetRef);
                if (nextStepObj != null)
                {
                    return nextStepObj.Id;
                }
            }

            return string.Empty;
        }

        /// <summary>
        /// Get a list of all start events.
        /// </summary>
        /// <returns>All defined start events.</returns>
        public List<string> StartEvents()
        {
            return definitions.Process.StartEvents.Select(s => s.Id).ToList();
        }

        /// <summary>
        /// Get a list of all tasks.
        /// </summary>
        /// <returns>All defined tasks.</returns>
        public List<string> Tasks()
        {
            return definitions.Process.Tasks.Select(s => s.Id).ToList();
        }

        /// <summary>
        /// Get a list of all start events.
        /// </summary>
        /// <returns>All defined end events.</returns>
        public List<string> EndEvents()
        {
            return definitions.Process.EndEvents.Select(s => s.Id).ToList();
        }
    }
}
