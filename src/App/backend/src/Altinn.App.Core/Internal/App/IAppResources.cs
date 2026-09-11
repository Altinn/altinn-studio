using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.App;

/// <summary>
/// Interface for execution functionality
/// </summary>
public interface IAppResources
{
    /// <summary>
    /// Get the app resource for the given parameters.
    /// </summary>
    /// <param name="org">Unique identifier of the organization responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organization.</param>
    /// <param name="textResource">the resource.</param>
    /// <returns>The app resource.</returns>
    byte[] GetText(string org, string app, string textResource);

    /// <summary>
    /// Get the text resources in a specific language.
    /// </summary>
    /// <param name="org">Unique identifier of the organization responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organization.</param>
    /// <param name="language">The two letter language code.</param>
    /// <returns>The text resources in the specified language if they exist. Otherwise null.</returns>
    Task<TextResource?> GetTexts(string org, string app, string language);

    /// <summary>
    /// Returns the json schema for the provided model id.
    /// </summary>
    /// <param name="modelId">Unique identifier for the model.</param>
    /// <returns>The JSON schema for the model</returns>
    string GetModelJsonSchema(string modelId);

    /// <summary>
    /// Gets the prefill json file
    /// </summary>
    /// <param name="dataModelName">the data model name</param>
    /// <returns>The prefill json file as a string</returns>
    string? GetPrefillJson(string dataModelName = "ServiceModel");

    /// <summary>
    /// Get the class ref based on data type
    /// </summary>
    /// <param name="dataType">The datatype</param>
    /// <returns>Returns the class ref for a given datatype. An empty string is returned if no match is found.</returns>
    string GetClassRefForLogicDataType(string dataType);

    /// <summary>
    /// Gets the the layout sets
    /// </summary>
    /// <returns>The layout sets</returns>
    [Obsolete(
        "There is no mapping between task and layout folder anymore, all folders are named the same as the task ID.",
        error: true
    )]
    string? GetLayoutSetsString();

    /// <summary>
    /// Get the layout set definition. Return null if no layout sets exists
    /// </summary>
    [Obsolete(
        "There is no mapping between task and layout folder anymore, all folders are named the same as the task ID.",
        error: true
    )]
    object? GetLayoutSets();

    /// <summary>
    /// Gets the footer layout
    /// </summary>
    /// <returns>The footer layout</returns>
    Task<string?> GetFooter();

    /// <summary>
    /// Get the layout set definition for a given task. Return null if no layout sets exists
    /// </summary>
    [Obsolete("Use GetLayoutsInFolder or GetLayoutSettingsForFolder instead", error: true)]
    LayoutSet? GetLayoutSetForTask(string taskId);

    /// <summary>
    /// Gets the layouts for av given layoutset
    /// </summary>
    /// <param name="layoutSetId">The layot set id</param>
    /// <returns>A dictionary of FormLayout objects serialized to JSON</returns>
    [Obsolete("Use GetLayoutsInFolder instead", error: true)]
    string GetLayoutsForSet(string layoutSetId);

    /// <summary>
    /// Gets the full layout model for the task
    /// </summary>
    [Obsolete("Use GetLayoutModelForFolder instead", error: true)]
    LayoutModel? GetLayoutModelForTask(string taskId);

    /// <summary>
    /// Gets the full layout model for the optional set
    /// </summary>
    [Obsolete("Use GetLayoutModelForFolder instead", error: true)]
    LayoutModel GetLayoutModel(string? layoutSetId = null);

    /// <summary>
    /// Gets the the layouts settings for a layoutset
    /// </summary>
    /// <param name="layoutSetId">The layot set id</param>
    /// <returns>The layout settings as a JSON string</returns>
    [Obsolete("Use GetLayoutSettingsForFolder instead", error: true)]
    string? GetLayoutSettingsStringForSet(string layoutSetId);

    /// <summary>
    /// Gets the the layouts settings for a layoutset
    /// </summary>
    /// <returns>The layout settings</returns>
    [Obsolete("Use GetLayoutSettingsForFolder instead", error: true)]
    LayoutSettings? GetLayoutSettingsForSet(string? layoutSetId);

    /// <summary>
    /// Gets the UI configuration, which specifies which sub-folders are in the ui/ directory and their Settings.json
    /// </summary>
    UiConfiguration? GetUiConfiguration();

    /// <summary>
    /// Gets the layouts in a given subfolder in ui/
    /// </summary>
    /// <param name="folderId">The folder name</param>
    /// <returns>A dictionary of Layout objects serialized to JSON</returns>
    string GetLayoutsInFolder(string folderId);

    /// <summary>
    /// Gets the full layout model for a folder
    /// </summary>
    LayoutModel? GetLayoutModelForFolder(string folder);

    /// <summary>
    /// Gets the the layouts settings for a subfolder in App/ui (as a string)
    /// </summary>
    /// <param name="folder">The layot set id</param>
    /// <returns>The layout settings as a JSON string</returns>
    string? GetLayoutSettingsStringForFolder(string folder);

    /// <summary>
    /// Gets the the layouts settings for a subfolder in App/ui
    /// </summary>
    /// <returns>The layout settings</returns>
    LayoutSettings? GetLayoutSettingsForFolder(string? folder);

    /// <summary>
    /// Gets the validation configuration for a given data type
    /// </summary>
    string? GetValidationConfiguration(string dataTypeId);

    /// <summary>
    /// Gets the xsd schema.
    /// </summary>
    /// <param name="modelId">Unique identifier for the model.</param>
    string? GetXsdSchema(string modelId);

    /// <summary>
    /// Gets the calculation configuration for a given data type
    /// </summary>
    /// <returns>The calculation configuration in JSON format represented as string</returns>
    string? GetCalculationConfiguration(string dataTypeId);

    /// <summary>
    /// Gets the global UI settings (App/ui/Settings.json)
    /// </summary>
    public GlobalPageSettings? GetGlobalUiSettings();
}
