using Altinn.App.Core.Features;
using Altinn.Codelists.SSB;
using Altinn.Codelists.SSB.Clients;
using Altinn.Codelists.Tests.SSB.Mocks;

namespace Altinn.Codelists.Tests.SSB;

public class MaritalStatusCodelistProviderTests
{
    [Fact]
    public async Task GetAppOptionsAsync_ShouldReturnListOfCodes()
    {
        var httpClientMock = new ClassificationsHttpClientMock(Options.Create(new ClassificationSettings()));
        IAppOptionsProvider appOptionsProvider = new MaritalStatusCodelistProvider(httpClientMock);

        var appOptions = await appOptionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());

        appOptions.Options.Should().HaveCount(9);
        appOptions.Options.First(x => x.Value == "2").Label.Should().Be("Gift");
    }
}
