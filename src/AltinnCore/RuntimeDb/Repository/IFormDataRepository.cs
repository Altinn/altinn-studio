using System;
using AltinnCore.Runtime.Db.Models;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AltinnCore.Runtime.Db.Repository
{
    /// <summary>
    /// the interface contains methods for operations on form data document
    /// </summary>
    public interface IFormDataRepository
    {
        Task<FormData> GetFormDataFromCollectionAsync(string reporteeId, string reporteeElementId, string formId);
        Task<FormData> InsertFormDataIntoCollectionAsync(FormData item);
        Task<FormData> UpdateFormDataInCollectionAsync(string id, FormData item);
    }
}
