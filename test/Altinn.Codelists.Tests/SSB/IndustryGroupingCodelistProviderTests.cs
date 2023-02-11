using Altinn.App.Core.Features;
using Altinn.Codelists.SSB;
using Altinn.Codelists.SSB.Clients;
using Altinn.Codelists.Tests.SSB.Mocks;

namespace Altinn.Codelists.Tests.Kartverket.AdministrativeUnits;

public class IndustryGroupingCodelistProviderTests
{
    [Fact]
    public async Task GetAppOptionsAsync_ShouldReturnListOfCodes()
    {
        var httpClientMock = new ClassificationsHttpClientMock(Options.Create(new ClassificationSettings()));
        IAppOptionsProvider appOptionsProvider = new IndustryGroupingCodelistProvider(httpClientMock);

        var appOptions = await appOptionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());

        appOptions.Options.Should().HaveCount(1811);
        appOptions.Options.First(x => x.Value == "A").Label.Should().Be("Jordbruk, skogbruk og fiske");
        appOptions.Options.First(x => x.Value == "01").Label.Should().Be("Jordbruk og tjenester tilknyttet jordbruk, jakt og viltstell");
        appOptions.Options.First(x => x.Value == "01.1").Label.Should().Be("Dyrking av ettårige vekster");
    }
}
