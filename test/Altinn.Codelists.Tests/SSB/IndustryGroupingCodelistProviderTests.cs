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
        IAppOptionsProvider appOptionsProvider = new ClassificationCodelistProvider("næringsgruppering", Classification.IndustryGrouping, httpClientMock);

        var appOptions = await appOptionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());

        appOptions.Options.Should().HaveCount(1811);
        appOptions.Options.First(x => x.Value == "A").Label.Should().Be("Jordbruk, skogbruk og fiske");
        appOptions.Options.First(x => x.Value == "01").Label.Should().Be("Jordbruk og tjenester tilknyttet jordbruk, jakt og viltstell");
        appOptions.Options.First(x => x.Value == "01.1").Label.Should().Be("Dyrking av ettårige vekster");
    }

    [Fact]
    public async Task GetAppOptionsAsync_FirstLevelOnly_ShouldReturnListOfCodes()
    {
        var httpClientMock = new ClassificationsHttpClientMock(Options.Create(new ClassificationSettings()));
        IAppOptionsProvider appOptionsProvider = new ClassificationCodelistProvider("næringsgruppering", Classification.IndustryGrouping, httpClientMock);

        var appOptions = await appOptionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>() { { "level", "1" } });

        appOptions.Options.Should().HaveCount(21);
        appOptions.Options.First(x => x.Value == "A").Label.Should().Be("Jordbruk, skogbruk og fiske");
        appOptions.Parameters.First(x => x.Key == "level").Value.Should().Be("1");
    }

    [Fact]
    public async Task GetAppOptionsAsync_DefaultFirstLevel_ShouldReturnListOfCodes()
    {
        var httpClientMock = new ClassificationsHttpClientMock(Options.Create(new ClassificationSettings()));
        IAppOptionsProvider appOptionsProvider = new ClassificationCodelistProvider("næringsgruppering", Classification.IndustryGrouping, httpClientMock, new Dictionary<string, string>() { { "level", "1" } } );

        var appOptions = await appOptionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());

        appOptions.Options.Should().HaveCount(21);
        appOptions.Options.First(x => x.Value == "A").Label.Should().Be("Jordbruk, skogbruk og fiske");
        appOptions.Parameters.First(x => x.Key == "language").Value.Should().Be("nb");
    }
}
