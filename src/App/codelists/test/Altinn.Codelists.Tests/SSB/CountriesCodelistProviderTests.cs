using Altinn.App.Core.Features;
using Altinn.Codelists.SSB;
using Altinn.Codelists.SSB.Clients;
using Altinn.Codelists.SSB.Models;
using Altinn.Codelists.Tests.SSB.Mocks;

namespace Altinn.Codelists.Tests.SSB;

public class CountriesStatusCodelistProviderTests
{
    [Fact]
    public async Task GetAppOptionsAsync_ShouldReturnListOfCodes()
    {
        var httpClientMock = new ClassificationsHttpClientMock(Options.Create(new ClassificationSettings()));
        IAppOptionsProvider appOptionsProvider = new ClassificationCodelistProvider(
            "land",
            Classification.Countries,
            httpClientMock
        );

        var appOptions = await appOptionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());

        Assert.NotNull(appOptions.Options);
        Assert.Equal(252, appOptions.Options.Count);
        Assert.Equal("Norge", appOptions.Options.First(x => x.Value == "NOR").Label);
    }
}
