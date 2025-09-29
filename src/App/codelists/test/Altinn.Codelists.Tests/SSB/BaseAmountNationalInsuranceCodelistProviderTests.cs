using Altinn.App.Core.Features;
using Altinn.Codelists.SSB;
using Altinn.Codelists.SSB.Clients;
using Altinn.Codelists.SSB.Models;
using Altinn.Codelists.Tests.SSB.Mocks;

namespace Altinn.Codelists.Tests.SSB;

public class BaseAmountNationalInsuranceCodelistProviderTests
{
    [Fact]
    public async Task GetAppOptionsAsync_ShouldReturnListOfCodes()
    {
        var httpClientMock = new ClassificationsHttpClientMock(Options.Create(new ClassificationSettings()));
        IAppOptionsProvider appOptionsProvider = new ClassificationCodelistProvider(
            "grunnbeløpfolketrygden",
            Classification.BaseAmountNationalInsurance,
            httpClientMock
        );

        var appOptions = await appOptionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());

        Assert.NotNull(appOptions.Options);
        Assert.Equal(32, appOptions.Options.Count);
        Assert.Equal("111 477 kroner", appOptions.Options.First(x => x.Value == "2022").Label);
    }
}
