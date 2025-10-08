using Altinn.App.Core.Features;
using Altinn.App.Core.Features.DataLists;
using Altinn.App.Core.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.PlatformServices.Tests.DataLists;

public class DataListsFactoryTest
{
    [Fact]
    public void GetDataListProvider_CustomDataListProvider_ShouldReturnCustomType()
    {
        var services = new ServiceCollection();
        services.AddAppImplementationFactory();
        services.AddSingleton<DataListsFactory>();
        services.AddSingleton<IDataListProvider, CountryDataListProvider>();
        using var serviceProvider = services.BuildStrictServiceProvider();

        var factory = serviceProvider.GetRequiredService<DataListsFactory>();

        IDataListProvider dataListProvider = factory.GetDataListProvider("country");

        dataListProvider.Should().BeOfType<CountryDataListProvider>();
        dataListProvider.Id.Should().Be("country");
    }

    [Fact]
    public void GetDataListProvider_NoDataListProvider_ShouldReturnNullDataListProvider()
    {
        var services = new ServiceCollection();
        services.AddAppImplementationFactory();
        services.AddSingleton<DataListsFactory>();
        using var serviceProvider = services.BuildStrictServiceProvider();

        var factory = serviceProvider.GetRequiredService<DataListsFactory>();

        IDataListProvider dataListProvider = factory.GetDataListProvider("country");

        dataListProvider.Should().BeOfType<NullDataListProvider>();
        dataListProvider.Id.Should().Be(string.Empty);
    }

    internal class CountryDataListProvider : IDataListProvider
    {
        public string Id { get; set; } = "country";

        public Task<DataList> GetDataListAsync(string? language, Dictionary<string, string> keyValuePairs)
        {
            var dataList = new DataList
            {
                ListItems = new List<object>
                {
                    new
                    {
                        Name = "Norway",
                        Code = "NO",
                        Phone = 47,
                    },
                    new
                    {
                        Name = "Sweden",
                        Code = "SE",
                        Phone = 46,
                    },
                },
            };

            return Task.FromResult(dataList);
        }
    }
}
