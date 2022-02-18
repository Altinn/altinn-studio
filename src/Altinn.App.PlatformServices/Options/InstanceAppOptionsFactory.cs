using System.Collections.Generic;

namespace Altinn.App.PlatformServices.Options
{
    /// <summary>
    /// Factory class for resolving <see cref="IInstanceAppOptionsProvider"/> implementations
    /// based on the name/id of the app options requested.
    /// </summary>
    public class InstanceAppOptionsFactory
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="AppOptionsFactory"/> class.
        /// </summary>
        public InstanceAppOptionsFactory(IEnumerable<IInstanceAppOptionsProvider> instanceAppOptionsProviders)
        {
            InstanceAppOptionsProviders = instanceAppOptionsProviders;
        }

        private IEnumerable<IInstanceAppOptionsProvider> InstanceAppOptionsProviders { get; }

        /// <summary>
        /// Finds the implementation of IInstanceAppOptionsProvider based on the options id
        /// provided.
        /// </summary>
        /// <param name="optionsId">Id matching the options requested.</param>
        public IInstanceAppOptionsProvider GetOptionsProvider(string optionsId)
        {
            foreach (var instanceAppOptionProvider in InstanceAppOptionsProviders)
            {
                if (instanceAppOptionProvider.Id.ToLower() != optionsId.ToLower())
                {
                    continue;
                }

                return instanceAppOptionProvider;
            }

            return new NullInstanceAppOptionsProvider();
        }
    }
}
