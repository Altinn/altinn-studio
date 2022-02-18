using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Common.Models;
using Altinn.App.PlatformServices.Models;

namespace Altinn.App.PlatformServices.Options
{
    /// <summary>
    /// Nullobject for cases where there is no match on the requested <see cref="IInstanceAppOptionsProvider"/>
    /// </summary>
    public class NullInstanceAppOptionsProvider : IInstanceAppOptionsProvider
    {
        /// <inheritdoc/>
        public string Id => string.Empty;

        /// <inheritdoc/>
        public Task<AppOptions> GetInstanceAppOptionsAsync(InstanceIdentifier instanceIdentifier, string language, Dictionary<string, string> keyValuePairs)
        {
            return Task.FromResult<AppOptions>(new AppOptions() { IsCacheable = false, Options = new List<AppOption>() });
        }
    }
}
