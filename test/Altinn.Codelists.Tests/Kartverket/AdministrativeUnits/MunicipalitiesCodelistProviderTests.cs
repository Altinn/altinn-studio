using Altinn.App.Core.Features;
using Altinn.Codelists.Kartverket.AdministrativeUnits;
using Altinn.Codelists.Tests.Kartverket.AdministrativeUnits.Mocks;

namespace Altinn.Codelists.Tests.Kartverket.AdministrativeUnits;

public class MunicipalitiesCodelistProviderTests
{
    [Fact]
    public async Task GetAppOptionsAsync_NoCountySpecified_ShouldReturnListOfAllMunicipalities()
    {
        var administrativeUnitsHttpClientMock = new AdministrativeUnitsHttpClientMock(
            Options.Create(new AdministrativeUnitsSettings())
        );
        IAppOptionsProvider appOptionsProvider = new MunicipalitiesCodelistProvider(administrativeUnitsHttpClientMock);

        var appOptions = await appOptionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());

        Assert.NotNull(appOptions.Options);
        Assert.Equal(356, appOptions.Options.Count);
        Assert.Equal("Sogndal", appOptions.Options.First(x => x.Value == "4640").Label);
        Assert.Equal("Brønnøy", appOptions.Options.First(x => x.Value == "1813").Label);
    }

    [Fact]
    public async Task GetAppOptionsAsync_CountySpecified_ShouldReturnListOfMunicipalitiesByCounty()
    {
        var administrativeUnitsHttpClientMock = new AdministrativeUnitsHttpClientMock(
            Options.Create(new AdministrativeUnitsSettings())
        );
        IAppOptionsProvider appOptionsProvider = new MunicipalitiesCodelistProvider(administrativeUnitsHttpClientMock);

        var appOptions = await appOptionsProvider.GetAppOptionsAsync(
            "nb",
            new Dictionary<string, string>() { { "fnr", "46" } }
        );

        Assert.NotNull(appOptions.Options);
        Assert.Equal(43, appOptions.Options.Count);
        Assert.Equal("Sogndal", appOptions.Options.First(x => x.Value == "4640").Label);
        Assert.Null(appOptions.Options.FirstOrDefault(x => x.Value == "1813"));
    }
}
