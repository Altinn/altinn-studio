using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Common.Models;
using Altinn.App.PlatformServices.Models;
using Altinn.App.PlatformServices.Options;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// Service for handling app options aka code lists.
    /// </summary>
    public class AppOptionsService : IAppOptionsService
    {
        private readonly AppOptionsFactory _appOpptionsFactory;
        private readonly InstanceAppOptionsFactory _instanceAppOptionsFactory;

        /// <summary>
        /// Initializes a new instance of the <see cref="AppOptionsService"/> class.
        /// </summary>
        public AppOptionsService(AppOptionsFactory appOptionsFactory, InstanceAppOptionsFactory instanceAppOptionsFactory)
        {
            _appOpptionsFactory = appOptionsFactory;
            _instanceAppOptionsFactory = instanceAppOptionsFactory;
        }

        /// <inheritdoc/>
        public async Task<AppOptions> GetOptionsAsync(string optionId, string language, Dictionary<string, string> keyValuePairs)
        {
            return await _appOpptionsFactory.GetOptionsProvider(optionId).GetAppOptionsAsync(language, keyValuePairs);
        }

        /// <inheritdoc/>
        public async Task<AppOptions> GetOptionsAsync(InstanceIdentifier instanceIdentifier, string optionId, string language, Dictionary<string, string> keyValuePairs)
        {
            return await _instanceAppOptionsFactory.GetOptionsProvider(optionId).GetInstanceAppOptionsAsync(instanceIdentifier, language, keyValuePairs);
        }
    }
}
