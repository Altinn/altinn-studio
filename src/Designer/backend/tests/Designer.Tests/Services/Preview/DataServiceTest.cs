using System;
using System.Text.Json.Nodes;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Services.Implementation.Preview;
using Altinn.Studio.Designer.Services.Interfaces.Preview;
using Json.Patch;
using Json.Pointer;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.Services.Preview
{
    public class DataServiceTest
    {
        private readonly IDataService _dataService;

        public DataServiceTest()
        {
            ServiceCollection serviceCollection = new();
            serviceCollection.AddDistributedMemoryCache();
            ServiceProvider serviceProvider = serviceCollection.BuildServiceProvider();

            IDistributedCache distributedCache = serviceProvider.GetRequiredService<IDistributedCache>();
            _dataService = new DataService(distributedCache);
        }

        [Theory]
        [InlineData(1234, "f1e23d45-6789-1bcd-8c34-56789abcdef0", "dataType1423")]
        public void CreateDataElement_ReturnsCorrectDataElement(int partyId, Guid instanceGuid, string dataType)
        {
            DataElement dataElement = _dataService.CreateDataElement(partyId, instanceGuid, dataType);
            Assert.Equal(dataElement.CreatedBy, partyId.ToString());
            Assert.Equal(dataElement.DataType, dataType);
            Assert.Equal(dataElement.InstanceGuid, instanceGuid.ToString());
            Assert.NotNull(dataElement.Id);
        }

        [Theory]
        [InlineData(1234, "f1e23d45-6789-1bcd-8c34-56789abcdef0", "dataType1423")]
        public void GetDataElement_ReturnsCorrectDataObject(int partyId, Guid instanceGuid, string dataType)
        {
            DataElement dataElement = _dataService.CreateDataElement(partyId, instanceGuid, dataType);
            JsonNode dataObject = _dataService.GetDataElement(new Guid(dataElement.Id));
            Console.WriteLine(dataObject);
            Assert.NotNull(dataObject);
        }

        [Theory]
        [InlineData(1234, "f1e23d45-6789-1bcd-8c34-56789abcdef0", "dataType1423", "testProperty", "testValue")]
        public void PatchDataElement_UpdatesObject(int partyId, Guid instanceGuid, string dataType, string testProperty, string testPropertyValue)
        {
            DataElement dataElement = _dataService.CreateDataElement(partyId, instanceGuid, dataType);
            JsonNode dataObject = _dataService.GetDataElement(new Guid(dataElement.Id));
            Assert.NotNull(dataObject);
            JsonNode patchedObject = _dataService.PatchDataElement(new Guid(dataElement.Id), new JsonPatch(PatchOperation.Add(JsonPointer.Parse($"/{testProperty}"), testPropertyValue)));
            Assert.NotNull(patchedObject);
            Assert.Equal(testPropertyValue, patchedObject[testProperty].ToString());
        }
    }
}
