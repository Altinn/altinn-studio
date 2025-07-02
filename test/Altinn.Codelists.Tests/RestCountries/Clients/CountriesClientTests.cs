using Altinn.Codelists.RestCountries.Clients;
using Altinn.Codelists.RestCountries.Models;

namespace Altinn.Codelists.Tests.RestCountries.Clients;

public class CountriesClientTests
{
    private readonly ITestOutputHelper _output;

    public CountriesClientTests(ITestOutputHelper outputHelper)
    {
        _output = outputHelper;
    }

    [Fact]
    public async Task GetCountries_NoFilter_ShouldReturnAll()
    {
        var countriesClient = new CountriesClient();

        var countries = await countriesClient.GetCountries();

        Assert.Equal(250, countries.Count);
    }

    [Fact]
    public async Task GetCountries_FilterOnRegion_ShouldReturnOnlyInRegion()
    {
        var countriesClient = new CountriesClient();

        var countries = await countriesClient.GetCountries(new List<Filter>() { new Filter() { Region = "Europe" } });

        Assert.Equal(53, countries.Count);
    }

    [Fact]
    public async Task GetCountries_FilterOnMultipleRegions_ShouldReturnOnlyInRegions()
    {
        var countriesClient = new CountriesClient();

        var countries = await countriesClient.GetCountries(
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
