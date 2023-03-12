using Altinn.Codelists.Kartverket.AdministrativeUnits;
using Altinn.Codelists.Kartverket.AdministrativeUnits.Clients;

namespace Altinn.Codelists.Tests.Kartverket.AdministrativeUnits.Clients;

public class AdministrativeUnitsClientTests
{
    [Fact(Skip = "Disabled. This actually calls out to the api and is primarily used to test during development.")]
    public async Task GetCounties_NothingSpecified_ShouldReturnAllCounties()
    {
        var client = new AdministrativeUnitsHttpClient(Options.Create(new AdministrativeUnitsSettings()), new HttpClient());

        var counties = await client.GetCounties();

        counties.Should().HaveCountGreaterThan(2);
    }

    [Fact(Skip = "Disabled. This actually calls out to the api and is primarily used to test during development.")]
    public async Task GetMunicipalities_NothingSpecified_ShouldReturnAllMunicipalities()
    {
        var client = new AdministrativeUnitsHttpClient(Options.Create(new AdministrativeUnitsSettings()), new HttpClient());

        var municipalities = await client.GetMunicipalities();

        municipalities.Should().HaveCountGreaterThan(2);
    }

    [Fact(Skip = "Disabled. This actually calls out to the api and is primarily used to test during development.")]
    public async Task GetMunicipalities_CountySpecified_ShouldReturnMunicipalitiesWithinCounty()
    {
        var client = new AdministrativeUnitsHttpClient(Options.Create(new AdministrativeUnitsSettings()), new HttpClient());

        var municipalities = await client.GetMunicipalities("46");

        municipalities.Should().HaveCountGreaterThan(2);
    }
}