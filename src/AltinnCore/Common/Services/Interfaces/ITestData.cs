using System.Collections.Generic;
using AltinnCore.ServiceLibrary.Models;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for the test data service
    /// </summary>
    public interface ITestdata
    {
        /// <summary>
        /// Returns a list of test users defined
        /// </summary>
        /// <returns>List of test users</returns>
        List<Testdata> GetTestUsers();

        /// <summary>
        /// Returns a list of local form instances for a given partyId and serviceId
        /// </summary>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="org">The application owner</param>
        /// <param name="appName">The application name</param>
        /// <returns>List of form instances</returns>
        List<ServiceInstance> GetFormInstances(int instanceOwnerId, string org, string appName);

        /// <summary>
        /// Returns a list over local stored prefill for a given service
        /// </summary>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="org">The application owner</param>
        /// <param name="appName">The application name</param>
        /// <returns>List over prefill</returns>
        List<ServicePrefill> GetServicePrefill(int instanceOwnerId, string org, string appName);
    }
}
