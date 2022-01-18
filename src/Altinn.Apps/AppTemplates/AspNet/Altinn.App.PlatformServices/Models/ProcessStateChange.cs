using System.Collections.Generic;

using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Models
{
    /// <summary>
    /// Represents a change in process state for an instance.
    /// </summary>
    public class ProcessStateChange
    {
        /// <summary>
        /// Gets or sets the old process state
        /// </summary>
        public ProcessState OldProcessState { get; set; }

        /// <summary>
        /// Gets or sets the new process state
        /// </summary>
        public ProcessState NewProcessState { get; set; }

        /// <summary>
        /// Gets or sets a list of events to be registered.
        /// </summary>
        public List<InstanceEvent> Events { get; set; }
    }
}
