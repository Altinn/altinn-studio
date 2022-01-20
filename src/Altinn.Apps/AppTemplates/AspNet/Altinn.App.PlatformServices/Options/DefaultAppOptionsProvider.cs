using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Common.Models;

namespace Altinn.App.PlatformServices.Options
{
    /// <inheritdoc/>
    public class DefaultAppOptionsProvider : IAppOptionsProvider
    {
        private readonly IAppOptionsFileHandler _appOptionsFileHandler;
        
        /// <summary>
        /// Initializes a new instance of the <see cref="DefaultAppOptionsProvider"/> class.
        /// </summary>
        public DefaultAppOptionsProvider(IAppOptionsFileHandler appOptionsFileHandler)
        {
            _appOptionsFileHandler = appOptionsFileHandler;
        }

        /// <summary>
        /// This is the default app options implementation and will resolve static
        /// json files in the options folder of the app. As the id is used to resolve
        /// the file name, this particular Id=Default will be replaced run-time by
        /// the <see cref="AppOptionsFactory"/> when providing the class.
        /// </summary>
        public string Id { get; internal set; } = "default";

        /// <inheritdoc/>
        public async Task<AppOptions> GetAppOptionsAsync(string language, Dictionary<string, string> keyValuePairs)
        {
            // This will get static options if it exists
            var appOptions = new AppOptions
            {
                Options = await _appOptionsFileHandler.ReadOptionsFromFileAsync(Id)
            };

            return appOptions;
        }

        /// <summary>
        /// Internal method for cloning the default implementation and setting the id
        /// as the implementation will use the id when finding the configured option files.
        /// </summary>
        /// <param name="cloneToOptionId">The actual option id to use.</param>
        /// <returns></returns>
        internal IAppOptionsProvider CloneDefaultTo(string cloneToOptionId)
        {
            var clone = new DefaultAppOptionsProvider(_appOptionsFileHandler)
            {
                Id = cloneToOptionId
            };
            return clone;
        }
    }
}
