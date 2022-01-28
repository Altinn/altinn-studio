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
        /// The id/name that is used in the <c>optionsId</c> parameter in the SelectionComponents (Checkboxes, RadioButtons, Dropdown ...)
        /// You can have as many providers as you like, but you should have only one per id.
        /// </summary>
        string Id { get; }

        /// <summary>
        /// Gets the <see cref="AppOptions"/> based on the provided options id and key value pairs.
        /// </summary>
        /// <param name="language">Language code</param>
        /// <param name="keyValuePairs">Key/value pairs to control what options to get.
        /// When called from the options controller this will be the querystring key/value pairs.</param>
        /// <returns>A <see cref="Task{TResult}"/> representing the result of the asynchronous operation.</returns>
        Task<AppOptions> GetAppOptionsAsync(string language, Dictionary<string, string> keyValuePairs);
    }
}
