using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.App.Core.Features.DataLists
{
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
            InstanceDataListProviders = instanceDataListProvider;
        }

        private IEnumerable<IInstanceDataListProvider> InstanceDataListProviders { get; }

        /// <summary>
        /// Finds the implementation of IDataListsProvider based on the options id
        /// provided.
        /// </summary>
        /// <param name="listId">Id matching the options requested.</param>
        public IInstanceDataListProvider GetDataListProvider(string listId)
        {
            foreach (var instanceDataListProvider in InstanceDataListProviders)
            {
                if (instanceDataListProvider.Id.ToLower().Equals(listId.ToLower()))
                {
                    return instanceDataListProvider;
                }
            }

            return new NullInstanceDataListProvider();
        }
    }
}
