using System;
using System.Collections.Generic;
using System.Linq;

namespace Altinn.App.PlatformServices.Options
{
    /// <summary>
    /// Factory class for resolving <see cref="IAppOptionsProvider"/> implementations
    /// based on the name/id of the app options requested.
    /// </summary>
    public class AppOptionsFactory
    {
        private const string DEFAULT_PROVIDER_NAME = "default";

        /// <summary>
        /// Initializes a new instance of the <see cref="AppOptionsFactory"/> class.
        /// </summary>
        public AppOptionsFactory(IEnumerable<IAppOptionsProvider> appOptionsProviders)
        {
            AppOptionsProviders = appOptionsProviders;
        }

        private IEnumerable<IAppOptionsProvider> AppOptionsProviders { get; }

        /// <summary>
        /// Finds the implementation of IAppOptionsProvider based on the options id
        /// provided.
        /// </summary>
        /// <param name="optionsId">Id matching the options requested.</param>
        /// <returns></returns>
        public IAppOptionsProvider GetOptionsProvider(string optionsId)
        {
            bool isDefault = optionsId == DEFAULT_PROVIDER_NAME;

            foreach (var appOptionProvider in AppOptionsProviders)
            {
                if (appOptionProvider.Id.ToLower() != optionsId.ToLower())
                {
                    continue;
                }

                return appOptionProvider;
            }

            if (isDefault)
            {
                throw new KeyNotFoundException("No default app options provider found in the configures services. Please check your services configuration.");
            }

            // In the case of no custom providers registred, we use the default
            // provider and set the requested id as this is the key for finding
            // the options file.
            var appOptions = GetOptionsProvider(DEFAULT_PROVIDER_NAME);
            appOptions.Id = optionsId;

            return appOptions;
        }
    }
}
