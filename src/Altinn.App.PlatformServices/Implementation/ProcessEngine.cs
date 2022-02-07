using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.App.Common.Process;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Models;
using Altinn.App.PlatformServices.Models;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Interface;

namespace Altinn.App.Core.Implementation
{
    /// <summary>
    /// The process engine is responsible for all BMPN related functionality
    ///
    /// It will call processChange handler that is responsible
    /// for the business logic happening for any process change.
    /// </summary>
    public class ProcessEngine : IProcessEngine
    {
        private readonly IProcessChangeHandler _processChangeHandler;

        private readonly ProcessHelper processHelper;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProcessEngine"/> class.
        /// </summary>
        public ProcessEngine(
                IProcessChangeHandler processChangeHandler,
                IProcess processService)
        {
            _processChangeHandler = processChangeHandler;
            using Stream bpmnStream = processService.GetProcessDefinition();
            processHelper = new ProcessHelper(bpmnStream);
        }

        /// <summary>
        /// Move process to next element in process
        /// </summary>
        public async Task<ProcessChangeContext> Next(ProcessChangeContext processChange)
        {
            string currentElementId = processChange.Instance.Process.CurrentTask?.ElementId;

            if (currentElementId == null)
            {
                processChange.ProcessMessages = new System.Collections.Generic.List<ProcessChangeInfo>();
                processChange.ProcessMessages.Add(new ProcessChangeInfo() { Message = $"Instance does not have current task information!", Type = "Conflict" });
                processChange.FailedProcessChange = true;
                return processChange;
            }

            if (currentElementId.Equals(processChange.RequestedProcessElementId))
            {
                processChange.ProcessMessages = new System.Collections.Generic.List<ProcessChangeInfo>();
                processChange.ProcessMessages.Add(new ProcessChangeInfo() { Message = $"Requested process element {processChange.RequestedProcessElementId} is same as instance's current task. Cannot change process.", Type = "Conflict" });
                processChange.FailedProcessChange = true;
                return processChange;
            }

             // Find next valid element. Later this will be dynamic
            processChange.RequestedProcessElementId = processHelper.GetValidNextElementOrError(currentElementId, processChange.RequestedProcessElementId, out ProcessError nextElementError);
            if (nextElementError != null)
            {
                processChange.ProcessMessages = new System.Collections.Generic.List<ProcessChangeInfo>();
                processChange.ProcessMessages.Add(new ProcessChangeInfo() { Message = nextElementError.Text, Type = "Conflict" });
                processChange.FailedProcessChange = true;
                return processChange;
            }

            processChange.ProcessSequenceFlowType = processHelper.GetSequenceFlowType(currentElementId, processChange.RequestedProcessElementId);

            if (processChange.ProcessSequenceFlowType.Equals(ProcessSequenceFlowType.CompleteCurrentMoveToNext) && await _processChangeHandler.CanTaskBeEnded(processChange))
            {
                return await _processChangeHandler.HandleMoveToNext(processChange);
            }

            if (processChange.ProcessSequenceFlowType.Equals(ProcessSequenceFlowType.AbandonCurrentReturnToNext))
            {
                return await _processChangeHandler.HandleMoveToNext(processChange);
            }

            processChange.FailedProcessChange = true;
            processChange.ProcessMessages = new List<ProcessChangeInfo>();
            processChange.ProcessMessages.Add(new ProcessChangeInfo() { Message = $"Cannot complete/close current task {currentElementId}. The data element(s) assigned to the task are not valid!", Type = "conflict" });
            return processChange;
        }

        /// <summary>
        /// Start application process and goes to first valid Task
        /// </summary>
        public async Task<ProcessChangeContext> StartProcess(ProcessChangeContext processChange)
        {
            if (processChange.Instance.Process != null)
            {
                processChange.ProcessMessages = new System.Collections.Generic.List<ProcessChangeInfo>();
                processChange.ProcessMessages.Add(new ProcessChangeInfo() { Message = "Process is already started. Use next.", Type = "Conflict" });
                processChange.FailedProcessChange = true;
                return processChange;
            }

            string validStartElement = processHelper.GetValidStartEventOrError(processChange.RequestedProcessElementId, out ProcessError startEventError);
            if (startEventError != null)
            {
                processChange.ProcessMessages = new System.Collections.Generic.List<ProcessChangeInfo>();
                processChange.ProcessMessages.Add(new ProcessChangeInfo() { Message = "No matching startevent", Type = "Conflict" });
                processChange.FailedProcessChange = true;
                return processChange;
            }

            processChange.ProcessFlowElements = new List<string>();
            processChange.ProcessFlowElements.Add(validStartElement);

            // find next task
            string nextValidElement = processHelper.GetValidNextElementOrError(validStartElement, out ProcessError nextElementError);
            if (nextElementError != null)
            {
                processChange.ProcessMessages = new System.Collections.Generic.List<ProcessChangeInfo>();
                processChange.ProcessMessages.Add(new ProcessChangeInfo() { Message = $"Unable to goto next element due to {nextElementError.Code}-{nextElementError.Text}", Type = "Conflict" });
                processChange.FailedProcessChange = true;
                return processChange;
            }

            processChange.ProcessFlowElements.Add(nextValidElement);

            return await _processChangeHandler.HandleStart(processChange);
        }

        /// <summary>
        /// Process Start Current task. The main goal is to trigger the Task related business logic seperate from start process
        /// </summary>
        public async Task<ProcessChangeContext> StartTask(ProcessChangeContext processChange)
        {
            return await _processChangeHandler.HandleStartTask(processChange);
        }
    }
}
