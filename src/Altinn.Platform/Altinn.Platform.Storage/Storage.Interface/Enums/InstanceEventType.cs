using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Platform.Storage.Interface.Enums
{
    /// <summary>
    /// This enum defines the Instance event types supported by the AltinnCore platform.
    /// </summary>
    public enum InstanceEventType 
    {
        /// <summary>
        /// Unkown instance event.
        /// </summary>
        None,

        /// <summary>
        /// Instance created event.
        /// </summary>
        Created,

        /// <summary>
        /// Instance saved event.
        /// </summary>
        Saved,

        /// <summary>
        /// Instance submited event.
        /// </summary>
        Submited,

        /// <summary>
        /// Instance deleted event.
        /// </summary>
        Deleted,

        /// <summary>
        /// Instance deleted event.
        /// </summary>
        Undeleted,

        /// <summary>
        /// Instance process start event.
        /// </summary>
        process_StartEvent,

        /// <summary>
        /// Instance process end event.
        /// </summary>
        process_EndEvent,

        /// <summary>
        /// Instance process task started event.
        /// </summary>
        process_StartTask,

        /// <summary>
        /// Instance process task ended event.
        /// </summary>
        process_EndTask
    }
}
