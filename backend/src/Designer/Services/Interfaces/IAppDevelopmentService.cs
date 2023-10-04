using System.Collections.Generic;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    public interface IAppDevelopmentService
    {
        /// <summary>
        /// Gets a list of FormLayouts for layoutset. Use null as layoutSetName for apps that does not use layoutset.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="layoutSetName">Name of layoutset. Is null of app does not use layoutset</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>A list of all FormLayouts for a layoutset</returns>
        public Task<Dictionary<string, JsonNode>> GetFormLayouts(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName, CancellationToken cancellationToken = default);

        /// <summary>
        /// Saves the form layout for a specific layoutname. If app-structure
        /// without layoutset is used, use null as layoutsetname
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="layoutSetName">Name of layoutset. Is null of app does not use layoutset</param>
        /// <param name="layoutName">Name of layout file</param>
        /// <param name="formLayout">Actual content of layout file</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns></returns>
        public Task SaveFormLayout(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName, string layoutName, JsonNode formLayout, CancellationToken cancellationToken = default);

        /// <summary>
        /// Delete the form layout for a specific layoutname. If app-structure
        /// without layoutset is used, use null as layoutsetname
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="layoutSetName">Name of layoutset. Is null of app does not use layoutset</param>
        /// <param name="layoutName">Name of layout file</param>
        /// <returns></returns>
        public void DeleteFormLayout(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName, string layoutName);

        /// <summary>
        /// Updates the name of a layout file
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="layoutSetName">Name of layoutset. Is null of app does not use layoutset</param>
        /// <param name="layoutName">Name of layout file</param>
        /// <param name="newName">The new name of the layout file</param>
        public void UpdateFormLayoutName(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName, string layoutName, string newName);

        /// <summary>
        /// Gets LayoutSettings for layoutset. Use null as layoutSetName for apps that does not use layoutset.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="layoutSetName">Name of layoutset. Is null of app does not use layoutset</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>JsonNode for layoutset</returns>
        public Task<JsonNode> GetLayoutSettings(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName, CancellationToken cancellationToken = default);

        /// <summary>
        /// Save LayoutSettings for layoutset. Use null as layoutSetName for apps that does not use layoutset.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="layoutSettings">The layoutSettings to be saved</param>
        /// <param name="layoutSetName">Name of layoutset. Is null of app does not use layoutset</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        public Task SaveLayoutSettings(AltinnRepoEditingContext altinnRepoEditingContext, JsonNode layoutSettings, string layoutSetName, CancellationToken cancellationToken = default);

        /// <summary>
        /// Gets an array of all layoutsets for layout-sets.json. If no sets returns null.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is canceled.</param>
        public Task<LayoutSets> GetLayoutSets(AltinnRepoEditingContext altinnRepoEditingContext, CancellationToken cancellationToken = default);

        /// <summary>
        /// Creates a layout-sets.json file
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="layoutSetName">The name of the layout set.</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        public Task<LayoutSets> ConfigureLayoutSet(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName, CancellationToken cancellationToken = default);

        /// <summary>
        /// Adds a config for an additional layoutset to the layout-set.json
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="layoutSet">Config for the new layoutset</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        public Task AddLayoutSet(AltinnRepoEditingContext altinnRepoEditingContext, LayoutSetConfig layoutSet, CancellationToken cancellationToken = default);

        /// <summary>
        /// Gets the rule handler for a specific organization, application, developer, and layout set name.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="layoutSetName">The name of the layout set.</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>A task that represents the asynchronous operation. The task result contains the rule handler as a string.</returns>
        public Task<string> GetRuleHandler(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName, CancellationToken cancellationToken = default);

        /// <summary>
        /// Saves the rule handler for a specific organization, application, developer, rule handler, and layout set name.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="ruleHandler">The rule handler to save.</param>
        /// <param name="layoutSetName">The name of the layout set.</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        public Task SaveRuleHandler(AltinnRepoEditingContext altinnRepoEditingContext, string ruleHandler, string layoutSetName, CancellationToken cancellationToken = default);

        /// <summary>
        /// Gets the rule configuration for a specific organization, application, developer, and layout set name.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="layoutSetName">The name of the layout set.</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>A task that represents the asynchronous operation. The task result contains the rule configuration as a string.</returns>
        public Task<string> GetRuleConfigAndAddDataToRootIfNotAlreadyPresent(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName, CancellationToken cancellationToken = default);

        /// <summary>
        /// Saves the rule configuration for a specific organization, application, developer, rule configuration, and layout set name.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="ruleConfig">The rule configuration to save.</param>
        /// <param name="layoutSetName">The name of the layout set.</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        public Task SaveRuleConfig(AltinnRepoEditingContext altinnRepoEditingContext, JsonNode ruleConfig, string layoutSetName, CancellationToken cancellationToken = default);


        /// <summary>
        /// Get's the version of the app-lib used in repo
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <returns>A <see cref="System.Version"/> holding the version of the app-lib used in app.</returns>
        public System.Version GetAppLibVersion(AltinnRepoEditingContext altinnRepoEditingContext);
    }
}
