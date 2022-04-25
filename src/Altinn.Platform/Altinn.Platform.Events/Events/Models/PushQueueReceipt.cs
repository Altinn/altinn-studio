using System;

namespace Altinn.Platform.Events.Models
{
    /// <summary>
    /// Object to hold the receipt for a push queue action.
    /// </summary>
    public class PushQueueReceipt
    {
        /// <summary>
        /// Boolean to indicate if the push was successful.
        /// </summary>
        public bool Success { get; set; }

        /// <summary>
        /// Exception. Only populated if the push failed.
        /// </summary>
        public Exception Exception { get; set; }
    }
}
