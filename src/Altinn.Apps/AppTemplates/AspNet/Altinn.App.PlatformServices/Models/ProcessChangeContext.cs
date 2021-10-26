using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Altinn.App.Common.Process.Elements;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.PlatformServices.Models
{
    /// <summary>
    /// Data entity that will floow between Process Api, Process Engine, Process Handlers and the TaskImpl/Gateway implt
    /// </summary>
    public class ProcessChangeContext
    {
        /// <summary>
        /// The current instance
        /// </summary>
        public Instance Instance { get; set; }

        /// <summary>
        /// The request process element Id
        /// </summary>
        public string RequestedProcessElementId { get; set; }

        /// <summary>
        /// Information messages
        /// </summary>
        public List<ProcessChangeInfo> ProcessMessages { get; set; }

        /// <summary>
        /// The BPMN process
        /// </summary>
        public Process Process { get; set; }

        /// <summary>
        /// The performer triggering the ProcessChange
        /// </summary>
        public ClaimsPrincipal Performer { get; set; }

        /// <summary>
        /// Gets or sets the old process state
        /// </summary>
        public ProcessState OldProcessState { get; set; }

        /// <summary>
        /// Gets or sets the new process state
        /// </summary>
        public ProcessState NewProcessState { get; set; }

        /// <summary>
        /// Instances events created relate to process change
        /// </summary>
        public List<InstanceEvent> Events { get; set; }
    }
}
