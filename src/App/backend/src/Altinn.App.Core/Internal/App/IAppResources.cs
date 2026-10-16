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
    /// Returns the json schema for the data type.
    /// </summary>
    /// <param name="dataTypeId">The data type id, which is also the name of the files in the models folder.</param>
    /// <returns>The JSON schema for the data type</returns>
    string GetModelJsonSchema(string dataTypeId);

    /// <summary>
    /// Gets the prefill json file
    /// </summary>
    /// <param name="dataTypeId">The data type id, which is also the name of the files in the models folder.</param>
    /// <returns>The prefill json file as a string</returns>
    string? GetPrefillJson(string dataTypeId = "ServiceModel");

    /// <summary>
    /// Get the class ref based on data type
    /// </summary>
    /// <param name="dataType">The datatype</param>
    /// <returns>Returns the class ref for a given datatype. An empty string is returned if no match is found.</returns>
    string GetClassRefForLogicDataType(string dataType);

    /// <summary>
    /// Gets the footer layout
    /// </summary>
    /// <returns>The footer layout</returns>
    Task<string?> GetFooter();

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
    /// <param name="dataTypeId">The data type id, which is also the name of the files in the models folder.</param>
    string? GetXsdSchema(string dataTypeId);

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
