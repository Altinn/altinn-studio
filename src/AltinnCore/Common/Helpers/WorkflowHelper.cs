using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Xml.Serialization;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models.Workflow;
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
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="currentState">the current workflow state</param>
        /// <returns></returns>
        public static string GetUrlForCurrentState(Guid instanceId, string org, string app, WorkflowStep currentState)
        {
            switch (currentState)
            {
                case WorkflowStep.FormFilling:
                case WorkflowStep.Submit:
                case WorkflowStep.Archived:
                    return $"/{org}/{app}/#/instance/{instanceId}";
                default:
                    // TODO: figure out what should be here and update.
                    return $"/designer/{org}/{app}/ManualTesting";
            }
        }

        /// <summary>
        /// Updates the current state for the workflow
        /// </summary>
        /// <param name="workflowData">the workflow for the application</param>
        /// <param name="currentState">the current workflow state</param>
        /// <returns>the next state in workflow</returns>
        public static ServiceState UpdateCurrentState(string workflowData, ServiceState currentState)
        {
            Definitions workflowModel = null;

            XmlSerializer serializer = new XmlSerializer(typeof(Definitions));
            using (TextReader tr = new StringReader(workflowData))
            {
                workflowModel = (Definitions)serializer.Deserialize(tr);
            }

            string nextStepName = string.Empty;
            Task currentTask = workflowModel.Process.Task.Find(task => task.Name == currentState.State.ToString());
            if (currentTask != null)
            {
                SequenceFlow currentSequenceFlow = workflowModel.Process.SequenceFlow.Find(seq => seq.SourceRef == currentTask.Id);
                if (currentSequenceFlow != null)
                {
                    Task nextStepObj = workflowModel.Process.Task.Find(task => task.Id == currentSequenceFlow.TargetRef);
                    if (nextStepObj != null)
                    {
                        nextStepName = nextStepObj.Name;
                    }
                    else if (workflowModel.Process.EndEvent.Id == currentSequenceFlow.TargetRef)
                    {
                        nextStepName = WorkflowStep.Archived.ToString();
                    }
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
    }
}
