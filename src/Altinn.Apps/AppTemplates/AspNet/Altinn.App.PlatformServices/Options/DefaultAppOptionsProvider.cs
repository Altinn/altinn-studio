using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Common.Models;
using Altinn.App.Services.Interface;

namespace Altinn.App.PlatformServices.Options
{
    /// <inheritdoc/>
    public class DefaultAppOptionsProvider : IAppOptionsProvider
    {
        private readonly IAppResources _appResourceService;
        
        /// <summary>
        /// Initializes a new instance of the <see cref="DefaultAppOptionsProvider"/> class.
        /// </summary>
        public DefaultAppOptionsProvider(IAppResources appResourceService)
        {
            _appResourceService = appResourceService;
        }

        /// <summary>
        /// This is the default app options implementation and will resolve static
        /// json files in the options folder of the app. As the id is used to 
        /// </summary>
        public string Id { get; set; } = "default";

        /// <inheritdoc/>
        public Task<AppOptions> GetAppOptionsAsync(Dictionary<string, string> keyValuePairs)
        {
            // This will get static options if it exists
            var appOptions = new AppOptions
            {
                Options = _appResourceService.GetOptions(Id)
            };

            return Task.FromResult(appOptions);
        }
    }
}
