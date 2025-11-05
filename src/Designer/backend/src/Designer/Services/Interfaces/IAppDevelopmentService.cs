#nullable disable
using System.Collections.Generic;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.DataModeling.Metamodel;
using Altinn.Studio.Designer.Models;
using JetBrains.Annotations;

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
        /// Gets an array of names of all layouts in all layoutSets (if app uses sets)
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is canceled.</param>
        public Task<string[]> GetLayoutNames(AltinnRepoEditingContext altinnRepoEditingContext, CancellationToken cancellationToken = default);

        /// <summary>
        /// Returns a list of data model IDs in application metadata.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="onlyUnReferenced">If true only model IDs without task_id ref in app metadata is returned</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The model metadata for a given layout set.</returns>
        public Task<IEnumerable<string>> GetAppMetadataModelIds(
            AltinnRepoEditingContext altinnRepoEditingContext,
            bool onlyUnReferenced,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Returns the <see cref="ModelMetadata"/> for an app.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="layoutSetName">Name of layoutSet to fetch corresponding model metadata for</param>
        /// <param name="dataModelName">Name of data model to fetch</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The model metadata for a given layout set.</returns>
        public Task<ModelMetadata> GetModelMetadata(
            AltinnRepoEditingContext altinnRepoEditingContext, [CanBeNull] string layoutSetName, [CanBeNull] string dataModelName,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Gets an array of all layoutsets for layout-sets.json. If no sets returns null.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is canceled.</param>
        public Task<LayoutSets> GetLayoutSets(AltinnRepoEditingContext altinnRepoEditingContext, CancellationToken cancellationToken = default);

        /// <summary>
        /// Extended version of layout sets with the intention of adding information not included in the raw layout-sets.json file.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is canceled.</param>
        public Task<LayoutSetsModel> GetLayoutSetsExtended(AltinnRepoEditingContext altinnRepoEditingContext, CancellationToken cancellationToken = default);

        /// <summary>
        /// Gets a layoutSet config.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="layoutSetId">The id of the layout set to get config for.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is canceled.</param>
        public Task<LayoutSetConfig> GetLayoutSetConfig(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Adds a config for an additional layout set to the layout-sets.json
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="newLayoutSet">Config for the new layout set</param>
        /// <param name="layoutIsInitialForPaymentTask">Boolean value indicating if the layout set is the initial layout set for a payment task.
        /// Default is false if not specified </param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        public Task<LayoutSets> AddLayoutSet(AltinnRepoEditingContext altinnRepoEditingContext, LayoutSetConfig newLayoutSet, bool layoutIsInitialForPaymentTask = false, CancellationToken cancellationToken = default);

        /// <summary>
        /// Updates an existing layout set with a new layout set id
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="oldLayoutSetName">The id of the layout set to replace</param>
        /// <param name="newLayoutSetName">The new id for the layout set</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        public Task<LayoutSets> UpdateLayoutSetName(AltinnRepoEditingContext altinnRepoEditingContext, string oldLayoutSetName, string newLayoutSetName, CancellationToken cancellationToken = default);

        /// <summary>
        /// Deletes an existing layout set in layout-sets.json based on layoutSetId and deletes connection between related dataType/task in application metadata
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="layoutSetToDeleteId">The id of the layout set to replace</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        public Task<LayoutSets> DeleteLayoutSet(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetToDeleteId, CancellationToken cancellationToken = default);

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
        /// <returns>A <see cref="NuGet.Versioning.SemanticVersion"/> holding the version of the app-lib used in app.</returns>
        public NuGet.Versioning.SemanticVersion GetAppLibVersion(AltinnRepoEditingContext altinnRepoEditingContext);


        /// <summary>
        /// Try to pull the frontend version from the repo and return it.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="version">Version of the frontend used in app.</param>
        /// <returns>A <see cref="bool"/> representing if frontend version if successfully found.</returns>
        public bool TryGetFrontendVersion(AltinnRepoEditingContext altinnRepoEditingContext, out string version);

        /// <summary>
        /// Add a component to layout
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="layoutSetName">The name of the layout set.</param>
        /// <param name="layoutName">The name of the layout.</param>
        /// <param name="component">The component to add.</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        public Task AddComponentToLayout(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName, string layoutName, object component, CancellationToken cancellationToken = default);

        /// <summary>
        /// Update layout references
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="referencesToUpdate">The references to update.</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        public Task<bool> UpdateLayoutReferences(AltinnRepoEditingContext altinnRepoEditingContext, List<Reference> referencesToUpdate, CancellationToken cancellationToken);
    }
}
