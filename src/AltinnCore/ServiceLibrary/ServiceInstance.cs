using System;

namespace AltinnCore.ServiceLibrary
{
    /// <summary>
    /// Class representing a service instance
    /// </summary>
    public class ServiceInstance
    {
        /// <summary>
        /// Gets or sets the ID of the service instance
        /// </summary>
        public int ServiceInstanceID { get; set; }

        /// <summary>
        /// Gets or sets when the service instance was last changed
        /// </summary>
        public DateTime LastChanged { get; set; }

        /// <summary>
        /// Gets or sets if service instance is archived
        /// </summary>
        public bool IsArchived { get; set; }
    }
}
