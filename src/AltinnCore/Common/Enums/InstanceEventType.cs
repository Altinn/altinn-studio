using System;
using System.Collections.Generic;
using System.Text;

namespace AltinnCore.Common.Enums
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
        Deleted        
    }
}
