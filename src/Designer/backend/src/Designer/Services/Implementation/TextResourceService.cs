#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Infrastructure.Extensions;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;
using Microsoft.Extensions.Logging;
using PlatformStorageModels = Altinn.Platform.Storage.Interface.Models;

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
        public async Task UpdateTextResourcesAsync(string org, string app, string shortCommitId, string envName, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            string textResourcesPath = GetTextResourceDirectoryPath();
            List<FileSystemObject> folder = await _giteaApiWrapper.GetDirectoryAsync(org, app, textResourcesPath, shortCommitId);
            if (folder == null)
            {
                return;
            }

            var resourceFiles =
                folder.Where(textResourceFromRepo =>
                    Regex.Match(textResourceFromRepo.Name, "^(resource\\.)..(\\.json)").Success);

            await Parallel.ForEachAsync(resourceFiles, cancellationToken, async (textResourceFromRepo, c) =>
            {
                c.ThrowIfCancellationRequested();
                FileSystemObject populatedFile =
                    await _giteaApiWrapper.GetFileAsync(org, app, textResourceFromRepo.Path, shortCommitId);
                byte[] data = Convert.FromBase64String(populatedFile.Content);

                try
                {
                    PlatformStorageModels.TextResource content =
                        data.Deserialize<PlatformStorageModels.TextResource>();
                    await _storageTextResourceClient.Upsert(org, app, content, envName);
                }
                catch (SerializationException e)
                {
                    _logger.LogError(
                        $" // TextResourceService // UpdatedTextResourcesAsync // Error when trying to deserialize text resource file {org}/{app}/{textResourceFromRepo.Path} // Exception {e}");
                    throw;
                }
            });
        }

        private string GetTextResourceDirectoryPath()
        {
            return $"{ServiceRepositorySettings.CONFIG_FOLDER_PATH}{ServiceRepositorySettings.LANGUAGE_RESOURCE_FOLDER_NAME}";
        }
    }
}
