using System.Collections.Generic;

using Altinn.App.Common.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Services.Interface
{
    /// <summary>
    /// Interface for execution functionality
    /// </summary>
    public interface IAppResources
    {
        /// <summary>
        /// Get the app resource for the given parameters.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="resource">the resource.</param>
        /// <returns>The app resource.</returns>
        byte[] GetAppResource(string org, string app, string resource);

        /// <summary>
        /// Get the app resource for the given parameters.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="textResource">the resource.</param>
        /// <returns>The app resource.</returns>
        byte[] GetText(string org, string app, string textResource);

        /// <summary>
        /// Returns the model metadata for an app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The ServiceMetadata for an app.</returns>
        string GetModelMetaDataJSON(string org, string app);

        /// <summary>
        /// Returns the json schema for the provided model id.
        /// </summary>
        /// <param name="modelId">Unique identifier for the model.</param>
        /// <returns>The JSON schema for the model</returns>
        string GetModelJsonSchema(string modelId);

        /// <summary>
        /// Method that fetches the runtime resources stored in wwwroot
        /// </summary>
        /// <param name="resource">the resource</param>
        /// <returns>The filestream for the resource file</returns>
        byte[] GetRuntimeResource(string resource);

        /// <summary>
        /// Returns the application metadata for an application.
        /// </summary>
        /// <returns>The application  metadata for an application.</returns>
        Application GetApplication();

        /// <summary>
        /// Gets the prefill json file
        /// </summary>
        /// <param name="dataModelName">the data model name</param>
        /// <returns></returns>
        string GetPrefillJson(string dataModelName = "ServiceModel");

        /// <summary>
        /// Returns the class ref for a given datatype. Defaults to first applogic type if not prent
        /// </summary>
        /// <param name="dataType">The datatype</param>
        /// <returns></returns>
        string GetClassRefForLogicDataType(string dataType);

        /// <summary>
        /// Get the list of options for a specific options list by its id.
        /// </summary>
        /// <param name="optionId">The id of the options list to retrieve</param>
        /// <returns>The list of options</returns>
        List<AppOption> GetOptions(string optionId);

        /// <summary>
        /// Gets the layouts for the app.
        /// </summary>
        /// <returns>A dictionary of FormLayout objects serialized to JSON</returns>
        string GetLayouts();

        /// <summary>
        /// Gets the the layouts settings
        /// </summary>
        /// <returns>The layout settings</returns>
        string GetLayoutSettings();

        /// <summary>
        /// Gets the the layout sets
        /// </summary>
        /// <returns>The layout sets</returns>
        string GetLayoutSets();

        /// <summary>
        /// Gets the layouts for av given layoutset
        /// </summary>
        /// <returns>A dictionary of FormLayout objects serialized to JSON</returns>
        string GetLayoutsForSet(string id);

        /// <summary>
        /// Gets the the layouts settings for a layoutset
        /// </summary>
        /// <returns>The layout settings</returns>
        string GetLayoutSettingsForSet(string id);

        /// <summary>
        /// Gets the ruleconfiguration for av given layoutset
        /// </summary>
        /// <returns>A dictionary of FormLayout objects serialized to JSON</returns>
        byte[] GetRuleConfigurationForSet(string id);

        /// <summary>
        /// Gets the the rule handler for a layoutset
        /// </summary>
        /// <returns>The layout settings</returns>
        byte[] GetRuleHandlerForSet(string id);
    }
}
