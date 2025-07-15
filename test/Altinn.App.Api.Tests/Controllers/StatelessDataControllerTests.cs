using System.Globalization;
using System.Net.Http.Headers;
using System.Security.Claims;
using Altinn.App.Api.Controllers;
using Altinn.App.Api.Tests.Controllers.TestResources;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Prefill;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Registers;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Altinn.App.Api.Tests.Controllers;

public class StatelessDataControllerTests
{
    private sealed record SimpleFixture(IServiceProvider ServiceProvider) : IDisposable
    {
        public StatelessDataController Controller => ServiceProvider.GetRequiredService<StatelessDataController>();

        public Mock<T> Mock<T>()
            where T : class => Moq.Mock.Get(ServiceProvider.GetRequiredService<T>());

        public static SimpleFixture Create()
        {
            var services = new ServiceCollection();
            services.AddLogging(builder => builder.AddProvider(NullLoggerProvider.Instance));
            services.AddAppImplementationFactory();

            services.AddSingleton(new Mock<IAppModel>().Object);
            services.AddSingleton(new Mock<IAppResources>().Object);
            services.AddSingleton(new Mock<IDataProcessor>().Object);
            services.AddSingleton(new Mock<IPrefill>().Object);
            services.AddSingleton(new Mock<IAltinnPartyClient>().Object);
            services.AddSingleton(new Mock<IPDP>().Object);
            services.AddSingleton(new Mock<IAuthenticationContext>().Object);

            services.AddTransient<StatelessDataController>();

            var sp = services.BuildStrictServiceProvider();
            return new SimpleFixture(sp);
        }

        public void Dispose() => (ServiceProvider as IDisposable)?.Dispose();
    }

    [Fact]
    public async Task Get_Returns_BadRequest_when_dataType_is_null()
    {
        // Arrange
        using var fixture = SimpleFixture.Create();
        var statelessDataController = fixture.Controller;

        string dataType = null!; // this is what we're testing

        // Act
        var result = await statelessDataController.Get("ttd", "demo-app", dataType, "partyId:123", null);

        // Assert
        result
            .Should()
            .BeOfType<BadRequestObjectResult>()
            .Which.Value.Should()
            .Be($"Invalid dataType {string.Empty} provided. Please provide a valid dataType as query parameter.");
        fixture.Mock<IDataProcessor>().VerifyNoOtherCalls();
        fixture.Mock<IAppResources>().VerifyNoOtherCalls();
        fixture.Mock<IPrefill>().VerifyNoOtherCalls();
        fixture.Mock<IAltinnPartyClient>().VerifyNoOtherCalls();
        fixture.Mock<IPDP>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Get_Returns_BadRequest_when_appResource_classRef_is_null()
    {
        // Arrange
        using var fixture = SimpleFixture.Create();
        var statelessDataController = fixture.Controller;
        var dataType = "some-value";

        // Act
        fixture.Mock<IAppResources>().Setup(x => x.GetClassRefForLogicDataType(dataType)).Returns(string.Empty);
        var result = await statelessDataController.Get("ttd", "demo-app", dataType, "partyId:123", null);

        // Assert
        result
            .Should()
            .BeOfType<BadRequestObjectResult>()
            .Which.Value.Should()
            .Be($"Invalid dataType {dataType} provided. Please provide a valid dataType as query parameter.");
        fixture.Mock<IAppResources>().Verify(x => x.GetClassRefForLogicDataType(dataType), Times.Once);
        fixture.Mock<IAppResources>().VerifyNoOtherCalls();
        fixture.Mock<IDataProcessor>().VerifyNoOtherCalls();
        fixture.Mock<IPrefill>().VerifyNoOtherCalls();
        fixture.Mock<IAltinnPartyClient>().VerifyNoOtherCalls();
        fixture.Mock<IPDP>().VerifyNoOtherCalls();
    }

    // WebApplicationFactory that allows testing how things work when the user has two
    // party headers.
    private class StatelessDataControllerWebApplicationFactory : WebApplicationFactory<Program>
    {
        public Mock<IProfileClient> ProfileClientMoq { get; set; } = new();
        public Mock<IAltinnPartyClient> RegisterClientMoq { get; set; } = new();
        public Mock<IAppResources> AppResourcesMoq { get; set; } = new();

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);

            builder.ConfigureLogging(options =>
            {
                // Don't write logs to the console
                // consider writing logs to a test output
                options.ClearProviders();
            });

            builder.ConfigureServices(services =>
            {
                services.AddTransient<IProfileClient>((sp) => ProfileClientMoq.Object);
                services.AddTransient<IAltinnPartyClient>((sp) => RegisterClientMoq.Object);
                services.AddTransient<IAppResources>((sp) => AppResourcesMoq.Object);
            });
        }
    }

    [Fact]
    public async Task Get_Returns_BadRequest_when_party_header_count_greater_than_one()
    {
        // Arrange
        using var factory = new StatelessDataControllerWebApplicationFactory();

        var client = factory.CreateClient();
        string token = TestAuthentication.GetUserToken(1337);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);
        using var request = new HttpRequestMessage(HttpMethod.Get, "/tdd/demo-app/v1/data?dataType=xml");
        request.Headers.Add("party", new string[] { "partyid:234", "partyid:234" }); // Double header

        factory
            .AppResourcesMoq.Setup(ar => ar.GetClassRefForLogicDataType(It.IsAny<string>()))
            .Returns("Not.In.Valid.Namespace.ClassRef");
        factory
            .RegisterClientMoq.Setup(p => p.GetParty(234))
            .ReturnsAsync(new Platform.Register.Models.Party { PartyId = 234 });

        // Act
        var response = await client.SendAsync(request);
        var responseText = await response.Content.ReadAsStringAsync();

        // Assert
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.BadRequest);
        responseText.Should().Contain("Invalid party header.");
    }

    [Fact]
    public async Task Get_Returns_Forbidden_when_party_has_no_rights()
    {
        // Arrange
        using var factory = new StatelessDataControllerWebApplicationFactory();

        var client = factory.CreateClient();
        string token = TestAuthentication.GetUserToken(1337);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);
        using var request = new HttpRequestMessage(HttpMethod.Get, "/tdd/demo-app/v1/data?dataType=xml");
        request.Headers.Add("party", new string[] { "partyid:234" });

        factory
            .AppResourcesMoq.Setup(ar => ar.GetClassRefForLogicDataType(It.IsAny<string>()))
            .Returns("Not.In.Valid.Namespace.ClassRef");
        factory
            .RegisterClientMoq.Setup(p => p.GetParty(234))
            .ReturnsAsync(new Platform.Register.Models.Party { PartyId = 234 });

        // Act
        var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Get_Returns_BadRequest_when_instance_owner_is_empty_party_header()
    {
        // Arrange
        using var fixture = SimpleFixture.Create();
        var statelessDataController = fixture.Controller;
        var dataType = "some-value";

        // Act
        fixture
            .Mock<IAppResources>()
            .Setup(x => x.GetClassRefForLogicDataType(dataType))
            .Returns(typeof(DummyModel).FullName!);
        var result = await statelessDataController.Get("ttd", "demo-app", dataType, string.Empty, null);

        // Assert
        var response = result.Should().BeOfType<BadRequestObjectResult>().Which;
        response.StatusCode.Should().Be(400);
        response.Value.Should().BeOfType<string>().Which.Should().Contain("Invalid party header.");
        fixture.Mock<IAppResources>().Verify(x => x.GetClassRefForLogicDataType(dataType), Times.Once);
        fixture.Mock<IAppResources>().VerifyNoOtherCalls();
        fixture.Mock<IDataProcessor>().VerifyNoOtherCalls();
        fixture.Mock<IPrefill>().VerifyNoOtherCalls();
        fixture.Mock<IAltinnPartyClient>().VerifyNoOtherCalls();
        fixture.Mock<IPDP>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Get_Returns_BadRequest_when_instance_owner_is_empty_user_in_context()
    {
        // Arrange
        using var fixture = SimpleFixture.Create();
        var statelessDataController = fixture.Controller;
        var dataType = "some-value";
        statelessDataController.ControllerContext = new ControllerContext();
        statelessDataController.ControllerContext.HttpContext = new DefaultHttpContext();
        statelessDataController.ControllerContext.HttpContext.User = new ClaimsPrincipal(
            new List<ClaimsIdentity>()
            {
                new ClaimsIdentity(new List<Claim> { new Claim(AltinnUrns.PartyId, string.Empty, "#integer") }),
            }
        );

        // Act
        fixture
            .Mock<IAppResources>()
            .Setup(x => x.GetClassRefForLogicDataType(dataType))
            .Returns(typeof(DummyModel).FullName!);
        var result = await statelessDataController.Get("ttd", "demo-app", dataType, null!, null);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>().Which.StatusCode.Should().Be(400);
        fixture.Mock<IAppResources>().Verify(x => x.GetClassRefForLogicDataType(dataType), Times.Once);
        fixture.Mock<IAppResources>().VerifyNoOtherCalls();
        fixture.Mock<IDataProcessor>().VerifyNoOtherCalls();
        fixture.Mock<IPrefill>().VerifyNoOtherCalls();
        fixture.Mock<IAltinnPartyClient>().VerifyNoOtherCalls();
        fixture.Mock<IPDP>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Get_Returns_Forbidden_when_returned_descision_is_Deny()
    {
        // Arrange
        using var fixture = SimpleFixture.Create();
        var statelessDataController = fixture.Controller;
        var dataType = "some-value";
        statelessDataController.ControllerContext = new ControllerContext();
        statelessDataController.ControllerContext.HttpContext = new DefaultHttpContext();
        statelessDataController.ControllerContext.HttpContext.User = TestAuthentication.GetUserPrincipal();
        fixture
            .Mock<IAuthenticationContext>()
            .Setup(c => c.Current)
            .Returns(TestAuthentication.GetUserAuthentication());
        fixture
            .Mock<IPDP>()
            .Setup(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(
                new XacmlJsonResponse()
                {
                    Response = new List<XacmlJsonResult>()
                    {
                        new XacmlJsonResult() { Decision = XacmlContextDecision.Deny.ToString() },
                    },
                }
            );

        // Act
        fixture
            .Mock<IAppResources>()
            .Setup(x => x.GetClassRefForLogicDataType(dataType))
            .Returns(typeof(DummyModel).FullName!);
        var result = await statelessDataController.Get("ttd", "demo-app", dataType, null!, null);

        // Assert
        result.Should().BeOfType<StatusCodeResult>().Which.StatusCode.Should().Be(403);
        fixture.Mock<IAppResources>().Verify(x => x.GetClassRefForLogicDataType(dataType), Times.Once);
        fixture.Mock<IAppResources>().VerifyNoOtherCalls();
        fixture.Mock<IPDP>().Verify(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()));
        fixture.Mock<IPDP>().VerifyNoOtherCalls();
        fixture.Mock<IDataProcessor>().VerifyNoOtherCalls();
        fixture.Mock<IPrefill>().VerifyNoOtherCalls();
        fixture.Mock<IAltinnPartyClient>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Get_Returns_OK_with_appModel()
    {
        // Arrange
        using var fixture = SimpleFixture.Create();
        var statelessDataController = fixture.Controller;
        var dataType = "some-value";
        var classRef = typeof(DummyModel).FullName!;
        statelessDataController.ControllerContext = new ControllerContext();
        statelessDataController.ControllerContext.HttpContext = new DefaultHttpContext();
        var auth = TestAuthentication.GetUserAuthentication();
        statelessDataController.ControllerContext.HttpContext.User = TestAuthentication.GetUserPrincipal();
        fixture.Mock<IAuthenticationContext>().Setup(c => c.Current).Returns(auth);
        fixture
            .Mock<IPDP>()
            .Setup(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(
                new XacmlJsonResponse()
                {
                    Response = new List<XacmlJsonResult>()
                    {
                        new XacmlJsonResult() { Decision = XacmlContextDecision.Permit.ToString() },
                    },
                }
            );
        fixture.Mock<IAppModel>().Setup(a => a.Create(classRef)).Returns(new DummyModel());

        // Act
        fixture.Mock<IAppResources>().Setup(x => x.GetClassRefForLogicDataType(dataType)).Returns(classRef);
        var result = await statelessDataController.Get("ttd", "demo-app", dataType, null!, null);

        // Assert
        result.Should().BeOfType<OkObjectResult>().Which.StatusCode.Should().Be(200);
        result.Should().BeOfType<OkObjectResult>().Which.Value.Should().BeOfType<DummyModel>();
        fixture.Mock<IAppResources>().Verify(x => x.GetClassRefForLogicDataType(dataType), Times.Once);
        fixture.Mock<IPDP>().Verify(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()));
        fixture.Mock<IAppModel>().Verify(a => a.Create(classRef), Times.Once);
        fixture
            .Mock<IPrefill>()
            .Verify(p =>
                p.PrefillDataModel(
                    auth.SelectedPartyId.ToString(CultureInfo.InvariantCulture),
                    dataType,
                    It.IsAny<DummyModel>(),
                    null
                )
            );
        fixture
            .Mock<IDataProcessor>()
            .Verify(a => a.ProcessDataRead(It.IsAny<Instance>(), null, It.IsAny<DummyModel>(), null));
        fixture.Mock<IAppResources>().VerifyNoOtherCalls();
        fixture.Mock<IPDP>().VerifyNoOtherCalls();
        fixture.Mock<IDataProcessor>().VerifyNoOtherCalls();
        fixture.Mock<IPrefill>().VerifyNoOtherCalls();
        fixture.Mock<IAltinnPartyClient>().VerifyNoOtherCalls();
    }
}
