using Altinn.App.Core.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.App.Core.Features.DataLists
{
    /// <summary>
    /// Service for handling datalists.
    /// </summary>
    public class DataListsService : IDataListsService
    {
        private readonly DataListsFactory _dataListsFactory;
        private readonly InstanceDataListsFactory _instanceDataListsFactory;

        /// <summary>
        /// Initializes a new instance of the <see cref="DataListsService"/> class.
        /// </summary>
        public DataListsService(DataListsFactory dataListsFactory, InstanceDataListsFactory instanceDataListsFactory)
        {
            _dataListsFactory = dataListsFactory;
            _instanceDataListsFactory = instanceDataListsFactory;
        }

        /// <inheritdoc/>
        public async Task<DataList> GetDataListAsync(string dataListId, string? language, Dictionary<string, string> keyValuePairs)
        {
            return await _dataListsFactory.GetDataListProvider(dataListId).GetDataListAsync(language, keyValuePairs);
        }

        /// <inheritdoc />
        public async Task<DataList> GetDataListAsync(InstanceIdentifier instanceIdentifier, string dataListId, string? language, Dictionary<string, string> keyValuePairs)
        {
            return await _instanceDataListsFactory.GetDataListProvider(dataListId).GetInstanceDataListAsync(instanceIdentifier, language, keyValuePairs);
        }
    }
}
