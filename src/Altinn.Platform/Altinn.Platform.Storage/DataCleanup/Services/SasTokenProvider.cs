using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Storage.DataCleanup.Services
{
    /// <summary>
    /// Represents a collection of SAS tokens and the means to obtain new tokens when needed.
    /// This class should be used as a singleton through dependency injection.
    /// </summary>
    public class SasTokenProvider : ISasTokenProvider
    {
        private readonly ConcurrentDictionary<string, (DateTime created, string token)> _sasTokens =
            new ConcurrentDictionary<string, (DateTime created, string token)>();

        private readonly IKeyVaultService _keyVaultService;
        private readonly SemaphoreSlim _semaphore = new SemaphoreSlim(1, 1);
        private readonly ILogger<ISasTokenProvider> _logger;

        private readonly string _storageAccount = "{0}altinn{1}strg01";
        private readonly string _sasDefinition = "{0}{1}sasdef01";
        private readonly string _keyVaultURI = "https://{0}-{1}-keyvault.vault.azure.net/";
        private const int _allowedSasTokenAgeHours = 1;
        private readonly string _environment;

        /// <summary>
        /// Initializes a new instance of the <see cref="SasTokenProvider"/> class.
        /// </summary>
        /// <param name="keyVaultService">
        /// An instance of <see cref="KeyVaultService"/> with a principal with access to the application owner key vault(s).</param>
        public SasTokenProvider(IKeyVaultService keyVaultService, ILogger<ISasTokenProvider> logger)
        {
            _environment = Environment.GetEnvironmentVariable("Environment");
            _keyVaultService = keyVaultService;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<string> GetSasToken(string org)
        {
            (DateTime created, string token) sasToken;
            if (_sasTokens.TryGetValue(org, out sasToken) && StillYoung(sasToken.created))
            {
                return sasToken.token;
            }

            _sasTokens.TryRemove(org, out _);

            await _semaphore.WaitAsync();
            try
            {
                if (_sasTokens.TryGetValue(org, out sasToken))
                {
                    return sasToken.token;
                }

                string storageAccount = string.Format(_storageAccount, org, _environment);
                string sasDefinition = string.Format(_sasDefinition, org, _environment);
                string secretName = $"{storageAccount}-{sasDefinition}";
                string keyVaultUri = string.Format(_keyVaultURI, org, _environment);

                sasToken.token = await _keyVaultService.GetSecretAsync(keyVaultUri, secretName);
                sasToken.created = DateTime.UtcNow;

                _sasTokens.TryAdd(org, sasToken);

                return sasToken.token;
            }
            catch (Exception e)
            {
                _logger.LogError($"SasTokenProvider // GetSasToken // Exeption: {e.Message}");
                return string.Empty;
            }
            finally
            {
                _semaphore.Release();
            }
        }

        /// <inheritdoc/>
        public void InvalidateSasToken(string org)
        {
            _sasTokens.TryRemove(org, out _);
        }

        private bool StillYoung(DateTime created)
        {
            return created.AddHours(_allowedSasTokenAgeHours) > DateTime.UtcNow;
        }

    }
}
