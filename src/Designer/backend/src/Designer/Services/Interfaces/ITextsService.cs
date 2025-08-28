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
        /// Creates the default text resource file in old text format with appName
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="repo">Repository</param>
        /// <param name="developer">Username of developer</param>
        public Task CreateLanguageResources(string org, string repo, string developer);

        /// <summary>
        /// Returns the app languages
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">Username of developer</param>
        /// <returns>The text</returns>
        public List<string> GetLanguages(string org, string app, string developer);

        /// <summary>
        /// Gets texts file in old format in app repository according to
        /// specified languageCode.
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="repo">Repository</param>
        /// <param name="developer">Username of developer</param>
        /// <param name="languageCode">LanguageCode</param>
        /// <returns>The text file</returns>
        public Task<TextResource> GetText(string org, string repo, string developer, string languageCode);

        /// <summary>
        /// Saves text resource in old format.
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="repo">Repository</param>
        /// <param name="developer">Username of developer</param>
        /// <param name="textResource">The text resource to be saved</param>
        /// <param name="languageCode">LanguageCode</param>
        /// <returns></returns>
        public Task SaveText(string org, string repo, string developer, TextResource textResource, string languageCode);

        /// <summary>
        /// Updates text values for the specified keys and returns the updated TextResource.
        /// </summary>
        /// <param name="org"></param>
        /// <param name="repo"></param>
        /// <param name="developer"></param>
        /// <param name="keysTexts"></param>
        /// <param name="languageCode"></param>
        /// <returns>The updated TextResource object after applying the changes.</returns>
        public Task<TextResource> UpdateTextsForKeys(string org, string repo, string developer, Dictionary<string, string> keysTexts, string languageCode);

        /// <summary>
        /// Updates references to text keys in layout files.
        /// </summary>
        /// <param name="org">Identifier for the organisation</param>
        /// <param name="app">Identifier for the application</param>
        /// <param name="developer">Username of developer</param>
        /// <param name="keyMutations">A list of the keys that are updated</param>
        /// <returns></returns>
        public Task<List<string>> UpdateRelatedFiles(string org, string app, string developer, List<TextIdMutation> keyMutations);
    }
}
