using System.Collections.Generic;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    /// <summary>
    /// Interface for handling texts in new format.
    /// </summary>
    public interface ITextsService
    {
        /// <summary>
        /// Gets text file in app repository according to
        /// specified languageCode.
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="repo">Repository</param>
        /// <param name="developer">Username of developer</param>
        /// <param name="languageCode">LanguageCode</param>
        /// <returns>The text file as a dictionary with ID and text as key:value pairs</returns>
        public Task<Dictionary<string, string>> GetText(string org, string repo, string developer, string languageCode);
    }
}
