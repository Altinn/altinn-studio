using Altinn.App.Core.Features;
using Altinn.Codelists.SSB;
using Altinn.Codelists.SSB.Clients;
using Altinn.Codelists.Tests.SSB.Mocks;

namespace Altinn.Codelists.Tests.SSB;

public class SmallGameVariantTests
{
    [Fact]
    public async Task GetAppOptionsAsync_ShouldReturnListOfCodes()
    {
        var httpClientMock = new ClassificationsHttpClientMock(Options.Create(new ClassificationSettings()));
        IAppOptionsProvider appOptionsProvider = new ClassificationCodelistProvider(
            "småvilt",
            74,
            httpClientMock,
            new Dictionary<string, string>
            {
                {
                    "variant",
                    "Hønsefugler, spurvefugler, skarver og due 2023-03  - variant av Klassifisering av småvilt 2017-04"
                },
            },
            new ClassificationOptions { MapDescriptionFunc = (classificationCode) => classificationCode.Name }
        );

        var appOptions = await appOptionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());

        Assert.NotNull(appOptions.Options);
        Assert.Equal(11, appOptions.Options.Count);
        Assert.Equal("Ravn", appOptions.Options.First(x => x.Value == "06").Label);
        Assert.Equal("Ravn", appOptions.Options.First(x => x.Value == "06").Description);
    }
}
