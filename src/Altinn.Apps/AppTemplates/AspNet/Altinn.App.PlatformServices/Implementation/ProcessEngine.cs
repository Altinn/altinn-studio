using System;
using System.Threading.Tasks;
using Altinn.App.Common.Process.Elements;
using Altinn.App.PlatformServices.Interface;
using Altinn.App.PlatformServices.Models;
using Altinn.App.Services.Interface;

namespace Altinn.App.PlatformServices.Implementation
{
    /// <summary>
    /// The process engine is responsible for handeling the BMPN process. It will call processChange handler that is responsible
    /// for the business logic happening for any process change. 
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
        public Task<ProcessChangeContext> StartProcess(ProcessChangeContext processChange)
        {
            ProcessStateChange change = _processService.ProcessStartAndGotoNextTask(processChange.Instance, processChange.RequestedProcessElementId, processChange.Performer);
            processChange.NewProcessState = change.NewProcessState;
            processChange.Events = change.Events;
            return _processChangeHandler.HandleStart(processChange);
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
