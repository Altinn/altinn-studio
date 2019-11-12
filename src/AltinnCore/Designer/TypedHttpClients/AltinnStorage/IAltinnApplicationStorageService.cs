using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;

namespace AltinnCore.Designer.TypedHttpClients.AltinnStorage
{
    /// <summary>
    /// IAltinnApplicationStorageService
    /// </summary>
    public interface IAltinnApplicationStorageService
    {
        /// <summary>
        /// Gets one specific application
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">App</param>
        /// <returns></returns>
        Task<Application> GetAsync(string org, string app);

        /// <summary>
        /// Updates an Altinn.Storage.Application
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">App</param>
        /// <param name="application">Altinn.Platform.Storage.Application</param>
        /// <returns></returns>
        Task UpdateAsync(string org, string app, Application application);

        /// <summary>
        /// Creates an Altinn.Storage.Application
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">App</param>
        /// <param name="application">Altinn.Platform.Storage.Application</param>
        /// <returns></returns>
        Task<Application> CreateAsync(string org, string app, Application application);
    }
}
