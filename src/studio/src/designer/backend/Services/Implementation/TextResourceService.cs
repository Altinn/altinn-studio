using System;
using System.Collections.Generic;
using System.Net;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Infrastructure.Extensions;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;
using Microsoft.Extensions.Logging;
using Microsoft.Rest.TransientFaultHandling;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Relevant text resource functions
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
            List<FileSystemObject> folder = await _giteaApiWrapper.GetDirectoryAsync(org, app, textResourcesPath, shortCommitId);
            if (folder != null)
            {
                folder.ForEach(async textResourceFromRepo =>
                {
                    FileSystemObject populatedFile = await _giteaApiWrapper.GetFileAsync(org, app, textResourceFromRepo.Path, shortCommitId);
                    byte[] data = Convert.FromBase64String(populatedFile.Content);
                    TextResource content = data.Deserialize<TextResource>();
                    TextResource textResourceStorage = await GetTextResourceFromStorage(org, app, content.Language, environmentModel);
                    if (textResourceStorage == null)
                    {
                        await _storageTextResourceClient.Create(org, app, content, environmentModel);
                    }
                    else
                    {
                        await _storageTextResourceClient.Update(org, app, content, environmentModel);
                    }
                });
            }
        }

        private async Task<TextResource> GetTextResourceFromStorage(string org, string app, string language, EnvironmentModel environmentModel)
        {
            try
            {
                return await _storageTextResourceClient.Get(org, app, language, environmentModel);
            }
            catch (HttpRequestWithStatusException e)
            {
                /*
                 * Special exception handling because we want to continue if the exception
                 * was caused by a 404 (NOT FOUND) HTTP status code.
                 */
                if (e.StatusCode == HttpStatusCode.NotFound)
                {
                    return null;
                }

                throw;
            }
        }

        private string GetTextResourceDirectoryPath()
        {
            return $"{ServiceRepositorySettings.CONFIG_FOLDER_PATH}{ServiceRepositorySettings.LANGUAGE_RESOURCE_FOLDER_NAME}";
        }
    }
}
