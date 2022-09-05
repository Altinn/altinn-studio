using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Interface for dealing with texts in new format in an app repository.
    /// </summary>
    public class TextsService : ITextsService
    {
        private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="altinnGitRepositoryFactory">IAltinnGitRepository</param>
        public TextsService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
        {
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        }

        /// <inheritdoc />
        public async Task<string> GetTextContent(string org, string repo, string developer, string languageCode)
        {
            var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

            string textContent = await altinnGitRepository.GetTextContentV2(languageCode);

            return textContent;
        }

        /// <inheritdoc />
        public async Task EditText(string org, string repo, string developer, string languageCode, Dictionary<string, string> jsonText)
        {
            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

            await altinnAppGitRepository.SaveTextV2(languageCode, jsonText);
        }
    }
}
