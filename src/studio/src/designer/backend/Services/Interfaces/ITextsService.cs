using System.Threading.Tasks;

using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    /// <summary>
    /// Interface for dealing with texts in new format in an app repository.
    /// </summary>
    public interface ITextsService
    {
        /// <summary>
        /// Returns content of text file in app repository according to
        /// specified languageCode.
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="repo">Repository</param>
        /// <param name="developer">Username of developer</param>
        /// <param name="languageCode">LanguageCode</param>
        public Task<ActionResult<string>> GetTextContent(string org, string repo, string developer, string languageCode);
    }
}
