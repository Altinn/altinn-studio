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
        /// Deletes blob related to the dataElement.
        /// </summary>
        public Task<bool> DeleteDataBlob(DataElement dataElement);
    }
}
