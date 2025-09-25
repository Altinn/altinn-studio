using Altinn.App.Core.Features;
using Altinn.App.Core.Features.DataLists;
using Altinn.App.Core.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.PlatformServices.Tests.DataLists;

public class InstanceDataListsFactoryTest
{
    [Fact]
    public void GetInstanceDataListProvider_CustomInstanceDataListProvider_ShouldReturnCustomType()
    {
        var services = new ServiceCollection();
        services.AddAppImplementationFactory();
        services.AddSingleton<IInstanceDataListProvider, CountryDataListProvider>();
        services.AddSingleton<InstanceDataListsFactory>();
        using var serviceProvider = services.BuildStrictServiceProvider();

        var factory = serviceProvider.GetRequiredService<InstanceDataListsFactory>();

        IInstanceDataListProvider dataListProvider = factory.GetDataListProvider("country");

        dataListProvider.Should().BeOfType<CountryDataListProvider>();
        dataListProvider.Id.Should().Be("country");
    }

    [Fact]
    public void GetInstanceDataListProvider_NoInstanceDataListProvider_ShouldReturnNullDataListProvider()
    {
        var services = new ServiceCollection();
        services.AddAppImplementationFactory();
        services.AddSingleton<InstanceDataListsFactory>();
        using var serviceProvider = services.BuildStrictServiceProvider();

        var factory = serviceProvider.GetRequiredService<InstanceDataListsFactory>();

        IInstanceDataListProvider dataListProvider = factory.GetDataListProvider("country");

        dataListProvider.Should().BeOfType<NullInstanceDataListProvider>();
        dataListProvider.Id.Should().Be(string.Empty);
    }

    internal class CountryDataListProvider : IInstanceDataListProvider
    {
        public string Id { get; set; } = "country";

        public Task<DataList> GetInstanceDataListAsync(
            InstanceIdentifier instanceId,
            string? language,
            Dictionary<string, string> keyValuePairs
        )
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
