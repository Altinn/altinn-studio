using Altinn.App.Core.Features;
using Altinn.Codelists.SSB;
using Altinn.Codelists.SSB.Clients;
using Altinn.Codelists.SSB.Models;
using Altinn.Codelists.Tests.SSB.Mocks;

namespace Altinn.Codelists.Tests.SSB;

public class SexCodelistProviderTests
{
    [Fact]
    public async Task GetAppOptionsAsync_EnumProvided_ShouldReturnListOfCodes()
    {
        var httpClientMock = new ClassificationsHttpClientMock(Options.Create(new ClassificationSettings()));
        IAppOptionsProvider appOptionsProvider = new ClassificationCodelistProvider(
            "sex",
            Classification.Sex,
            httpClientMock
        );

        var appOptions = await appOptionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());

        Assert.NotNull(appOptions.Options);
        Assert.Equal(2, appOptions.Options.Count);
        Assert.Equal("Kvinne", appOptions.Options.First(x => x.Value == "2").Label);
    }

    [Fact]
    public async Task GetAppOptionsAsync_IdProvided_ShouldReturnListOfCodes()
    {
        var httpClientMock = new ClassificationsHttpClientMock(Options.Create(new ClassificationSettings()));
        IAppOptionsProvider appOptionsProvider = new ClassificationCodelistProvider("sex", 2, httpClientMock);

        var appOptions = await appOptionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());

        Assert.NotNull(appOptions.Options);
        Assert.Equal(2, appOptions.Options.Count);
        Assert.Equal("Mann", appOptions.Options.First(x => x.Value == "1").Label);
    }
}
