using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for handling form related operations
    /// </summary>
    public interface IForm
    {
        /// <summary>
        /// Operation that returns a prefill populated form model
        /// </summary>
        /// <param name="applicationOwnerId">The applicaiton owner id</param>
        /// <param name="applicationId">The application Id</param>
        /// <param name="type">The type of the form model</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="prefillkey">The prefill key</param>
        /// <returns>The prefilled form model</returns>
        object GetPrefill(string applicationOwnerId, string applicationId, Type type, int instanceOwnerId, string prefillkey);
    }
}
