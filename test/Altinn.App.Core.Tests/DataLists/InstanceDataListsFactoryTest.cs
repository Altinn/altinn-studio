using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.DataLists;
using Altinn.App.Core.Models;
using FluentAssertions;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.DataLists
{
    public class InstanceDataListsFactoryTest
    {
        [Fact]
        public void GetInstanceDataListProvider_CustomInstanceDataListProvider_ShouldReturnCustomType()
        {
            var factory = new InstanceDataListsFactory(new List<IInstanceDataListProvider>() { new CountryDataListProvider() });

            IInstanceDataListProvider dataListProvider = factory.GetDataListProvider("country");

            dataListProvider.Should().BeOfType<CountryDataListProvider>();
            dataListProvider.Id.Should().Be("country");
        }

        [Fact]
        public void GetInstanceDataListProvider_NoInstanceDataListProvider_ShouldReturnNullDataListProvider()
        {
            var factory = new InstanceDataListsFactory(new List<IInstanceDataListProvider>() { });

            IInstanceDataListProvider dataListProvider = factory.GetDataListProvider("country");

            dataListProvider.Should().BeOfType<NullInstanceDataListProvider>();
            dataListProvider.Id.Should().Be(string.Empty);
        }

        internal class CountryDataListProvider : IInstanceDataListProvider
        {
            public string Id { get; set; } = "country";

            public Task<DataList> GetInstanceDataListAsync(InstanceIdentifier instanceId, string language, Dictionary<string, string> keyValuePairs)
            {
                var dataList = new DataList
                {
                    ListItems = new List<object>
                    {
                        new { Name = "Norway", Code = "NO", Phone = 47 },
                        new { Name = "Sweden", Code = "SE", Phone = 46 },
                    }
                };

                return Task.FromResult(dataList);
            }
        }
    }
}
