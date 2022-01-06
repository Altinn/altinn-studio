using System.Collections.Generic;

namespace Altinn.App.PlatformServices.Options
{
    /// <summary>
    /// Factory class for resolving <see cref="IAppOptionsProvider"/> implementations
    /// based on the name/id of the app options requested.
    /// </summary>
    public class AppOptionsFactory
    {
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
            foreach (var appOptionProvider in AppOptionsProviders)
            {
                if (appOptionProvider.Id != optionsId)
                {
                    continue;
                }

                return appOptionProvider;
            }

            // In the case of no custom providers registred, we use the default
            // provider and set the requested id as this is the key for finding
            // the options file.
            var appOptions = GetOptionsProvider("default");
            appOptions.Id = optionsId;

            return appOptions;
        }
    }
}
