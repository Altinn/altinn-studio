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
        /// Gets all <see cref="ServicePackageDetails"/> for the given app
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A list of all the <see cref="ServicePackageDetails"/> for the given app</returns>
        IList<ServicePackageDetails> GetServicePackages(string org, string app);
    }
}
