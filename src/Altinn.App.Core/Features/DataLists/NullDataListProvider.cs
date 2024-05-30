using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.DataLists;

/// <summary>
/// Nullobject for cases where there is no match on the requested <see cref="IDataListProvider"/>
/// ListIttems is set to null and not an empty list for the controller to be able to differensiate
/// between option provider found, but with no values and no option provider found ie. returns 404.
/// </summary>
public class NullDataListProvider : IDataListProvider
{
    /// <inheritdoc/>
    public string Id => string.Empty;

    /// <inheritdoc/>
    public Task<DataList> GetDataListAsync(string? language, Dictionary<string, string> keyValuePairs)
    {
#nullable disable
        return Task.FromResult(new DataList() { ListItems = null });
#nullable restore
    }
}
