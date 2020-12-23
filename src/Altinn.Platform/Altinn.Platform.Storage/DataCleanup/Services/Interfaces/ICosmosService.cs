using System.Collections.Generic;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Storage.DataCleanup.Services
{
    /// <summary>
    ///  Interface for handling interactions with Cosmos DB.
    /// </summary>
    public interface ICosmosService
    {
        /// <summary>
        /// Retrieves instances ready for permanent deletion.
        /// </summary>
        public Task<List<Instance>> GetHardDeletedInstances();

        /// <summary>
        /// Retrieves all instances for a given app.
        /// </summary>  
        public Task<List<Instance>> GetAllInstancesOfApp(string app);

        /// <summary>
        /// Retrieves a list of applications based on application ids.
        /// </summary>
        public Task<List<Application>> GetApplications(List<string> applicationIds);

        /// <summary>
        /// Deletes the instance document with the given data.
        /// </summary>
        public Task<bool> DeleteInstanceDocument(string instanceGuid, string instanceOwnerPartyId);

        /// <summary>
        /// Deletes the data element documents under the given instanceGuid.
        /// </summary>
        public Task<bool> DeleteDataElementDocuments(string instanceGuid);

        /// <summary>
        /// Deletes the instance event documents for the the given instance.
        /// </summary>
        public Task<bool> DeleteInstanceEventDocuments(string instanceGuid, string instanceOwnerPartyId);

        /// <summary>
        /// Retrieves all instances.
        /// </summary>
        public Task<InstanceList> GetAllInstances(string continuationToken);

        /// <summary>
        /// Gets all instances.
        /// </summary>     
        public Task<List<Instance>> GetInstancesForPartyId(int partyId);

        /// <summary>
        /// Gets all instances.
        /// </summary>     
        public Task<List<Instance>> GetInstancesForPartyAndAppIds(int partyId, List<string> appIds);

        /// <summary>
        /// Search all 
        /// </summary>
        /// <returns></returns>
        public Task<List<string>> SearchTextResources(string searchString);

        /// <summary>
        /// Search all 
        /// </summary>
        public Task<List<string>> SearchTextResources(string searchString, string language);

        /// <summary>
        /// Search subset
        /// </summary>
        public Task<List<string>> SearchTextResources(List<string> appIds, string searchString, string language);

        /// <summary>
        /// Update existing instance
        /// </summary>
        public Task<Instance> UpdateInstance(Instance item);
    }
}
