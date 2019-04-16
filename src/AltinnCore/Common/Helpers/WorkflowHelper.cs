using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Xml.Serialization;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Workflow;
using Newtonsoft.Json.Linq;

namespace AltinnCore.Common.Helpers
{
    /// <summary>
    /// Helper for workflow
    /// </summary>
    public static class WorkflowHelper
    {
        /// <summary>
        /// gets the initial workflow state
        /// </summary>
        /// <param name="workflowData">the bpmn workflow</param>
        /// <returns></returns>
        public static ServiceState GetInitialWorkflowState(string workflowData)
        {
            Definitions workflowModel = null;

            XmlSerializer serializer = new XmlSerializer(typeof(Definitions));
            using (TextReader tr = new StringReader(workflowData))
            {
                workflowModel = (Definitions)serializer.Deserialize(tr);
            }

            string nextStepName = string.Empty;
            SequenceFlow currentSequenceFlow = workflowModel.Process.SequenceFlow.Find(seq => seq.Id == workflowModel.Process.StartEvent.Outgoing);
            if (currentSequenceFlow != null)
            {
                Task nextStepObj = workflowModel.Process.Task.Find(task => task.Id == currentSequenceFlow.TargetRef);
                if (nextStepObj != null)
                {
                    nextStepName = nextStepObj.Name;
                }
            }

            JObject stateJson = JObject.FromObject(new
            {
                state = nextStepName,
            });

            return new ServiceState()
            {
                State = string.IsNullOrEmpty(nextStepName) ?
            WorkflowStep.Unknown
            : (WorkflowStep)Enum.Parse(typeof(WorkflowStep), nextStepName, true),
            };
        }

        /// <summary>
        /// Gets the url for the current state
        /// </summary>
        /// <param name="instanceId">the instance id</param>
        /// <param name="applicationOwner">the application owner</param>
        /// <param name="applicationId">the application id</param>
        /// <param name="currentState">the current workflow state</param>
        /// <returns></returns>
        public static string GetUrlForCurrentState(Guid instanceId, string applicationOwner, string applicationId, WorkflowStep currentState)
        {
            switch (currentState)
            {
                case WorkflowStep.FormFilling:
                case WorkflowStep.Submit:
                case WorkflowStep.Archived:
                    return $"/runtime/{applicationOwner}/{applicationId}/{instanceId}/#Preview";
                default:
                    return $"/runtime/{applicationOwner}/{applicationId}/ManualTesting";
            }
        }
    }
}
