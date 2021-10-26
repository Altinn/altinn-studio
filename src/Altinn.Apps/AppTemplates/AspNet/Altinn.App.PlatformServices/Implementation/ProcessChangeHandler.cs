using System.Threading.Tasks;
using Altinn.App.PlatformServices.Interface;
using Altinn.App.PlatformServices.Models;

namespace Altinn.App.PlatformServices.Implementation
{
    /// <summary>
    /// Handler that implements needed logic related to different process changes. Identifies the correct types of tasks
    /// </summary>
    public class ProcessChangeHandler : IProcessChangeHandler
    {
        /// <inheritdoc />
        public Task<ProcessChangeContext> HandleNext(ProcessChangeContext processChange)
        {
            return Task.FromResult(processChange);
        }

        /// <inheritdoc />
        public Task<ProcessChangeContext> HandleStart(ProcessChangeContext processChange)
        {
            return Task.FromResult(processChange);
        }

        /// <inheritdoc />
        public Task<ProcessChangeContext> HandleStartTask(ProcessChangeContext processChange)
        {
            return Task.FromResult(processChange);
        }
    }
}
