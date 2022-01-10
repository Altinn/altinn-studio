using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Common.Models;
using Altinn.App.PlatformServices.Options;

namespace Altinn.App.PlatformServices.Implementation
{
    /// <summary>
    /// Service for handling app options aka code lists.
    /// </summary>
    public class AppOptionsService : IAppOptionsService
    {
        private readonly AppOptionsFactory _appOpptionsFactory;

        /// <summary>
        /// Initializes a new instance of the <see cref="AppOptionsService"/> class.
        /// </summary>
        public AppOptionsService(AppOptionsFactory appOptionsFactory)
        {
            _appOpptionsFactory = appOptionsFactory;
        }

        /// <inheritdoc/>
        public async Task<AppOptions> GetOptionsAsync(string optionId, Dictionary<string, string> keyValuePairs)
        {
            return await _appOpptionsFactory.GetOptionsProvider(optionId).GetAppOptionsAsync(keyValuePairs);
        }
    }
}
