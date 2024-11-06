using Altinn.App.Core.Features;
using Altinn.Codelists.SSB.Clients;
using Altinn.Codelists.SSB;
using Altinn.Codelists.Tests.SSB.Mocks;

namespace Altinn.Codelists.Tests.SSB;

public class UnitsCodelistProviderTests
{
    [Fact]
    public async Task GetAppOptionsAsync_SortedBySelectCodes_ShouldReturnListOfCodes()
    {
        var httpClientMock = new ClassificationsHttpClientMock(Options.Create(new ClassificationSettings()));
        IAppOptionsProvider appOptionsProvider = new ClassificationCodelistProvider(
            "målenheter", 303, httpClientMock, 
            new Dictionary<string, string>() { { "selectCodes", "13.03,13.04,13.02,15.06,03.01,09.03,02.02" },{ "orderBy", "selectCodes" } },
            new ClassificationOptions { MapDescriptionFunc = (classificationCode) =>  classificationCode.ShortName }
            );

        var appOptions = await appOptionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());

        appOptions.Options.Should().HaveCount(7);
        appOptions.Options.First().Label.Should().Be("kilogram");
        appOptions.Options.Last().Label.Should().Be("stykk");
    }
}
