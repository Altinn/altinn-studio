using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Common.Models;

namespace Altinn.App.PlatformServices.Options
{
    /// <summary>
    /// Interface for providing <see cref="AppOptions"/>
    /// </summary>
    public interface IAppOptionsProvider
    {
        /// <summary>
        /// The id/name of the options this provider supports ie. land, fylker, kommuner.
        /// You can have as many providers as you like, but you should have only one per
        /// id. In the case of multiple providers registred with the same id it's non
        /// deterministic which one will be returned.
        /// </summary>
        string Id { get; set; }

        /// <summary>
        /// Gets the <see cref="AppOptions"/> based on the provided options id and key value pairs.
        /// </summary>
        /// <param name="keyValuePairs">Key/value pairs to control what options to get.
        /// When called from the options controller this will be the querystring key/value pairs.</param>
        /// <returns>A <see cref="Task{TResult}"/> representing the result of the asynchronous operation.</returns>
        Task<AppOptions> GetAppOptionsAsync(Dictionary<string, string> keyValuePairs);
    }
}
