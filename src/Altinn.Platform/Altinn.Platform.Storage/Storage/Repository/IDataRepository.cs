using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Storage.Repository
{
    /// <summary>
    /// the interface contains methods for operations on form data document
    /// </summary>
    public interface IDataRepository
    {
        /// <summary>
        /// Gets or Sets the data context for a current request
        /// </summary>
        OrgDataContext OrgDataContext { get; set; }

        /// <summary>
        /// Create a new file in blob storage.
        /// </summary>
        /// <param name="stream">data to be written to blob storage</param>
        /// <param name="blobStoragePath">path to save the stream to in blob storage</param>
        /// <returns>the size of the blob</returns>
        Task<long> WriteDataToStorage(Stream stream, string blobStoragePath);

        /// <summary>
        /// Reads a data file from blob storage
        /// </summary>
        /// <param name="blobStoragePath">path to be file to read blob storage</param>
        /// <returns>the stream with the file</returns>
        Task<Stream> ReadDataFromStorage(string blobStoragePath);

        /// <summary>
        /// Deletes the data element permanently
        /// </summary>
        /// <param name="blobStoragePath">path to the file to delete</param>
        /// <returns></returns>
        Task<bool> DeleteDataInStorage(string blobStoragePath);

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
        /// <returns></returns>
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

        /// <summary>
        /// Gets the correct data contaxt for the current application owner
        /// </summary>
        /// <param name="org">name of application owner</param>
        /// <returns></returns>
        OrgDataContext GetOrgDataContext(string org);
    }
}
