using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Relevant text resource functions
    /// </summary>
    public class LanguagesService : ILanguagesService
    {
        private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="altinnGitRepositoryFactory">IAltinnGitRepository</param>
        public LanguagesService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
        {
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        }

        /// <summary>
        /// Returns the languages when the text-files appear in new format
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repo">Repository identifier which is unique within an organisation.</param>
        /// <param name="developer">Username of developer currently working in the repo.</param>
        /// <returns>The languages</returns>
        public IList<string> GetLanguages(string org, string repo, string developer)
        {
            var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

            IList<string> languages = new List<string>();

            IList<string> languageFiles = altinnGitRepository.GetLanguageFiles();

            foreach (string languageFile in languageFiles)
            {
                string fileName = Path.GetFileName(languageFile);
                string[] nameParts = fileName.Split('.');
                languages.Add(nameParts[1]);
            }

            return languages;
        }
    }
}
