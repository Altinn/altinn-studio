using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

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
        /// Updates an old key to a new key in all texts files.
        /// If 'newKey' is undefined the 'oldKey' is deleted.
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="repo">Repository</param>
        /// <param name="developer">Username of developer</param>
        /// <param name="languages">All languages that must be updated with new key</param>
        /// <param name="oldKey">The old key that will be replaced</param>
        /// <param name="newKey">The new key to replace the old</param>
        public Task<string> UpdateKey(string org, string repo, string developer, IList<string> languages, string oldKey, string newKey);

        /// <summary>
        /// Updates references to text keys in layout files.
        /// </summary>
        /// <param name="org">Identifier for the organisation</param>
        /// <param name="app">Identifier for the application</param>
        /// <param name="developer">Username of developer</param>
        /// <param name="keyMutations">A list of the keys that are updated</param>
        /// <returns></returns>
        public Task UpdateRelatedFiles(string org, string app, string developer, List<TextIdMutation> keyMutations);

        /// <summary>
        /// Updates text keys in layouts for a specific layoutset
        /// </summary>
        /// <param name="org">Identifier for the organisation</param>
        /// <param name="app">Identifier for the application</param>
        /// <param name="developer">Username of developer</param>
        /// <param name="layoutSetName">Name of the layoutset</param>
        /// <param name="keyMutations">A list of the keys that are updated</param>
        /// <returns></returns>
        public Task UpdateKeysInLayoutsInLayoutSet(string org, string app, string developer, string layoutSetName, List<TextIdMutation> keyMutations);
    }
}
