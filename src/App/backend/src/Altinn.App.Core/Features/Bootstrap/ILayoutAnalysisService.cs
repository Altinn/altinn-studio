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
    /// Get all optionsId values that can be fetched statically.
    /// These are options that have optionsId, no mapping property, and static queryParameters.
    /// </summary>
    /// <param name="layoutsJson">The layouts JSON object (dictionary of page name to layout).</param>
    /// <returns>Set of optionIds that can be statically fetched.</returns>
    HashSet<string> GetStaticOptionIds(object layoutsJson);
}
