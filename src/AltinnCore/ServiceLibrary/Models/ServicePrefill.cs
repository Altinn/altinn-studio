using System;

namespace AltinnCore.ServiceLibrary.Models
{
    /// <summary>
    /// Class describing prefill for a service
    /// </summary>
    public class ServicePrefill
    {
        /// <summary>
        /// Gets or sets the key to this prefill
        /// </summary>
        public string PrefillKey { get; set; }

        /// <summary>
        /// Gets or sets when the prefill was last changed
        /// </summary>
        public DateTime LastChanged { get; set; }
    }
}
