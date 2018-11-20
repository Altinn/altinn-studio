using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Runtime.Db.Models;

namespace AltinnCore.Runtime.Db.Repository
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
    }
}
