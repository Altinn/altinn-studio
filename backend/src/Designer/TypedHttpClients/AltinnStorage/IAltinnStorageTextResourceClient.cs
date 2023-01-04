using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.AltinnStorage
{
    /// <summary>
    /// IAltinnStorageTextResourceClient
    /// </summary>
    public interface IAltinnStorageTextResourceClient
    {
        /// <summary>
        /// Gets a text resource
        /// </summary>
        /// <param name="org">the org</param>
        /// <param name="app">the app</param>
        /// <param name="language">the language</param>
        /// <param name="environmentModel">the environment model</param>
        /// <returns>the text resource, if found</returns>
        public Task<TextResource> Get(string org, string app, string language, EnvironmentModel environmentModel);

        /// <summary>
        /// Creates a text resource
        /// </summary>
        /// <param name="org">the org</param>
        /// <param name="app">the app</param>
        /// <param name="textResource">the text resource to create</param>
        /// <param name="environmentModel">the environment model</param>
        public Task Create(string org, string app, TextResource textResource, EnvironmentModel environmentModel);

        /// <summary>
        /// Updates a text resource
        /// </summary>
        /// <param name="org">the org</param>
        /// <param name="app">the app</param>
        /// <param name="textResource">the text resource to update</param>
        /// <param name="environmentModel">the environment model</param>
        public Task Update(string org, string app, TextResource textResource, EnvironmentModel environmentModel);
    }
}
