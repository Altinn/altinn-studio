using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.DataLists;

/// <summary>
/// Interface for working with <see cref="DataList"/>
/// </summary>
public interface IDataListsService
{
    /// <summary>
    /// Get the list of options for a specific options list by its id and key/value pairs.
    /// </summary>
    /// <param name="dataListId">The id of the options list to retrieve</param>
    /// <param name="language">The language code requested.</param>
    /// <param name="keyValuePairs">Optional list of key/value pairs to use for filtering and further lookup.</param>
    /// <returns>The list of options</returns>
    Task<DataList> GetDataListAsync(string dataListId, string? language, Dictionary<string, string> keyValuePairs);

    /// <summary>
    /// Get the list of instance specific datalist for a specific data list based on the <see cref="InstanceIdentifier"/>
    /// and key/value pairs. The values returned from this implementation could be specific to the instance and/or
    /// instance owner and should not be cached without careful thinking around caching strategy.
    /// </summary>
    /// <param name="instanceIdentifier">Class identifying the instance by instance owner party id and instance guid.</param>
    /// <param name="dataListId">The id of the options list to retrieve</param>
    /// <param name="language">The language code requested.</param>
    /// <param name="keyValuePairs">Optional list of key/value pairs to use for filtering and further lookup.</param>
    /// <returns>The list of options</returns>
    Task<DataList> GetDataListAsync(
        InstanceIdentifier instanceIdentifier,
        string dataListId,
        string? language,
        Dictionary<string, string> keyValuePairs
    );
}
