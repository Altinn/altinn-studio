using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Implementation;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.App.Core.Tests;

public class PrefillTestDataModel
{
    public TestPrefillFields? Prefill { get; set; }

    public string? ExternalUrn { get; set; }
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
    public async Task PrefillDataModel_AssignsValuesCorrectly()
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
        var authenticationContextMock = new Mock<IAuthenticationContext>();
        var services = new ServiceCollection();
        var registryClientMock = new Mock<IRegisterClient>();
        services.AddSingleton<IRegisterClient>(registryClientMock.Object);
        await using var sp = services.BuildStrictServiceProvider();

        var prefillToTest = new PrefillSI(
            loggerMock.Object,
            appResourcesMock.Object,
            authenticationContextMock.Object,
            sp
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

    [Fact]
    public async Task PrefillDataModel_FromPrefillJson_PrefillsExternalUrnFromUserProfileParty()
    {
        const int userId = TestAuthentication.DefaultUserId;
        const int partyId = TestAuthentication.DefaultUserPartyId;
        const string externalUrn = "urn:altinn:person:identifier-no:01039012345";

        var party = new Party()
        {
            PartyId = partyId,
            PartyUuid = Guid.NewGuid(),
            PartyTypeName = PartyType.Person,
            SSN = "01039012345",
            Name = "Test Testesen",
            ExternalUrn = externalUrn,
        };
        var userProfile = new UserProfile()
        {
            UserId = userId,
            PartyId = partyId,
            Party = party,
        };

        var token = TestAuthentication.GetUserToken(userId: userId, partyId: partyId);
        var auth = Authenticated.From(
            token,
            null,
            true,
            TestAuthentication.NewApplicationMetadata(),
            getSelectedParty: () => $"{partyId}",
            getUserProfile: uid => Task.FromResult<UserProfile?>(uid == userId ? userProfile : null),
            lookupUserParty: pid => Task.FromResult<Party?>(pid == partyId ? party : null),
            lookupOrgParty: _ => throw new NotImplementedException(),
            getPartyList: uid => Task.FromResult<List<Party>?>(uid == userId ? [party] : null),
            validateSelectedParty: (_, _) => Task.FromResult<bool?>(true)
        );

        const string prefillJson = """
            {
              "UserProfile": {
                "Party.ExternalUrn": "ExternalUrn"
              }
            }
            """;

        var loggerMock = new Mock<ILogger<PrefillSI>>();
        var appResourcesMock = new Mock<IAppResources>();
        appResourcesMock.Setup(a => a.GetPrefillJson("ServiceModel")).Returns(prefillJson);
        var authenticationContextMock = new Mock<IAuthenticationContext>();
        authenticationContextMock.Setup(a => a.Current).Returns(auth);
        var services = new ServiceCollection();
        var registryClientMock = new Mock<IRegisterClient>();
        services.AddSingleton<IRegisterClient>(registryClientMock.Object);
        await using var sp = services.BuildStrictServiceProvider();

        var prefillToTest = new PrefillSI(
            loggerMock.Object,
            appResourcesMock.Object,
            authenticationContextMock.Object,
            sp
        );

        var dataModel = new PrefillTestDataModel();

        await prefillToTest.PrefillDataModel(partyId.ToString(), "ServiceModel", dataModel);

        Assert.Equal(externalUrn, dataModel.ExternalUrn);
    }
}
