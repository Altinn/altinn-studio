using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.App.PlatformServices.Models;

namespace Altinn.App.PlatformServices.Process
{
    /// <summary>
    /// Interface desbring the basic task
    /// </summary>
    public interface ITask
    {
        /// <summary>
        /// This operations triggers process logic needed to start the current task. The logic depend on the different types of task
        /// </summary>
        Task HandleTaskStart(ProcessChangeContext prosessChangeContext);

        /// <summary>
        /// This operatin triggers process logic need to complete a given task. The Logic depend on the different types of task.
        /// </summary>
        Task HandleTaskComplete(ProcessChangeContext processChangeContext);
    }
}
