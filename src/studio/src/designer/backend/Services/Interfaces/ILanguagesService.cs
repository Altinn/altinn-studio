using System.Collections.Generic;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    /// <summary>
    /// Interface for dealing with available languages in an app repository.
    /// </summary>
    public interface ILanguagesService
    {
        /// <summary>
        /// Returns all languages that exists in a specific repository for a
        /// specific organization by reading the part of all the filenames that
        /// identifies the language under the Texts-directory.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repo">Repository identifier which is unique within an organisation.</param>
        /// <param name="developer">Username of developer currently working in the repo.</param>
        /// <returns>The languages</returns>
        public IList<string> GetLanguages(string org, string repo, string developer);

        /// <summary>
        /// Deletes text file for a specific language.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repo">Repository identifier which is unique within an organisation.</param>
        /// <param name="developer">Username of developer currently working in the repo.</param>
        /// <param name="languageCode">LanguageCode to identify the specific text file.</param>
        /// <returns>A boolean value indicating if the language was deleted or not.</returns>
        public bool DeleteLanguage(string org, string repo, string developer, string languageCode);
    }
}
