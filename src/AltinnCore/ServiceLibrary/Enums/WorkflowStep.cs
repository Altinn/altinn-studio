using System;
using System.Collections.Generic;
using System.Text;

namespace AltinnCore.ServiceLibrary.Enums
{
    /// <summary>
    /// Enumeration for all available workflow steps
    /// </summary>
    public enum WorkflowStep
    {
        /// <summary>
        /// Step is unknown
        /// </summary>
        Unknown = 0,

        /// <summary>
        /// Form filling step
        /// </summary>
        FormFilling = 1,

        /// <summary>
        /// Submit step
        /// </summary>
        Submit = 2,

        /// <summary>
        /// Archived step
        /// </summary>
        Archived = 3,
    }
}
