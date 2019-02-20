using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Runtime.DataService.Models;

namespace AltinnCore.Runtime.DataService.Repository
{
    /// <summary>
    /// the interface contains methods for operations on form data document
    /// </summary>
    public interface IFormDataRepository
    {
        /// <summary>
        /// Get form data for the given parameters
        /// </summary>
        /// <param name="reporteeId">the owner of the reportee element</param>
        /// <param name="reporteeElementId">the reportee element id</param>
        /// <param name="formId">the form id</param>
        /// <returns>The form data for the given parameters</returns>
        Task<FormData> GetFormDataFromCollectionAsync(string reporteeId, string reporteeElementId, string formId);

        /// <summary>
        /// insert new formdata into collection
        /// </summary>
        /// <param name="item">the form data</param>
        /// <returns>The formdata inserted into collection</returns>
        Task<FormData> InsertFormDataIntoCollectionAsync(FormData item);

        /// <summary>
        /// update existing form data
        /// </summary>
        /// <param name="id">the id of the form</param>
        /// <param name="item">the form data</param>
        /// <returns>The updated form data</returns>
        Task<FormData> UpdateFormDataInCollectionAsync(string id, FormData item);

        /// <summary>
        /// Create a new file in blob storage for formdata
        /// </summary>
        /// <param name="fileStream">data to be written to the form data file</param>
        /// <param name="fileName">the filename to be used</param>
        /// <returns></returns>
        Task<bool> CreateFormDataInStorage(Stream fileStream, string fileName);

        /// <summary>
        /// Gets a formd data file in blob storage
        /// </summary>
        /// <param name="fileName">the filename to be used</param>
        /// <returns></returns>
        Task<FormData> GetFormDataInStorage(string fileName);
    }
}
