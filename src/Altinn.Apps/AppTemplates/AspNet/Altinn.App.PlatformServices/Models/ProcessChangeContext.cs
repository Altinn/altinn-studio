using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Altinn.App.Common.Process;
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
        /// The process flow
        /// </summary>
        public List<string> ProcessFlowElements { get; set; } = new List<string>();

        /// <summary>
        /// Information messages
        /// </summary>
        public List<ProcessChangeInfo> ProcessMessages { get; set; }

        /// <summary>
        /// Did process change fail?
        /// </summary>
        public bool FailedProcessChange { get; set; }

        /// <summary>
        /// The identity performing the process change
        /// </summary>
        public ClaimsPrincipal User { get; set; }

        /// <summary>
        /// ProcessStateChange
        /// </summary>
        public ProcessStateChange ProcessStateChange { get; set; }

        /// <summary>
        /// The current process element to be processed
        /// </summary>
        public string ElementToBeProcessed { get; set; }

        /// <summary>
        /// Process prefill
        /// </summary>
        public Dictionary<string, string> Prefill { get; set; }

        /// <summary>
        /// The ProcessSequenceFlowType
        /// </summary>
        public ProcessSequenceFlowType ProcessSequenceFlowType { get; set; }
    }
}
