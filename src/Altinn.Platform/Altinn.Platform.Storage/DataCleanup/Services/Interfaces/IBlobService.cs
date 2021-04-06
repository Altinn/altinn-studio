using System.Threading.Tasks;

using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Storage.DataCleanup.Services
{
    /// <summary>
    ///  Interface for handling interaction with data blobs
    /// </summary>
    public interface IBlobService
    {
        /// <summary>
        /// Deletes all the data blobs related to the instance.
        /// </summary>
        public Task<bool> DeleteDataBlobs(Instance instance);

        /// <summary>
        /// Deletes the backup of the data elements for an instance.
        /// </summary>
        public Task<bool> DeleteDataBackup(string instanceGuid);

        /// <summary>
        /// Deletes the backup of the metadata for an instance.
        /// </summary>
        public Task<bool> DeleteInstanceBackup(string instanceOwnerPartyId, string instanceGuid);

        /// <summary>
        /// Deletes the backup of the instance events of an instance.
        /// </summary>
        public Task<bool> DeleteInstanceEventsBackup(string instanceOwnerPartyId, string instanceGuid);
    }
}
