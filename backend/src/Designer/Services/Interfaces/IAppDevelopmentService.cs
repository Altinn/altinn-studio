using System.Collections.Generic;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using JetBrains.Annotations;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    public interface IAppDevelopmentService
    {

        /// <summary>
        /// Gets a list of FormLayouts for layoutset. Use null as layoutSetName for apps that does not use layoutset.
        /// </summary>
        /// <param name="org">Identifier for organisation</param>
        /// <param name="app">Identifier for application</param>
        /// <param name="developer">Identifier for app-developer</param>
        /// <param name="layoutSetName">Name of layoutset. Is null of app does not use layoutset</param>
        /// <returns>A list of all FormLayouts for a layoutset</returns>
        public Task<Dictionary<string, JsonNode>> GetFormLayouts(string org, string app, string developer, string layoutSetName);

        /// <summary>
        /// Saves the form layout for a specific layoutname. If app-structure
        /// without layoutset is used, use null as layoutsetname
        /// </summary>
        /// <param name="org">Identifier for organisation</param>
        /// <param name="app">Identifier for application</param>
        /// <param name="developer">Identifier for app-developer</param>
        /// <param name="layoutSetName">Name of layoutset. Is null of app does not use layoutset</param>
        /// <param name="layoutName">Name of layout file</param>
        /// <param name="formLayout">Actual content of layout file</param>
        /// <returns></returns>
        public Task SaveFormLayout(string org, string app, string developer, string layoutSetName, string layoutName, JsonNode formLayout);

        /// <summary>
        /// Delete the form layout for a specific layoutname. If app-structure
        /// without layoutset is used, use null as layoutsetname
        /// </summary>
        /// <param name="org">Identifier for organisation</param>
        /// <param name="app">Identifier for application</param>
        /// <param name="developer">Identifier for app-developer</param>
        /// <param name="layoutSetName">Name of layoutset. Is null of app does not use layoutset</param>
        /// <param name="layoutName">Name of layout file</param>
        /// <returns></returns>
        public void DeleteFormLayout(string org, string app, string developer, string layoutSetName, string layoutName);

        /// <summary>
        /// Updates the name of a layout file
        /// </summary>
        /// <param name="org">Identifier for organisation</param>
        /// <param name="app">Identifier for application</param>
        /// <param name="developer">Identifier for app-developer</param>
        /// <param name="layoutSetName">Name of layoutset. Is null of app does not use layoutset</param>
        /// <param name="layoutName">Name of layout file</param>
        /// <param name="newName">The new name of the layout file</param>
        public void UpdateFormLayoutName(string org, string app, string developer, string layoutSetName, string layoutName, string newName);

        /// <summary>
        /// Gets LayoutSettings for layoutset. Use null as layoutSetName for apps that does not use layoutset.
        /// </summary>
        /// <param name="org">Identifier for organisation</param>
        /// <param name="app">Identifier for application</param>
        /// <param name="developer">Identifier for app-developer</param>
        /// <param name="layoutSetName">Name of layoutset. Is null of app does not use layoutset</param>
        /// <returns>JsonNode for layoutset</returns>
        public Task<JsonNode> GetLayoutSettings(string org, string app, string developer, [CanBeNull] string layoutSetName);

        /// <summary>
        /// Save LayoutSettings for layoutset. Use null as layoutSetName for apps that does not use layoutset.
        /// </summary>
        /// <param name="org">Identifier for organisation</param>
        /// <param name="app">Identifier for application</param>
        /// <param name="developer">Identifier for app-developer</param>
        /// <param name="layoutSettings">The layoutSettings to be saved</param>
        /// <param name="layoutSetName">Name of layoutset. Is null of app does not use layoutset</param>
        public Task SaveLayoutSettings(string org, string app, string developer, JsonNode layoutSettings, [CanBeNull] string layoutSetName);

        /// <summary>
        /// Gets an array of all layoutsets for layout-sets.json. If no sets returns null.
        /// </summary>
        /// <param name="org">Identifier for organisation</param>
        /// <param name="app">Identifier for application</param>
        /// <param name="developer">Identifier for app-developer</param>
        public Task<LayoutSets> GetLayoutSets(string org, string app, string developer);

        /// <summary>
        /// Adds a config for an additional layoutset to the layout-set.json
        /// </summary>
        /// <param name="org">Identifier for organisation</param>
        /// <param name="app">Identifier for application</param>
        /// <param name="developer">Identifier for app-developer</param>
        /// <param name="layoutSet">Config for the new layoutset</param>
        public Task AddLayoutSet(string org, string app, string developer, LayoutSetConfig layoutSet);

    }
}
