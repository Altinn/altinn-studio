using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.AltinnStorage
{
    /// <summary>
    /// IAltinnStorageTextResourceClient
    /// </summary>
    public interface IAltinnStorageTextResourceClient
    {
        /// <summary>
        /// Creates a text resource
        /// </summary>
        /// <param name="org">the org</param>
        /// <param name="app">the app</param>
        /// <param name="textResource">the text resource to create</param>
        /// <param name="envName">the environment name</param>
        public Task Upsert(string org, string app, TextResource textResource, string envName);
    }
}
