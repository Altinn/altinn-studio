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

        /// <inheritdoc />
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
