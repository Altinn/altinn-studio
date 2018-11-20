using System.Collections.Generic;
using AltinnCore.ServiceLibrary;

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
        /// <param name="partyId">The partyId</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="developer">The developer for the current service if any</param>
        /// <returns>List of form instances</returns>
        List<ServiceInstance> GetFormInstances(int partyId, string org, string service, string developer = null);

        /// <summary>
        /// Returns a list over local stored prefill for a given service
        /// </summary>
        /// <param name="partyId">The partyId for the test reportee</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="developer">The developer for the current service if any</param>
        /// <returns>List over prefill</returns>
        List<ServicePrefill> GetServicePrefill(int partyId, string org, string service, string developer = null);
    }
}
