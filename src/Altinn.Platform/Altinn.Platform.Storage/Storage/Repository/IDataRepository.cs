using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Storage.Repository
{
    /// <summary>
    /// Describes the implementation of a data element storage. 
    /// </summary>
    public interface IDataRepository
    {
        /// <summary>
        /// Create a new file in blob storage.
        /// </summary>
        /// <param name="org">The application owner id.</param>
        /// <param name="stream">Data to be written to blob storage.</param>
        /// <param name="blobStoragePath">Path to save the stream to in blob storage.</param>
        /// <returns>The size of the blob.</returns>
        Task<long> WriteDataToStorage(string org, Stream stream, string blobStoragePath);

        /// <summary>
        /// Reads a data file from blob storage
        /// </summary>
        /// <param name="org">The application owner id.</param>
        /// <param name="blobStoragePath">Path to be file to read blob storage.</param>
        /// <returns>The stream with the file</returns>
        Task<Stream> ReadDataFromStorage(string org, string blobStoragePath);

        /// <summary>
        /// Deletes the data element permanently
        /// </summary>
        /// <param name="org">The application owner id.</param>
        /// <param name="blobStoragePath">Path to the file to delete.</param>
        /// <returns>A value indicating whether the delete was successful.</returns>
        Task<bool> DeleteDataInStorage(string org, string blobStoragePath);

        /// <summary>
        /// Gets all data elements for a given instance
        /// </summary>
        /// <param name="instanceGuid">the guid of the instance</param>
        /// <returns>list of data elements</returns>
        Task<List<DataElement>> ReadAll(Guid instanceGuid);

        /// <summary>
        /// Creates a dataElement into the repository
        /// </summary>
        /// <param name="dataElement">the data element to insert</param>
        /// <returns>the data element with updated id</returns>
        Task<DataElement> Create(DataElement dataElement);

        /// <summary>
        /// Reads a data element metadata object. Not the actual data.
        /// </summary>
        /// <param name="instanceGuid">the instance guid as partitionKey</param>
        /// <param name="dataElementId">The data element guid</param>
        /// <returns>The identified data element.</returns>
        Task<DataElement> Read(Guid instanceGuid, Guid dataElementId);

        /// <summary>
        /// Updates a data element. 
        /// </summary>
        /// <param name="dataElement">The data element to update. Dataelement must have instanceGuid set!</param>
        /// <returns>The updated data element</returns>
        Task<DataElement> Update(DataElement dataElement);

        /// <summary>
        /// Deletes the data element metadata object permanently!
        /// </summary>
        /// <param name="dataElement">the element to delete</param>
        /// <returns>true if delete went well.</returns>
        Task<bool> Delete(DataElement dataElement);
    }
}
