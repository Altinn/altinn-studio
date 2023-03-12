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
        IAppOptionsProvider appOptionsProvider = new ClassificationCodelistProvider("yrker", Classification.Occupations, httpClientMock);

        var appOptions = await appOptionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());

        appOptions.Options.Should().HaveCount(582);
        appOptions.Options.First(x => x.Value == "2").Label.Should().Be("Akademiske yrker");
        appOptions.Options.First(x => x.Value == "25").Label.Should().Be("IKT-rådgivere");
        appOptions.Options.First(x => x.Value == "251").Label.Should().Be("Programvare- og applikasjonsutviklere/analytikere");
        appOptions.Options.First(x => x.Value == "2512").Label.Should().Be("Programvareutviklere");
    }

    [Fact]
    public async Task GetAppOptionsAsync_FirstLevelOnly_ShouldReturnListOfCodes()
    {
        var httpClientMock = new ClassificationsHttpClientMock(Options.Create(new ClassificationSettings()));
        IAppOptionsProvider appOptionsProvider = new ClassificationCodelistProvider("yrker", Classification.Occupations, httpClientMock);

        var appOptions = await appOptionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>() { { "level", "1" } });

        appOptions.Options.Should().HaveCount(10);
        appOptions.Options.First(x => x.Value == "0").Label.Should().Be("Militære yrker og uoppgitt");
    }

    [Fact]
    public async Task GetAppOptionsAsync_DefaultFirstLevel_ShouldReturnListOfCodes()
    {
        var httpClientMock = new ClassificationsHttpClientMock(Options.Create(new ClassificationSettings()));
        IAppOptionsProvider appOptionsProvider = new ClassificationCodelistProvider("næringsgruppering", Classification.IndustryGrouping, httpClientMock, new Dictionary<string, string>() { { "level", "1" } } );

        var appOptions = await appOptionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());

        appOptions.Options.Should().HaveCount(21);
        appOptions.Options.First(x => x.Value == "A").Label.Should().Be("Jordbruk, skogbruk og fiske");
    }
}
