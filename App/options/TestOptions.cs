using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Models;
using Altinn.App.Models;

namespace Altinn.App.Options
{
    public class TestOptions : IInstanceAppOptionsProvider
    {
        public string Id { get; set; } = "test-hei";

        private readonly IDataClient _dataClient;
        private readonly IAppMetadata _appMetadata;
        private readonly IInstanceClient _instanceClient;

        public TestOptions(
            IDataClient dataClient,
            IAppMetadata appMetadata,
            IInstanceClient instanceClient
        )
        {
            _dataClient = dataClient;
            _appMetadata = appMetadata;
            _instanceClient = instanceClient;
        }

        public async Task<AppOptions> GetInstanceAppOptionsAsync(
            InstanceIdentifier instanceIdentifier,
            string language,
            Dictionary<string, string> keyValuePairs
        )
        {
            var data = await FetchDataModel(instanceIdentifier);

            var options = new AppOptions { Options = new List<AppOption>() };

            data.Endringsmeldinggrp9786.OversiktOverEndringenegrp9788.ForEach(row =>
            {
                if (row?.SkattemeldingEndringEtterFristOpprinneligBelopdatadef37131?.value != null)
                {
                    options.Options.Add(
                        new AppOption
                        {
                            Label = row.SkattemeldingEndringEtterFristOpprinneligBelopdatadef37131.value.ToString(),
                            Value = row.SkattemeldingEndringEtterFristOpprinneligBelopdatadef37131.value.ToString()
                        }
                    );
                }
            });

            return options;
        }

        private async Task<NestedGroup> FetchDataModel(InstanceIdentifier instanceIdentifier)
        {
            var dataTypeId = "nested-group";

            var applicationMetadata = await _appMetadata.GetApplicationMetadata();

            var instance = await _instanceClient.GetInstance(
                applicationMetadata.AppIdentifier.App,
                applicationMetadata.AppIdentifier.Org,
                instanceIdentifier.InstanceOwnerPartyId,
                instanceIdentifier.InstanceGuid
            );

            var dataModel = instance.Data.FirstOrDefault(d => d.DataType.Equals(dataTypeId));
            if (dataModel == null)
            {
                throw new ArgumentException("Failed to locate data model");
            }

            var dataElement = await _dataClient.GetFormData(
                instanceIdentifier.InstanceGuid,
                typeof(NestedGroup),
                applicationMetadata.AppIdentifier.Org,
                applicationMetadata.AppIdentifier.App,
                instanceIdentifier.InstanceOwnerPartyId,
                new Guid(dataModel.Id)
            );
            if (dataElement == null || dataElement is not NestedGroup)
            {
                throw new ArgumentException($"Failed to locate data element of type {dataTypeId}");
            }

            return (NestedGroup)dataElement;
        }
    }
}
