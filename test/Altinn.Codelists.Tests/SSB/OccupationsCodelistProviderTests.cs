using Altinn.App.Core.Features;
using Altinn.Codelists.SSB;
using Altinn.Codelists.SSB.Clients;
using Altinn.Codelists.SSB.Models;
using Altinn.Codelists.Tests.SSB.Mocks;

namespace Altinn.Codelists.Tests.SSB;

public class OccupationsCodelistProviderTests
{
    [Fact]
    public async Task GetAppOptionsAsync_AllLevels_ShouldReturnListOfCodes()
    {
        var httpClientMock = new ClassificationsHttpClientMock(Options.Create(new ClassificationSettings()));
        IAppOptionsProvider appOptionsProvider = new ClassificationCodelistProvider(
            "yrker",
            Classification.Occupations,
            httpClientMock
        );

        var appOptions = await appOptionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());

        Assert.NotNull(appOptions.Options);
        Assert.Equal(582, appOptions.Options.Count);
        Assert.Equal("Akademiske yrker", appOptions.Options.First(x => x.Value == "2").Label);
        Assert.Equal("IKT-rådgivere", appOptions.Options.First(x => x.Value == "25").Label);
        Assert.Equal(
            "Programvare- og applikasjonsutviklere/analytikere",
            appOptions.Options.First(x => x.Value == "251").Label
        );
        Assert.Equal("Programvareutviklere", appOptions.Options.First(x => x.Value == "2512").Label);
    }

    [Fact]
    public async Task GetAppOptionsAsync_FirstLevelOnly_ShouldReturnListOfCodes()
    {
        var httpClientMock = new ClassificationsHttpClientMock(Options.Create(new ClassificationSettings()));
        IAppOptionsProvider appOptionsProvider = new ClassificationCodelistProvider(
            "yrker",
            Classification.Occupations,
            httpClientMock
        );

        var appOptions = await appOptionsProvider.GetAppOptionsAsync(
            "nb",
            new Dictionary<string, string>() { { "level", "1" } }
        );

        Assert.NotNull(appOptions.Options);
        Assert.Equal(10, appOptions.Options.Count);
        Assert.Equal("Militære yrker og uoppgitt", appOptions.Options.First(x => x.Value == "0").Label);
    }

    [Fact]
    public async Task GetAppOptionsAsync_DefaultFirstLevel_ShouldReturnListOfCodes()
    {
        var httpClientMock = new ClassificationsHttpClientMock(Options.Create(new ClassificationSettings()));
        IAppOptionsProvider appOptionsProvider = new ClassificationCodelistProvider(
            "næringsgruppering",
            Classification.IndustryGrouping,
            httpClientMock,
            new Dictionary<string, string>() { { "level", "1" } }
        );

        var appOptions = await appOptionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());

        Assert.NotNull(appOptions.Options);
        Assert.Equal(21, appOptions.Options.Count);
        Assert.Equal("Jordbruk, skogbruk og fiske", appOptions.Options.First(x => x.Value == "A").Label);
    }
}
