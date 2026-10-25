using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Implementation;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.App.Tests.Common.Auth;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Microsoft.Extensions.DependencyInjection;
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
    public string? Email { get; set; }
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
        services.AddSingleton(Mock.Of<IProfileClient>());
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

    private const string UserProfilePrefillJson = """{ "UserProfile": { "Email": "Prefill.Email" } }""";

    [Fact]
    public async Task PrefillDataModel_InAWorkflowCallback_FillsUserProfileFieldsFromTheActorsProfile()
    {
        var appResources = new Mock<IAppResources>();
        appResources.Setup(x => x.GetPrefillJson("model")).Returns(UserProfilePrefillJson);
        var callbackToken = new JwtSecurityTokenHandler().WriteToken(
            new JwtSecurityToken(claims: [new Claim("jti", Guid.NewGuid().ToString())])
        );
        var authenticationContext = new Mock<IAuthenticationContext>();
        authenticationContext
            .Setup(x => x.Current)
            .Returns(
                Authenticated.FromApp(
                    callbackToken,
                    parsedToken: null,
                    new AppIdentifier("ttd", "test-app"),
                    instanceId: null,
                    TestAuthentication.NewApplicationMetadata()
                )
            );
        var registerClient = new Mock<IRegisterClient>(MockBehavior.Strict);
        registerClient
            .Setup(x => x.GetPartyUnchecked(500600, StorageAuthenticationMethod.ServiceOwner(), default))
            .ReturnsAsync(new Party { PartyId = 500600 });
        var profileClient = new Mock<IProfileClient>(MockBehavior.Strict);
        profileClient
            .Setup(x => x.GetUserProfile(1337, StorageAuthenticationMethod.ServiceOwner(), default))
            .ReturnsAsync(new UserProfile { UserId = 1337, Email = "actor@example.com" });
        var services = new ServiceCollection();
        services.AddSingleton(registerClient.Object);
        services.AddSingleton(profileClient.Object);
        await using var sp = services.BuildStrictServiceProvider();
        var prefill = new PrefillSI(
            Mock.Of<ILogger<PrefillSI>>(),
            appResources.Object,
            authenticationContext.Object,
            sp
        );
        var dataModel = new PrefillTestDataModel();

        await prefill.PrefillDataModel("500600", "model", dataModel, null, new Actor { UserId = 1337 });

        Assert.Equal("actor@example.com", dataModel.Prefill?.Email);
    }

    [Fact]
    public async Task PrefillDataModel_InARequest_FillsUserProfileFieldsFromTheCurrentUser()
    {
        var appResources = new Mock<IAppResources>();
        appResources.Setup(x => x.GetPrefillJson("model")).Returns(UserProfilePrefillJson);
        var authenticationContext = new Mock<IAuthenticationContext>();
        authenticationContext
            .Setup(x => x.Current)
            .Returns(TestAuthentication.GetUserAuthentication(email: "user@example.com"));
        var services = new ServiceCollection();
        services.AddSingleton(Mock.Of<IRegisterClient>(MockBehavior.Strict));
        services.AddSingleton(Mock.Of<IProfileClient>(MockBehavior.Strict));
        await using var sp = services.BuildStrictServiceProvider();
        var prefill = new PrefillSI(
            Mock.Of<ILogger<PrefillSI>>(),
            appResources.Object,
            authenticationContext.Object,
            sp
        );
        var dataModel = new PrefillTestDataModel();

        await prefill.PrefillDataModel(
            TestAuthentication.DefaultUserPartyId.ToString(CultureInfo.InvariantCulture),
            "model",
            dataModel
        );

        Assert.Equal("user@example.com", dataModel.Prefill?.Email);
    }
}
