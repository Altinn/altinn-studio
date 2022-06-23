using System.Threading.Tasks;

namespace Altinn.Platform.Storage.DataCleanup.Services
{
    /// <summary>
    ///  Interface for handling interaction with backup data blobs
    /// </summary>
    public interface IBackupBlobService
    {
        /// <summary>
        /// Deletes the backup of the data elements for an instance.
        /// </summary>
        public Task<bool> DeleteDataBackup(string instanceGuid);

        /// <summary>
        /// Deletes the backup of a data element.
        /// </summary>
        public Task<bool> DeleteDataElementBackup(string itemName);

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
