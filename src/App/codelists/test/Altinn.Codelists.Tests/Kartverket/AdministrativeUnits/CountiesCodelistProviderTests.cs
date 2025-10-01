using Altinn.App.Core.Features;
using Altinn.Codelists.Kartverket.AdministrativeUnits;
using Altinn.Codelists.Tests.Kartverket.AdministrativeUnits.Mocks;

namespace Altinn.Codelists.Tests.Kartverket.AdministrativeUnits;

public class CountiesCodelistProviderTests
{
    [Fact]
    public async Task GetAppOptionsAsync_ShouldReturnListOfCounties()
    {
        var administrativeUnitsHttpClientMock = new AdministrativeUnitsHttpClientMock(
            Options.Create(new AdministrativeUnitsSettings())
        );
        IAppOptionsProvider appOptionsProvider = new CountiesCodelistProvider(administrativeUnitsHttpClientMock);

        var appOptions = await appOptionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());

        Assert.NotNull(appOptions.Options);
        Assert.Equal(11, appOptions.Options.Count);
        Assert.Equal("Vestland", appOptions.Options.First(x => x.Value == "46").Label);
    }
}
