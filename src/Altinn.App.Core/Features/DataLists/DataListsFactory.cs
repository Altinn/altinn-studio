namespace Altinn.App.Core.Features.DataLists;

/// <summary>
/// Factory class for resolving <see cref="IDataListProvider"/> implementations
/// based on the name/id of the data lists requested.
/// </summary>
public class DataListsFactory
{
    /// <summary>
    /// Initializes a new instance of the <see cref="DataListsFactory"/> class.
    /// </summary>
    public DataListsFactory(IEnumerable<IDataListProvider> dataListProviders)
    {
        _dataListProviders = dataListProviders;
    }

    private IEnumerable<IDataListProvider> _dataListProviders { get; }

    /// <summary>
    /// Finds the implementation of IDataListsProvider based on the options id
    /// provided.
    /// </summary>
    /// <param name="listId">Id matching the options requested.</param>
    public IDataListProvider GetDataListProvider(string listId)
    {
        foreach (var dataListProvider in _dataListProviders)
        {
            if (dataListProvider.Id.ToLower().Equals(listId.ToLower()))
            {
                return dataListProvider;
            }
        }

        return new NullDataListProvider();
    }
}
