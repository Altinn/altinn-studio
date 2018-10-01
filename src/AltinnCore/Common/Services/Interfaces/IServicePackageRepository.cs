using System.Collections.Generic;
using System.IO.Compression;

using AltinnCore.ServiceLibrary.ServiceMetadata;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// The ServicePackageRepository interface.
    /// </summary>
    public interface IServicePackageRepository
    {
        /// <summary>
        /// Gets all service packages for the given service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>A list of all the service package details for the given service</returns>
        IList<ServicePackageDetails> GetServicePackages(string org, string service, string edition);

        /// <summary>
        /// The get zip archive.
        /// </summary>
        /// <param name="servicePackageDetails">
        /// The service package details. Expect PackageName to be the file name.
        /// </param>
        /// <returns>
        /// The <see cref="ZipArchive"/>.
        /// </returns>
        ZipArchive GetZipArchive(ServicePackageDetails servicePackageDetails);
    }
}
