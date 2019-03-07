using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
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
        /// <returns></returns>
        Task<bool> CreateDataInStorage(Stream fileStream, string fileName);

        /// <summary>
        /// Gets a formd data file in blob storage
        /// </summary>
        /// <param name="fileName">the filename to be used</param>
        /// <returns></returns>
        Task<Stream> GetDataInStorage(string fileName);
    }
}
