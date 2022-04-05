using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Common.Models;
using Altinn.App.PlatformServices.Models;

namespace Altinn.App.PlatformServices.Options
{
    /// <summary>
    /// Interface for working with <see cref="AppOption"/>
    /// </summary>
    public interface IAppOptionsService
    {
        /// <summary>
        /// Get the list of options for a specific options list by its id and key/value pairs.
        /// </summary>
        /// <param name="optionId">The id of the options list to retrieve</param>
        /// <param name="language">The language code requested.</param>
        /// <param name="keyValuePairs">Optional list of key/value pairs to use for filtering and further lookup.</param>
        /// <returns>The list of options</returns>
        Task<AppOptions> GetOptionsAsync(string optionId, string language, Dictionary<string, string> keyValuePairs);

        /// <summary>
        /// Get the list of instance specific options for a specific options list based on the <see cref="InstanceIdentifier"/>
        /// and key/value pairs. The values returned from this implementation could be specific to the instance and/or
        /// instance owner and should not be cached without careful thinking around caching strategy.
        /// </summary>
        /// <param name="instanceIdentifier">Class identifying the instance by instance owner party id and instance guid.</param>
        /// <param name="optionId">The id of the options list to retrieve</param>
        /// <param name="language">The language code requested.</param>
        /// <param name="keyValuePairs">Optional list of key/value pairs to use for filtering and further lookup.</param>
        /// <returns>The list of options</returns>
        Task<AppOptions> GetOptionsAsync(InstanceIdentifier instanceIdentifier, string optionId, string language, Dictionary<string, string> keyValuePairs);
    }
}
