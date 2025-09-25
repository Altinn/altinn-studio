using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Features.DataLists;

/// <summary>
/// Factory class for resolving <see cref="IDataListProvider"/> implementations
/// based on the name/id of the data lists requested.
/// </summary>
public class DataListsFactory
{
    private readonly AppImplementationFactory _appImplementationFactory;

    /// <summary>
    /// Initializes a new instance of the <see cref="DataListsFactory"/> class.
    /// </summary>
    public DataListsFactory(IServiceProvider serviceProvider)
    {
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    /// <summary>
    /// Finds the implementation of IDataListsProvider based on the options id
    /// provided.
    /// </summary>
    /// <param name="listId">Id matching the options requested.</param>
    public IDataListProvider GetDataListProvider(string listId)
    {
        var dataListProviders = _appImplementationFactory.GetAll<IDataListProvider>();
        foreach (var dataListProvider in dataListProviders)
        {
            if (dataListProvider.Id.Equals(listId, StringComparison.OrdinalIgnoreCase))
            {
                return dataListProvider;
            }
        }

        return new NullDataListProvider();
    }
}
