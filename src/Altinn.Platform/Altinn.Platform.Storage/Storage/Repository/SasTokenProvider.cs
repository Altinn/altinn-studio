using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Wrappers;

using AltinnCore.Authentication.Constants;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Storage.Repository
{
    /// <summary>
    /// Represents a collection of SAS tokens and the means to obtain new tokens when needed.
    /// This class should be used as a singleton through dependency injection.
    /// </summary>
    public class SasTokenProvider : ISasTokenProvider
    {
        private readonly ConcurrentDictionary<string, (DateTime Created, string Token)> _sasTokens =
            new ConcurrentDictionary<string, (DateTime Created, string Token)>();

        private readonly AzureStorageConfiguration _storageConfiguration;
        private readonly IKeyVaultClientWrapper _keyVaultWrapper;
        private readonly ILogger<SasTokenProvider> _logger;

        private readonly SemaphoreSlim _semaphore = new SemaphoreSlim(1, 1);

        /// <summary>
        /// Initializes a new instance of the <see cref="SasTokenProvider"/> class with the given <see cref="KeyVaultSettings"/>.
        /// </summary>
        /// <param name="keyVaultWrapper">
        /// An instance of <see cref="KeyVaultClientWrapper"/> with a principal with access to the application owner key vault(s).</param>
        /// <param name="storageConfiguration">
        /// The <see cref="AzureStorageConfiguration"/> with information about the key vault and storage account formats.
        /// The formats is used to generate the actual URI and storage account names based on organisation id.
        /// </param>
        /// <param name="logger">A logger that can be used to write to a log.</param>
        public SasTokenProvider(
            IKeyVaultClientWrapper keyVaultWrapper,
            IOptions<AzureStorageConfiguration> storageConfiguration,
            ILogger<SasTokenProvider> logger)
        {
            _keyVaultWrapper = keyVaultWrapper;
            _storageConfiguration = storageConfiguration.Value;
            _logger = logger;
        }

        /// <summary>
        /// Get the SAS token needed to access the storage account for given application owner.
        /// </summary>
        /// <param name="org">The application owner id.</param>
        /// <returns>The SAS token to use when accessing the application owner storage account.</returns>
        public async Task<string> GetSasToken(string org)
        {
            if (_sasTokens.TryGetValue(org, out (DateTime Created, string Token) sasToken) && StillYoung(sasToken.Created))
            {
                return sasToken.Token;
            }

            _sasTokens.TryRemove(org, out _);

            await _semaphore.WaitAsync();
            try
            {
                if (_sasTokens.TryGetValue(org, out sasToken))
                {
                    return sasToken.Token;
                }

                string storageAccount = string.Format(_storageConfiguration.OrgStorageAccount, org);
                string sasDefinition = string.Format(_storageConfiguration.OrgSasDefinition, org);

                string secretName = $"{storageAccount}-{sasDefinition}";
                string keyVaultUri = string.Format(_storageConfiguration.OrgKeyVaultURI, org);

                _logger.LogInformation("Getting secret '{secretName}' from '{keyVaultUri}'.", secretName, keyVaultUri);

                (DateTime Created, string Token) newSasToken = default;
                newSasToken.Created = DateTime.UtcNow;
                newSasToken.Token = await _keyVaultWrapper.GetSecretAsync(keyVaultUri, secretName);

                _sasTokens.TryAdd(org, newSasToken);

                return newSasToken.Token;
            }
            finally
            {
                _semaphore.Release();
            }
        }

        /// <summary>
        /// Have a stored SAS token removed from the internal collection.
        /// </summary>
        /// <param name="org">The application owner id.</param>
        public void InvalidateSasToken(string org)
        {
            _logger.LogInformation("Removing SAS token for '{org}'.", org);

            _sasTokens.TryRemove(org, out _);
        }

        private bool StillYoung(DateTime created)
        {
            return created.AddHours(_storageConfiguration.AllowedSasTokenAgeHours) > DateTime.UtcNow;
        }
    }
}
