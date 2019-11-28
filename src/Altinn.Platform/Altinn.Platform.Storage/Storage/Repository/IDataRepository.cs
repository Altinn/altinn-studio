using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Models;

namespace Altinn.Platform.Storage.Repository
{
    /// <summary>
    /// the interface contains methods for operations on form data document
    /// </summary>
    public interface IDataRepository
    {
        /// <summary>
        /// Create a new file in blob storage for formdata
        /// </summary>
        /// <param name="fileStream">data to be written to the form data file</param>
        /// <param name="fileName">the filename to be used</param>
        /// <returns>the size of the blob</returns>
        Task<long> WriteDataToStorage(Stream fileStream, string fileName);

        /// <summary>
        /// Gets a formd data file in blob storage
        /// </summary>
        /// <param name="fileName">the filename to be used</param>
        /// <returns></returns>
        Task<Stream> ReadDataFromStorage(string fileName);

        /// <summary>
        /// Deletes the data element permanently
        /// </summary>
        /// <param name="fileName">the file to delete</param>
        /// <returns></returns>
        Task<bool> DeleteDataInStorage(string fileName);

        /// <summary>
        /// Gets all data elements for a given instance
        /// </summary>
        /// <param name="instanceGuid">the guid of the instance</param>
        /// <returns>list of data elements</returns>
        Task<List<DataElement>> GetDataElementsForInstance(string instanceGuid);

        /// <summary>
        /// Inserts a dataElement into the repository
        /// </summary>
        /// <param name="dataElement">the data element to insert</param>
        /// <returns>the data element with updated id</returns>
        Task<DataElement> Insert(DataElement dataElement);

        /// <summary>
        /// Gets a data element
        /// </summary>
        /// <param name="instanceGuid">the instance guid as partitionKey</param>
        /// <param name="dataElementId">The data element id</param>
        /// <returns></returns>
        Task<DataElement> Get(string instanceGuid, string dataElementId);

        /// <summary>
        /// Updates a data element. 
        /// </summary>
        /// <param name="dataElement">The data element to update. Dataelement must have instanceGuid set!</param>
        /// <returns>The updated data element</returns>
        Task<DataElement> Update(DataElement dataElement);

        /// <summary>
        /// Deletes the data element permanently!
        /// </summary>
        /// <param name="dataElement">the element to delete</param>
        /// <returns>true if delete went well.</returns>
        Task<bool> Delete(DataElement dataElement);
    }
}
