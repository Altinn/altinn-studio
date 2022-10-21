using Altinn.App.Core.Helpers;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.Base;
using Altinn.App.Core.Models;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.App.Core.Internal.Process
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

        private readonly IProcessReader _processReader;
        private readonly IFlowHydration _flowHydration;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProcessEngine"/> class.
        /// </summary>
        public ProcessEngine(
                IProcessChangeHandler processChangeHandler,
                IProcessReader processReader,
                IFlowHydration flowHydration)
        {
            _processChangeHandler = processChangeHandler;
            _processReader = processReader;
            _flowHydration = flowHydration;
        }

        /// <summary>
        /// Move process to next element in process
        /// </summary>
        public async Task<ProcessChangeContext> Next(ProcessChangeContext processChange)
        {
            string? currentElementId = processChange.Instance.Process.CurrentTask?.ElementId;

            if (currentElementId == null)
            {
                processChange.ProcessMessages = new List<ProcessChangeInfo>();
                processChange.ProcessMessages.Add(new ProcessChangeInfo() { Message = $"Instance does not have current task information!", Type = "Conflict" });
                processChange.FailedProcessChange = true;
                return processChange;
            }

            if (currentElementId.Equals(processChange.RequestedProcessElementId))
            {
                processChange.ProcessMessages = new List<ProcessChangeInfo>();
                processChange.ProcessMessages.Add(new ProcessChangeInfo() { Message = $"Requested process element {processChange.RequestedProcessElementId} is same as instance's current task. Cannot change process.", Type = "Conflict" });
                processChange.FailedProcessChange = true;
                return processChange;
            }

             // Find next valid element. Later this will be dynamic
             List<ProcessElement> possibleNextElements = await _flowHydration.NextFollowAndFilterGateways(processChange.Instance, currentElementId, processChange.RequestedProcessElementId.IsNullOrEmpty());
            processChange.RequestedProcessElementId = ProcessHelper.GetValidNextElementOrError(processChange.RequestedProcessElementId, possibleNextElements.Select(e => e.Id).ToList(),out ProcessError? nextElementError);
            if (nextElementError != null)
            {
                processChange.ProcessMessages = new List<ProcessChangeInfo>();
                processChange.ProcessMessages.Add(new ProcessChangeInfo() { Message = nextElementError.Text, Type = "Conflict" });
                processChange.FailedProcessChange = true;
                return processChange;
            }

            List<SequenceFlow> flows = _processReader.GetSequenceFlowsBetween(currentElementId, processChange.RequestedProcessElementId);
            processChange.ProcessSequenceFlowType = ProcessHelper.GetSequenceFlowType(flows);

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
                processChange.ProcessMessages = new List<ProcessChangeInfo>();
                processChange.ProcessMessages.Add(new ProcessChangeInfo() { Message = "Process is already started. Use next.", Type = "Conflict" });
                processChange.FailedProcessChange = true;
                return processChange;
            }

            string? validStartElement = ProcessHelper.GetValidStartEventOrError(processChange.RequestedProcessElementId, _processReader.GetStartEventIds(),out ProcessError? startEventError);
            if (startEventError != null)
            {
                processChange.ProcessMessages = new List<ProcessChangeInfo>();
                processChange.ProcessMessages.Add(new ProcessChangeInfo() { Message = "No matching startevent", Type = "Conflict" });
                processChange.FailedProcessChange = true;
                return processChange;
            }

            processChange.ProcessFlowElements = new List<string>();
            processChange.ProcessFlowElements.Add(validStartElement!);

            // find next task
            List<ProcessElement> possibleNextElements = (await _flowHydration.NextFollowAndFilterGateways(processChange.Instance, validStartElement));
            string? nextValidElement = ProcessHelper.GetValidNextElementOrError(null, possibleNextElements.Select(e => e.Id).ToList(),out ProcessError? nextElementError);
            if (nextElementError != null)
            {
                processChange.ProcessMessages = new List<ProcessChangeInfo>();
                processChange.ProcessMessages.Add(new ProcessChangeInfo() { Message = $"Unable to goto next element due to {nextElementError.Code}-{nextElementError.Text}", Type = "Conflict" });
                processChange.FailedProcessChange = true;
                return processChange;
            }

            processChange.ProcessFlowElements.Add(nextValidElement!);

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
