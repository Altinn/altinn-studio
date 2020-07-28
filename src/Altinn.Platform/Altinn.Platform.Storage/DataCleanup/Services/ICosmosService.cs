using System;
using System.Collections.Generic;
using System.Text;
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
        /// Deletes the instance document with the given data.
        /// </summary>
        public Task<bool> DeleteInstanceDocument(Guid instanceGuid, string instanceOwnerPartyId);

        /// <summary>
        /// Deletes the instance document with the given data.
        /// </summary>
        public Task<bool> DeleteDataElementDocuments(Guid instanceGuid);
    }
}
