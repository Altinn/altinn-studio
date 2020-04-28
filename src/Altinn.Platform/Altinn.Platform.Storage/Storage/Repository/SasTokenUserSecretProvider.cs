using System;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Configuration;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Storage.Repository
{
    /// <summary>
    /// Represents a collection of SAS tokens and the means to obtain new tokens when needed.
    /// This class should be used as a singleton through dependency injection.
    /// </summary>
    public class SasTokenUserSecretProvider : ISasTokenProvider
    {
        private readonly UserSecrets _userSecrets;

        private readonly ILogger<SasTokenUserSecretProvider> _logger;

        /// <summary>
        /// Initialize a new instance of the <see cref="SasTokenUserSecretProvider"/>.
        /// </summary>
        /// <param name="userSecrets">An instance of <see cref="UserSecrets"/> with dev specific values.</param>
        /// <param name="logger">A logger that can be used to write to a log.</param>
        public SasTokenUserSecretProvider(
            IOptions<UserSecrets> userSecrets,
            ILogger<SasTokenUserSecretProvider> logger)
        {
            _userSecrets = userSecrets.Value;
            _logger = logger;
        }

        /// <summary>
        /// Get the SAS token needed to access the storage account for given application owner.
        /// </summary>
        /// <param name="org">The application owner id.</param>
        /// <returns>The SAS token to use when accessing the application owner storage account.</returns>
        public async Task<string> GetSasToken(string org)
        {
            if (string.IsNullOrEmpty(_userSecrets.SharedAccessSignature))
            {
                throw new ArgumentException("UserSecrets.SharedAccessSignature is missing.");
            }

            return await Task.FromResult(_userSecrets.SharedAccessSignature);
        }

        /// <summary>
        /// Have a stored SAS token removed from the internal collection.
        /// </summary>
        /// <param name="org">The application owner id.</param>
        public void InvalidateSasToken(string org)
        {
        }
    }
}
