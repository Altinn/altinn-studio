using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using JetBrains.Annotations;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    public interface IAppDevelopmentService
    {

        /// <summary>
        /// Gets LayoutSettings for layoutset. Use null as layoutSetName for apps that does not use layoutset.
        /// </summary>
        /// <param name="org">Identifier for organisation</param>
        /// <param name="app">Identifier for application</param>
        /// <param name="developer">Identifier for app-developer</param>
        /// <param name="layoutSetName">Name of layoutset. Is null of app does not use layoutset</param>
        /// <returns>LayoutSettings for layoutset</returns>
        public Task<LayoutSettings> GetLayoutSettings(string org, string app, string developer, [CanBeNull] string layoutSetName);

        /// <summary>
        /// Save LayoutSettings for layoutset. Use null as layoutSetName for apps that does not use layoutset.
        /// </summary>
        /// <param name="org">Identifier for organisation</param>
        /// <param name="app">Identifier for application</param>
        /// <param name="developer">Identifier for app-developer</param>
        /// <param name="layoutSettings">The layoutSettings to be saved</param>
        /// <param name="layoutSetName">Name of layoutset. Is null of app does not use layoutset</param>
        public Task SaveLayoutSettings(string org, string app, string developer, LayoutSettings layoutSettings, [CanBeNull] string layoutSetName);

    }
}
