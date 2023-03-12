using Altinn.App.Core.Features;
using Altinn.Codelists.Kartverket.AdministrativeUnits;
using Altinn.Codelists.Tests.Kartverket.AdministrativeUnits.Mocks;

namespace Altinn.Codelists.Tests.Kartverket.AdministrativeUnits;

public class MunicipalitiesCodelistProviderTests
{
    [Fact]
    public async Task GetAppOptionsAsync_NoCountySpecified_ShouldReturnListOfAllMunicipalities()
    {
        var administrativeUnitsHttpClientMock = new AdministrativeUnitsHttpClientMock(Options.Create(new AdministrativeUnitsSettings()));
        IAppOptionsProvider appOptionsProvider = new MunicipalitiesCodelistProvider(administrativeUnitsHttpClientMock);

        var appOptions = await appOptionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());

        appOptions.Options.Should().HaveCount(356);
        appOptions.Options.First(x => x.Value == "4640").Label.Should().Be("Sogndal");
        appOptions.Options.First(x => x.Value == "1813").Label.Should().Be("Brønnøy");
    }

    [Fact]
    public async Task GetAppOptionsAsync_CountySpecified_ShouldReturnListOfMunicipalitiesByCounty()
    {
        var administrativeUnitsHttpClientMock = new AdministrativeUnitsHttpClientMock(Options.Create(new AdministrativeUnitsSettings()));
        IAppOptionsProvider appOptionsProvider = new MunicipalitiesCodelistProvider(administrativeUnitsHttpClientMock);

        var appOptions = await appOptionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>() { { "fnr", "46" } });

        appOptions.Options.Should().HaveCount(43);
        appOptions.Options.First(x => x.Value == "4640").Label.Should().Be("Sogndal");
        appOptions.Options.FirstOrDefault(x => x.Value == "1813").Should().BeNull();

    }
}
