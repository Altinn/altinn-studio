namespace Altinn.App.Core.Features.Bootstrap;

/// <summary>
/// Service for analyzing layout files to extract referenced resources.
/// </summary>
internal interface ILayoutAnalysisService
{
    /// <summary>
    /// Get all data types referenced in dataModelBindings across all layouts.
    /// </summary>
    /// <param name="layoutsJson">The layouts JSON object (dictionary of page name to layout).</param>
    /// <param name="defaultDataType">The default data type to always include.</param>
    /// <returns>Set of data type IDs referenced in the layouts.</returns>
    HashSet<string> GetReferencedDataTypes(object layoutsJson, string defaultDataType);

    /// <summary>
    /// Get all static options variants grouped by optionsId.
    /// Static variants are options with no mapping and static query parameters only.
    /// </summary>
    /// <param name="layoutsJson">The layouts JSON object (dictionary of page name to layout).</param>
    /// <returns>Dictionary of optionsId to static query parameter variants.</returns>
    Dictionary<string, List<Dictionary<string, string>>> GetStaticOptions(object layoutsJson);
}
