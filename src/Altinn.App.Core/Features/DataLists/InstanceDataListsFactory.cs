using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Features.DataLists;

/// <summary>
/// Factory class for resolving <see cref="IInstanceDataListProvider"/> implementations
/// based on the name/id of the data lists requested.
/// </summary>
public class InstanceDataListsFactory
{
    private readonly AppImplementationFactory _appImplementationFactory;

    /// <summary>
    /// Initializes a new instance of the <see cref="DataListsFactory"/> class.
    /// </summary>
    public InstanceDataListsFactory(IServiceProvider serviceProvider)
    {
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    /// <summary>
    /// Finds the implementation of IDataListsProvider based on the options id
    /// provided.
    /// </summary>
    /// <param name="listId">Id matching the options requested.</param>
    public IInstanceDataListProvider GetDataListProvider(string listId)
    {
        var instanceDataListProviders = _appImplementationFactory.GetAll<IInstanceDataListProvider>();
        foreach (var instanceDataListProvider in instanceDataListProviders)
        {
            if (instanceDataListProvider.Id.Equals(listId, StringComparison.OrdinalIgnoreCase))
            {
                return instanceDataListProvider;
            }
        }

        return new NullInstanceDataListProvider();
    }
}
