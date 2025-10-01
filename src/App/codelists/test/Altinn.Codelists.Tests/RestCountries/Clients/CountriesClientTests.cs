using Altinn.Codelists.RestCountries;
using Altinn.Codelists.RestCountries.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Codelists.Tests.RestCountries.Clients;

public class CountriesClientTests
{
    private readonly ITestOutputHelper _output;

    public CountriesClientTests(ITestOutputHelper outputHelper)
    {
        _output = outputHelper;
    }

    private sealed record Fixture(IServiceProvider ServiceProvider, ICountryClient Client) : IAsyncDisposable
    {
        public async ValueTask DisposeAsync()
        {
            if (ServiceProvider is IAsyncDisposable disposable)
                await disposable.DisposeAsync();
        }

        public static Fixture Create()
        {
            var services = new ServiceCollection();
            services.AddRestCountriesClient();

            var serviceProvider = services.BuildServiceProvider(
                new ServiceProviderOptions { ValidateOnBuild = true, ValidateScopes = true }
            );

            var client = serviceProvider.GetRequiredService<ICountryClient>();
            return new(serviceProvider, client);
        }
    }

    [Fact]
    public async Task GetCountries_NoFilter_ShouldReturnAll()
    {
        await using var fixture = Fixture.Create();
        var client = fixture.Client;

        var countries = await client.GetCountries();

        Assert.Equal(250, countries.Count);
    }

    [Fact]
    public async Task GetCountries_FilterOnRegion_ShouldReturnOnlyInRegion()
    {
        await using var fixture = Fixture.Create();
        var client = fixture.Client;

        var countries = await client.GetCountries(new List<Filter>() { new Filter() { Region = "Europe" } });

        Assert.Equal(53, countries.Count);
    }

    [Fact]
    public async Task GetCountries_FilterOnMultipleRegions_ShouldReturnOnlyInRegions()
    {
        await using var fixture = Fixture.Create();
        var client = fixture.Client;

        var countries = await client.GetCountries(
            new List<Filter>()
            {
                new Filter() { Region = "Europe" },
                new Filter() { Region = "Asia", SubRegion = "Eastern Asia" },
            }
        );

        countries.ForEach(c =>
        {
            _output.WriteLine(c.Name.Common);
        });
        Assert.Equal(61, countries.Count);
    }
}
