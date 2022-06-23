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
        /// Retrieves data elements ready for permanent deletion.
        /// </summary>
        public Task<List<DataElement>> GetHardDeletedDataElements();

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
        public Task<bool> DeleteInstanceDocument(string instanceOwnerPartyId, string instanceGuid);

        /// <summary>
        /// Deletes the data element documents under the given instanceGuid.
        /// </summary>
        public Task<bool> DeleteDataElementDocuments(string instanceGuid);

        /// <summary>
        /// Deletes the data element document for the given selfLink.
        /// </summary>
        public Task DeleteDataElementDocument(string instanceGuid, string selfLink);

        /// <summary>
        /// Deletes the instance event documents for the the given instance.
        /// </summary>
        public Task<bool> DeleteInstanceEventDocuments(string instanceOwnerPartyId, string instanceGuid);
    }
}
