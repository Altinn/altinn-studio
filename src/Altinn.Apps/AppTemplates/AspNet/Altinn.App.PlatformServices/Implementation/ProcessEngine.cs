using System;
using System.Threading.Tasks;
using Altinn.App.Common.Process.Elements;
using Altinn.App.PlatformServices.Interface;
using Altinn.App.PlatformServices.Models;
using Altinn.App.Services.Interface;

namespace Altinn.App.PlatformServices.Implementation
{
    /// <summary>
    /// The process engine
    /// </summary>
    public class ProcessEngine : IProcessEngine
    {
        private IProcessChangeHandler _processChangeHandler;

        private readonly IProcess _processService;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProcessEngine"/> class.
        /// </summary>
        public ProcessEngine(
                IProcessChangeHandler processChangeHandler,
                IProcess processService)
        {
            _processService = processService;
            _processChangeHandler = processChangeHandler;
        }

        /// <summary>
        /// Move process to next element in process
        /// </summary>
        public Task<ProcessChange> Next(ProcessChange processChange)
        {
            ProcessStateChange change = _processService.ProcessNext(processChange.Instance, processChange.RequestedProcessElementId, processChange.Performer);
            processChange.OldProcessState = change.OldProcessState;
            processChange.NewProcessState = change.NewProcessState;
            return _processChangeHandler.HandleNext(processChange);
        }

        /// <summary>
        /// Start process
        /// </summary>
        public Task<ProcessChange> StartProcess(ProcessChange processChange)
        {
            ProcessStateChange change = _processService.ProcessStart(processChange.Instance, processChange.RequestedProcessElementId, processChange.Performer);

            // TODO. Add BPMN logic that verifies input and trigger start of process
            return _processChangeHandler.HandleStart(processChange);
        }

        /// <summary>
        /// Process Start Task
        /// </summary>
        public Task<ProcessChange> StartTask(ProcessChange processChange)
        {
            return _processChangeHandler.HandleStart(processChange);
        }
    }
}
