using Altinn.App.Core.Features;
using Altinn.Codelists.SSB;
using Altinn.Codelists.SSB.Clients;
using Altinn.Codelists.SSB.Models;
using Altinn.Codelists.Tests.SSB.Mocks;

namespace Altinn.Codelists.Tests.SSB;

public class IndustryGroupingCodelistProviderTests
{
    [Fact]
    public async Task GetAppOptionsAsync_AllLevels_ShouldReturnListOfCodes()
    {
        var httpClientMock = new ClassificationsHttpClientMock(Options.Create(new ClassificationSettings()));
        IAppOptionsProvider appOptionsProvider = new ClassificationCodelistProvider(
            "næringsgruppering",
            Classification.IndustryGrouping,
            httpClientMock
        );

        var appOptions = await appOptionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());

        Assert.NotNull(appOptions.Options);
        Assert.Equal(1811, appOptions.Options.Count);
        Assert.Equal("Jordbruk, skogbruk og fiske", appOptions.Options.First(x => x.Value == "A").Label);
        Assert.Equal(
            "Jordbruk og tjenester tilknyttet jordbruk, jakt og viltstell",
            appOptions.Options.First(x => x.Value == "01").Label
        );
        Assert.Equal("Dyrking av ettårige vekster", appOptions.Options.First(x => x.Value == "01.1").Label);
    }

    [Fact]
    public async Task GetAppOptionsAsync_FirstLevelOnly_ShouldReturnListOfCodes()
    {
        var httpClientMock = new ClassificationsHttpClientMock(Options.Create(new ClassificationSettings()));
        IAppOptionsProvider appOptionsProvider = new ClassificationCodelistProvider(
            "næringsgruppering",
            Classification.IndustryGrouping,
            httpClientMock
        );

        var appOptions = await appOptionsProvider.GetAppOptionsAsync(
            "nb",
            new Dictionary<string, string>() { { "level", "1" } }
        );

        Assert.NotNull(appOptions.Options);
        Assert.Equal(21, appOptions.Options.Count);
        Assert.Equal("Jordbruk, skogbruk og fiske", appOptions.Options.First(x => x.Value == "A").Label);
        Assert.Equal("1", appOptions.Parameters.First(x => x.Key == "level").Value);
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
        Assert.Equal("nb", appOptions.Parameters.First(x => x.Key == "language").Value);
    }
}
