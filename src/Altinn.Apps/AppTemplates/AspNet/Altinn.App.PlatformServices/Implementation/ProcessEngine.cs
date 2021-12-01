using System;
using System.IO;
using System.Threading.Tasks;
using Altinn.App.Common.Process.Elements;
using Altinn.App.PlatformServices.Interface;
using Altinn.App.PlatformServices.Models;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Interface;

namespace Altinn.App.PlatformServices.Implementation
{
    /// <summary>
    /// The process engine is responsible for all BMPN related functionality
    ///
    /// It will call processChange handler that is responsible
    /// for the business logic happening for any process change.
    /// </summary>
    public class ProcessEngine : IProcessEngine
    {
        private IProcessChangeHandler _processChangeHandler;

        private readonly IProcess _processService;

        private readonly ProcessHelper processHelper;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProcessEngine"/> class.
        /// </summary>
        public ProcessEngine(
                IProcessChangeHandler processChangeHandler,
                IProcess processService)
        {
            _processService = processService;
            _processChangeHandler = processChangeHandler;
            using Stream bpmnStream = _processService.GetProcessDefinition();
            processHelper = new ProcessHelper(bpmnStream);
        }

        /// <summary>
        /// Move process to next element in process
        /// </summary>
        public Task<ProcessChangeContext> Next(ProcessChangeContext processChange)
        {
            ProcessStateChange change = _processService.ProcessNext(processChange.Instance, processChange.RequestedProcessElementId, processChange.Performer);
            processChange.OldProcessState = change.OldProcessState;
            processChange.NewProcessState = change.NewProcessState;
            processChange.Events = change.Events;
            return _processChangeHandler.HandleNext(processChange);
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
                return processChange;
            }

            string validStartElement = processHelper.GetValidStartEventOrError(processChange.RequestedProcessElementId, out ProcessError startEventError);
            if (startEventError != null)
            {
                processChange.ProcessMessages = new System.Collections.Generic.List<ProcessChangeInfo>();
                processChange.ProcessMessages.Add(new ProcessChangeInfo() { Message = "No matching startevent", Type = "Conflict" });
                return processChange;
            }

            processChange.ProcessFlowElements.Add(validStartElement);

            // find next task
            string nextValidElement = processHelper.GetValidNextElementOrError(validStartElement, out ProcessError nextElementError);
            if (nextElementError != null)
            {
                processChange.ProcessMessages = new System.Collections.Generic.List<ProcessChangeInfo>();
                processChange.ProcessMessages.Add(new ProcessChangeInfo() { Message = $"Unable to goto next element due to { nextElementError.Code}-{ nextElementError.Text}", Type = "Conflict" });
                return processChange;
            }

            processChange.ProcessFlowElements.Add(nextValidElement);

            return await _processChangeHandler.HandleStart(processChange);
        }

        /// <summary>
        /// Process Start Current task. The main goal is to trigger the Task related business logic seperate from start process
        /// </summary>
        public Task<ProcessChangeContext> StartTask(ProcessChangeContext processChange)
        {
            return _processChangeHandler.HandleStartTask(processChange);
        }
    }
}
