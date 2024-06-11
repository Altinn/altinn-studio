namespace Altinn.App.Core.Features.DataLists;

/// <summary>
/// Factory class for resolving <see cref="IInstanceDataListProvider"/> implementations
/// based on the name/id of the data lists requested.
/// </summary>
public class InstanceDataListsFactory
{
    /// <summary>
    /// Initializes a new instance of the <see cref="DataListsFactory"/> class.
    /// </summary>
    public InstanceDataListsFactory(IEnumerable<IInstanceDataListProvider> instanceDataListProvider)
    {
        _instanceDataListProviders = instanceDataListProvider;
    }

    private IEnumerable<IInstanceDataListProvider> _instanceDataListProviders { get; }

    /// <summary>
    /// Finds the implementation of IDataListsProvider based on the options id
    /// provided.
    /// </summary>
    /// <param name="listId">Id matching the options requested.</param>
    public IInstanceDataListProvider GetDataListProvider(string listId)
    {
        foreach (var instanceDataListProvider in _instanceDataListProviders)
        {
            if (instanceDataListProvider.Id.Equals(listId, StringComparison.OrdinalIgnoreCase))
            {
                return instanceDataListProvider;
            }
        }

        return new NullInstanceDataListProvider();
    }
}
