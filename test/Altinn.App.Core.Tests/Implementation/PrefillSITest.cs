using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Implementation;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Registers;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.App.Core.Tests;

public class PrefillTestDataModel
{
    public TestPrefillFields? Prefill { get; set; }
}

public class TestPrefillFields
{
    public string? EraSourceEnvironment { get; set; }
    public string? KanOppretteAarligMelding { get; set; }
    public string? ArkivSaksId { get; set; }
    public string? InnsendingSvarfrist { get; set; }
    public string? YrkesskadeforsikringPolisenummer { get; set; }
    public string? YrkesskadeforsikringNavn { get; set; }
    public string? YrkesskadeforsikringGyldigTilDato { get; set; }
}

public class PrefillSITests
{
    [Fact]
    public void PrefillDataModel_AssignsValuesCorrectly()
    {
        var externalPrefill = new Dictionary<string, string>
        {
            { "Prefill.EraSourceEnvironment", "prod" },
            { "Prefill.KanOppretteAarligMelding", "True" },
            { "Prefill.ArkivSaksId", "1203228" },
            { "Prefill.InnsendingSvarfrist", "2025-01-01T00:00:00.0000000" },
            { "Prefill.YrkesskadeforsikringPolisenummer", "301738.1" },
            { "Prefill.YrkesskadeforsikringNavn", "S'oderberg og Partners" },
            { "Prefill.YrkesskadeforsikringGyldigTilDato", "2023-12-31T12:00:00.000+01:00" },
        };

        var dataModel = new PrefillTestDataModel();

        var loggerMock = new Mock<ILogger<PrefillSI>>();
        var appResourcesMock = new Mock<IAppResources>();
        var altinnPartyClientMock = new Mock<IAltinnPartyClient>();
        var authenticationContextMock = new Mock<IAuthenticationContext>();

        var prefillToTest = new PrefillSI(
            loggerMock.Object,
            appResourcesMock.Object,
            altinnPartyClientMock.Object,
            authenticationContextMock.Object
        );

        prefillToTest.PrefillDataModel(dataModel, externalPrefill, continueOnError: false);

        Assert.NotNull(dataModel.Prefill);
        Assert.Equal("prod", dataModel.Prefill.EraSourceEnvironment);
        Assert.Equal("True", dataModel.Prefill.KanOppretteAarligMelding);
        Assert.Equal("1203228", dataModel.Prefill.ArkivSaksId);
        Assert.Equal("2025-01-01T00:00:00.0000000", dataModel.Prefill.InnsendingSvarfrist);
        Assert.Equal("301738.1", dataModel.Prefill.YrkesskadeforsikringPolisenummer);
        Assert.Equal("S'oderberg og Partners", dataModel.Prefill.YrkesskadeforsikringNavn);
        Assert.Equal("2023-12-31T12:00:00.000+01:00", dataModel.Prefill.YrkesskadeforsikringGyldigTilDato);
    }
}
