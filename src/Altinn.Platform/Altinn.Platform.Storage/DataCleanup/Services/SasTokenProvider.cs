using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Platform.Storage.DataCleanup.Services
{
    /// <summary>
    /// Represents a collection of SAS tokens and the means to obtain new tokens when needed.
    /// This class should be used as a singleton through dependency injection.
    /// </summary>
    public class SasTokenProvider : ISasTokenProvider
    {
        private readonly ConcurrentDictionary<string, string> _sasTokens = new ConcurrentDictionary<string, string>();
        private readonly IKeyVaultService _keyVaultService;
        private readonly SemaphoreSlim _semaphore = new SemaphoreSlim(1, 1);

        private readonly string _orgStorageAccount = "{0}altinn{1}strg01";
        private readonly string _orgSasDefinition = "{0}{1}sasdef01";
        private readonly string _orgKeyVaultURI = "https://{0}-{1}-keyvault.vault.azure.net/";

        private string _environment;

        /// <summary>
        /// Initializes a new instance of the <see cref="SasTokenProvider"/> class.
        /// </summary>
        /// <param name="keyVaultService">
        /// An instance of <see cref="KeyVaultService"/> with a principal with access to the application owner key vault(s).</param>
        public SasTokenProvider(IKeyVaultService keyVaultService)
        {            
            _environment = Environment.GetEnvironmentVariable("Environment");
            _keyVaultService = keyVaultService;
        }

        /// <inheritdoc/>
        public async Task<string> GetSasToken(string org)
        {
            string sasToken;
            if (_sasTokens.TryGetValue(org, out sasToken))
            {
                return sasToken;
            }

            await _semaphore.WaitAsync();
            try
            {
                if (_sasTokens.TryGetValue(org, out sasToken))
                {
                    return sasToken;
                }

                string storageAccount = string.Format(_orgStorageAccount, org, _environment);
                string sasDefinition = string.Format(_orgSasDefinition, org, _environment);
                string secretName = $"{storageAccount}-{sasDefinition}";
                string keyVaultUri = string.Format(_orgKeyVaultURI, org, _environment);

                sasToken = await _keyVaultService.GetSecretAsync(keyVaultUri, secretName);

                _sasTokens.TryAdd(org, sasToken);

                return sasToken;
            }
            finally
            {
                _semaphore.Release();
            }
        }

        /// <inheritdoc/>
        public void InvalidateSasToken(string org)
        {
            _sasTokens.TryRemove(org, out string _);
        }
    }
}
