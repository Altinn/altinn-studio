using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Infrastructure.Extensions;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Relevant text resourcemfunctions
    /// </summary>
    public class TextResourceService : ITextResourceService
    {
        private readonly IGitea _giteaApiWrapper;
        private readonly ILogger<TextResourceService> _logger;
        private readonly IAltinnStorageTextResourceClient _storageTextResourceClient;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="giteaApiWrapper">IGitea</param>
        /// <param name="logger">ILogger of type TextResourceService</param>
        /// <param name="storageTextResourceClient">IAltinnStorageTextResourceClient</param>
        public TextResourceService(
            IGitea giteaApiWrapper,
            ILogger<TextResourceService> logger,
            IAltinnStorageTextResourceClient storageTextResourceClient)
        {
            _giteaApiWrapper = giteaApiWrapper;
            _logger = logger;
            _storageTextResourceClient = storageTextResourceClient;
        }

        /// <inheritdoc/>
        public async Task UpdateTextResourcesAsync(string org, string app, string shortCommitId, EnvironmentModel environmentModel)
        {
            string textResourcesPath = GetTextResourceDirectoryPath();
            List<GiteaFileContent> folder = await _giteaApiWrapper.GetDirectoryAsync(org, app, textResourcesPath, shortCommitId);
            if (folder != null)
            {
                folder.ForEach(async textResource =>
                {
                    byte[] data = Convert.FromBase64String(textResource.Content);
                    TextResource content = data.Deserialize<TextResource>();
                    await _storageTextResourceClient.Create(org, app, content, environmentModel);
                });
            }
        }

        private string GetTextResourceDirectoryPath()
        {
            return $"{ServiceRepositorySettings.CONFIG_FOLDER_PATH}{ServiceRepositorySettings.LANGUAGE_RESOURCE_FOLDER_NAME}";
        }
    }
}
