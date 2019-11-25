using System;

namespace Altinn.App.Services.ServiceMetadata
{
    /// <summary>
    /// Entity containing all details about a service package
    /// </summary>
    public class ServicePackageDetails
    {
        /// <summary>
        /// Gets or sets when this package was created
        /// </summary>
        public DateTime CreatedDateTime { get; set; }

        /// <summary>
        /// Gets or sets the organization this package belongs to
        /// </summary>
        public string Organization { get; set; }

        /// <summary>
        /// Gets or sets the service this package contains
        /// </summary>
        public string Service { get; set; }

        /// <summary>
        /// Gets or sets the assembly name within this package
        /// </summary>
        public string AssemblyName { get; set; }

        /// <summary>
        /// Gets or sets the package name
        /// </summary>
        public string PackageName { get; set; }
    }
}
