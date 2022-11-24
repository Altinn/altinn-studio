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
        /// Gets texts file in app repository according to
        /// specified languageCode.
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="repo">Repository</param>
        /// <param name="developer">Username of developer</param>
        /// <param name="languageCode">LanguageCode</param>
        /// <returns>The text file as a dictionary with ID and text as key:value pairs</returns>
        public Task<Dictionary<string, string>> GetTexts(string org, string repo, string developer, string languageCode);

        /// <summary>
        /// Gets all keys in use across the languages.
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="repo">Repository</param>
        /// <param name="developer">Username of developer</param>
        /// <param name="languages">List of languages in application</param>
        /// <returns>The text file as a dictionary with ID and text as key:value pairs</returns>
        public Task<List<string>> GetKeys(string org, string repo, string developer, IList<string> languages);

        /// <summary>
        /// Edit texts file for specific language by overwriting old text file.
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="repo">Repository</param>
        /// <param name="developer">Username of developer</param>
        /// <param name="languageCode">LanguageCode</param>
        /// <param name="jsonTexts">Text to be added to new text file</param>
        public Task UpdateTexts(string org, string repo, string developer, string languageCode, Dictionary<string, string> jsonTexts);

        /// <summary>
        /// Deletes texts file for a specific language.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repo">Repository identifier which is unique within an organisation.</param>
        /// <param name="developer">Username of developer currently working in the repo.</param>
        /// <param name="languageCode">LanguageCode to identify the specific text file.</param>
        public void DeleteTexts(string org, string repo, string developer, string languageCode);

        /// <summary>
        /// Converts all texts files in a specific repository for a specific organisation.
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="repo">Repository</param>
        /// <param name="developer">Username of developer</param>
        public void ConvertV1TextsToV2(string org, string repo, string developer);

        /// <summary>
        /// Adds a new key to the key-mapping file for text-ids.
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="repo">Repository</param>
        /// <param name="developer">Username of developer</param>
        /// <param name="newKey">The new key to add to the file</param>
        public Task<Dictionary<string, string>> AddKey(string org, string repo, string developer, string newKey);
    }
}
