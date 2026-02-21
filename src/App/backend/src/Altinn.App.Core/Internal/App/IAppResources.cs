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
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="textResource">the resource.</param>
    /// <returns>The app resource.</returns>
    byte[] GetText(string org, string app, string textResource);

    /// <summary>
    /// Get the text resources in a specific language.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
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
    /// Returns the application metadata for an application.
    /// </summary>
    /// <returns>The application  metadata for an application.</returns>
    [Obsolete(
        "GetApplication is scheduled for removal. Use Altinn.App.Core.Internal.App.IAppMetadata.GetApplicationMetadata instead",
        false
    )]
    Application GetApplication();

    /// <summary>
    /// Returns the application XACML policy for an application.
    /// </summary>
    /// <returns>The application  XACML policy for an application.</returns>
    [Obsolete(
        "GetApplication is scheduled for removal. Use Altinn.App.Core.Internal.App.IAppMetadata.GetApplicationXACMLPolicy instead",
        false
    )]
    string? GetApplicationXACMLPolicy();

    /// <summary>
    /// Returns the application BPMN process for an application.
    /// </summary>
    /// <returns>The application  BPMN process for an application.</returns>
    [Obsolete(
        "GetApplication is scheduled for removal. Use Altinn.App.Core.Internal.App.IAppMetadata.GetApplicationBPMNProcess instead",
        false
    )]
    string? GetApplicationBPMNProcess();

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
    /// Gets the UI configuration, which specifies which sub-folders are in the ui/ directory and their Settings.json
    /// </summary>
    UiConfiguration? GetUiConfiguration();

    /// <summary>
    /// Gets the footer layout
    /// </summary>
    /// <returns>The footer layout</returns>
    Task<string?> GetFooter();

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
}
