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
        /// <param name="envName">the environment name</param>
        /// <returns>the text resource, if found</returns>
        public Task<TextResource> Get(string org, string app, string language, string envName);

        /// <summary>
        /// Creates a text resource
        /// </summary>
        /// <param name="org">the org</param>
        /// <param name="app">the app</param>
        /// <param name="textResource">the text resource to create</param>
        /// <param name="envName">the environment name</param>
        public Task Create(string org, string app, TextResource textResource, string envName);

        /// <summary>
        /// Updates a text resource
        /// </summary>
        /// <param name="org">the org</param>
        /// <param name="app">the app</param>
        /// <param name="textResource">the text resource to update</param>
        /// <param name="envName">the environment name</param>
        public Task Update(string org, string app, TextResource textResource, string envName);
    }
}
