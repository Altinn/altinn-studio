using System.Security.Claims;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Action;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Process.Authorization;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Auth;

public class AuthorizationServiceTests
{
    private sealed record Fixture(IServiceProvider ServiceProvider) : IDisposable
    {
        public AuthorizationService AuthorizationService =>
            (AuthorizationService)ServiceProvider.GetRequiredService<IAuthorizationService>();

        public TelemetrySink TelemetrySink => ServiceProvider.GetRequiredService<TelemetrySink>();

        public IUserActionAuthorizerProvider UserActionAuthorizerProvider =>
            ServiceProvider.GetRequiredService<IUserActionAuthorizerProvider>();

        public TestAuthorizer1 TestAuthorizer1 => ServiceProvider.GetRequiredService<TestAuthorizer1>();
        public TestAuthorizer2 TestAuthorizer2 => ServiceProvider.GetRequiredService<TestAuthorizer2>();
        public TestAuthorizer3 TestAuthorizer3 => ServiceProvider.GetRequiredService<TestAuthorizer3>();

        public Mock<T> Mock<T>()
            where T : class => Moq.Mock.Get(ServiceProvider.GetRequiredService<T>());

        public void Dispose() => (ServiceProvider as IDisposable)?.Dispose();

        public static Fixture Create(
            int userId = 1337,
            int partyId = 1338,
            ServiceCollection? services = null,
            bool withTelemetry = false,
            Action<ServiceCollection>? registerUserActionAuthorizer = null
        )
        {
            services ??= new ServiceCollection();

            Mock<IAuthenticationContext> authenticationContextMock = new();
            services.AddSingleton(authenticationContextMock.Object);
            authenticationContextMock
                .Setup(m => m.Current)
                .Returns(TestAuthentication.GetUserAuthentication(userId: userId, userPartyId: partyId));

            services.AddLogging(builder => builder.AddProvider(NullLoggerProvider.Instance));
            services.AddAppImplementationFactory();
            if (withTelemetry)
                services.AddTelemetrySink();

            services.AddSingleton(new Mock<IAuthorizationClient>().Object);

            if (registerUserActionAuthorizer != null)
            {
                registerUserActionAuthorizer(services);
            }
            else
            {
                services.AddUserActionAuthorizerForActionInTask<TestAuthorizer1>(
                    "taskId",
                    "action",
                    ServiceLifetime.Singleton
                );
            }

            services.AddTransient<IAuthorizationService, AuthorizationService>();

            return new Fixture(services.BuildStrictServiceProvider());
        }
    }

    private sealed class TestAuthorizer1 : IUserActionAuthorizer
    {
        public readonly Mock<IUserActionAuthorizer> Mock = new();

        public Task<bool> AuthorizeAction(UserActionAuthorizerContext context) => Mock.Object.AuthorizeAction(context);
    }

    private sealed class TestAuthorizer2 : IUserActionAuthorizer
    {
        public readonly Mock<IUserActionAuthorizer> Mock = new();

        public Task<bool> AuthorizeAction(UserActionAuthorizerContext context) => Mock.Object.AuthorizeAction(context);
    }

    private sealed class TestAuthorizer3 : IUserActionAuthorizer
    {
        public readonly Mock<IUserActionAuthorizer> Mock = new();

        public Task<bool> AuthorizeAction(UserActionAuthorizerContext context) => Mock.Object.AuthorizeAction(context);
    }

    [Fact]
    public async Task GetPartyList_returns_party_list_from_AuthorizationClient()
    {
        int userId = 1337;
        using var fixture = Fixture.Create(userId: userId, withTelemetry: true);

        // Arrange
        Mock<IAuthorizationClient> authorizationClientMock = new Mock<IAuthorizationClient>();
        List<Party> partyList = new List<Party>();
        fixture.Mock<IAuthorizationClient>().Setup(a => a.GetPartyList(userId)).ReturnsAsync(partyList);
        AuthorizationService authorizationService = fixture.AuthorizationService;

        // Act
        List<Party>? result = await authorizationService.GetPartyList(userId);

        // Assert
        result.Should().BeSameAs(partyList);
        fixture.Mock<IAuthorizationClient>().Verify(a => a.GetPartyList(userId), Times.Once);

        await Verify(fixture.TelemetrySink.GetSnapshot());
    }

    [Fact]
    public async Task ValidateSelectedParty_returns_validation_from_AuthorizationClient()
    {
        int userId = 1337;
        int partyId = 1338;
        using var fixture = Fixture.Create(userId: userId, partyId: partyId, withTelemetry: true);

        // Arrange
        Mock<IAuthorizationClient> authorizationClientMock = new Mock<IAuthorizationClient>();
        fixture.Mock<IAuthorizationClient>().Setup(a => a.ValidateSelectedParty(userId, partyId)).ReturnsAsync(true);
        AuthorizationService authorizationService = fixture.AuthorizationService;

        // Act
        bool? result = await authorizationService.ValidateSelectedParty(userId, partyId);

        // Assert
        result.Should().BeTrue();
        fixture.Mock<IAuthorizationClient>().Verify(a => a.ValidateSelectedParty(userId, partyId), Times.Once);
    }

    [Fact]
    public async Task AuthorizeAction_returns_true_when_AutorizationClient_true_and_no_IUserActinAuthorizerProvider_is_provided()
    {
        var partyId = 1337;
        using var fixture = Fixture.Create(
            partyId: partyId,
            withTelemetry: true,
            registerUserActionAuthorizer: _ => { }
        );
        // Input
        AppIdentifier appIdentifier = new AppIdentifier("ttd/xunit-app");
        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(
            instanceOwnerPartyId: partyId,
            instanceGuid: Guid.NewGuid()
        );
        ClaimsPrincipal user = new ClaimsPrincipal();
        string action = "action";
        string taskId = "taskId";

        // Arrange
        fixture
            .Mock<IAuthorizationClient>()
            .Setup(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId))
            .ReturnsAsync(true);
        AuthorizationService authorizationService = fixture.AuthorizationService;

        // Act
        bool result = await authorizationService.AuthorizeAction(
            appIdentifier,
            instanceIdentifier,
            user,
            action,
            taskId
        );

        // Assert
        result.Should().BeTrue();
        fixture
            .Mock<IAuthorizationClient>()
            .Verify(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId), Times.Once);
    }

    [Fact]
    public async Task AuthorizeAction_returns_false_when_AutorizationClient_false_and_no_IUserActinAuthorizerProvider_is_provided()
    {
        var partyId = 1337;
        using var fixture = Fixture.Create(partyId: partyId, withTelemetry: true);
        // Input
        AppIdentifier appIdentifier = new AppIdentifier("ttd/xunit-app");
        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(
            instanceOwnerPartyId: 1337,
            instanceGuid: Guid.NewGuid()
        );
        ClaimsPrincipal user = new ClaimsPrincipal();
        string action = "action";
        string taskId = "taskId";

        // Arrange
        fixture
            .Mock<IAuthorizationClient>()
            .Setup(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId))
            .ReturnsAsync(false);
        AuthorizationService authorizationService = fixture.AuthorizationService;

        // Act
        bool result = await authorizationService.AuthorizeAction(
            appIdentifier,
            instanceIdentifier,
            user,
            action,
            taskId
        );

        // Assert
        result.Should().BeFalse();
        fixture
            .Mock<IAuthorizationClient>()
            .Verify(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId), Times.Once);
    }

    [Fact]
    public async Task AuthorizeAction_returns_false_when_AutorizationClient_true_and_one_IUserActinAuthorizerProvider_returns_false()
    {
        var partyId = 1337;
        using var fixture = Fixture.Create(partyId: partyId, withTelemetry: true);
        // Input
        AppIdentifier appIdentifier = new AppIdentifier("ttd/xunit-app");
        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(
            instanceOwnerPartyId: partyId,
            instanceGuid: Guid.NewGuid()
        );
        ClaimsPrincipal user = new ClaimsPrincipal();
        string action = "action";
        string taskId = "taskId";

        // Arrange
        fixture
            .Mock<IAuthorizationClient>()
            .Setup(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId))
            .ReturnsAsync(true);
        fixture
            .TestAuthorizer1.Mock.Setup(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()))
            .ReturnsAsync(false);
        AuthorizationService authorizationService = fixture.AuthorizationService;

        // Act
        bool result = await authorizationService.AuthorizeAction(
            appIdentifier,
            instanceIdentifier,
            user,
            action,
            taskId
        );

        // Assert
        result.Should().BeFalse();
        fixture
            .Mock<IAuthorizationClient>()
            .Verify(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId), Times.Once);
        fixture.TestAuthorizer1.Mock.Verify(
            a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()),
            Times.Once
        );
    }

    [Fact]
    public async Task AuthorizeAction_does_not_call_UserActionAuthorizer_if_AuthorizationClient_returns_false()
    {
        var partyId = 1337;
        using var fixture = Fixture.Create(partyId: partyId, withTelemetry: true);
        // Input
        AppIdentifier appIdentifier = new AppIdentifier("ttd/xunit-app");
        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(
            instanceOwnerPartyId: partyId,
            instanceGuid: Guid.NewGuid()
        );
        ClaimsPrincipal user = new ClaimsPrincipal();
        string action = "action";
        string taskId = "taskId";

        // Arrange
        fixture
            .Mock<IAuthorizationClient>()
            .Setup(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId))
            .ReturnsAsync(false);

        fixture
            .TestAuthorizer1.Mock.Setup(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()))
            .ReturnsAsync(true);

        AuthorizationService authorizationService = fixture.AuthorizationService;

        // Act
        bool result = await authorizationService.AuthorizeAction(
            appIdentifier,
            instanceIdentifier,
            user,
            action,
            taskId
        );

        // Assert
        result.Should().BeFalse();
        fixture
            .Mock<IAuthorizationClient>()
            .Verify(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId), Times.Once);
        fixture.TestAuthorizer1.Mock.Verify(
            a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()),
            Times.Never
        );
    }

    [Fact]
    public async Task AuthorizeAction_calls_all_providers_and_return_true_if_all_true()
    {
        // Input
        AppIdentifier appIdentifier = new AppIdentifier("ttd/xunit-app");
        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(
            instanceOwnerPartyId: 1337,
            instanceGuid: Guid.NewGuid()
        );
        ClaimsPrincipal user = new ClaimsPrincipal();
        string action = "action";
        string taskId = "taskId";

        // Arrange
        using var fixture = Fixture.Create(
            partyId: instanceIdentifier.InstanceOwnerPartyId,
            withTelemetry: true,
            registerUserActionAuthorizer: services =>
            {
                services.AddUserActionAuthorizerForActionInTask<TestAuthorizer1>(
                    "taskId",
                    "action",
                    ServiceLifetime.Singleton
                );
                services.AddUserActionAuthorizerForActionInTask<TestAuthorizer2>(
                    "taskId",
                    "action",
                    ServiceLifetime.Singleton
                );
            }
        );
        fixture
            .Mock<IAuthorizationClient>()
            .Setup(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId))
            .ReturnsAsync(true);

        fixture
            .TestAuthorizer1.Mock.Setup(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()))
            .ReturnsAsync(true);
        fixture
            .TestAuthorizer2.Mock.Setup(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()))
            .ReturnsAsync(true);

        AuthorizationService authorizationService = fixture.AuthorizationService;

        // Act
        bool result = await authorizationService.AuthorizeAction(
            appIdentifier,
            instanceIdentifier,
            user,
            action,
            taskId
        );

        // Assert
        result.Should().BeTrue();
        fixture
            .Mock<IAuthorizationClient>()
            .Verify(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId), Times.Once);
        fixture.TestAuthorizer1.Mock.Verify(
            a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()),
            Times.Once
        );
        fixture.TestAuthorizer2.Mock.Verify(
            a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()),
            Times.Once
        );
    }

    [Fact]
    public async Task AuthorizeAction_does_not_call_providers_with_non_matching_taskId_and_or_action()
    {
        // Input
        AppIdentifier appIdentifier = new AppIdentifier("ttd/xunit-app");
        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(
            instanceOwnerPartyId: 1337,
            instanceGuid: Guid.NewGuid()
        );
        ClaimsPrincipal user = new ClaimsPrincipal();
        string action = "action";
        string taskId = "taskId";

        // Arrange
        using var fixture = Fixture.Create(
            partyId: instanceIdentifier.InstanceOwnerPartyId,
            withTelemetry: true,
            registerUserActionAuthorizer: services =>
            {
                services.AddUserActionAuthorizerForActionInTask<TestAuthorizer1>(
                    "taskId",
                    "action2",
                    ServiceLifetime.Singleton
                );
                services.AddUserActionAuthorizerForActionInTask<TestAuthorizer2>(
                    "taskId2",
                    "action",
                    ServiceLifetime.Singleton
                );
                services.AddUserActionAuthorizerForActionInTask<TestAuthorizer3>(
                    "taskId3",
                    "action3",
                    ServiceLifetime.Singleton
                );
            }
        );
        fixture
            .Mock<IAuthorizationClient>()
            .Setup(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId))
            .ReturnsAsync(true);

        fixture
            .TestAuthorizer1.Mock.Setup(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()))
            .ReturnsAsync(false);
        fixture
            .TestAuthorizer2.Mock.Setup(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()))
            .ReturnsAsync(false);
        fixture
            .TestAuthorizer3.Mock.Setup(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()))
            .ReturnsAsync(false);

        AuthorizationService authorizationService = fixture.AuthorizationService;

        // Act
        bool result = await authorizationService.AuthorizeAction(
            appIdentifier,
            instanceIdentifier,
            user,
            action,
            taskId
        );

        // Assert
        result.Should().BeTrue();
        fixture
            .Mock<IAuthorizationClient>()
            .Verify(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId), Times.Once);
        fixture.TestAuthorizer1.Mock.Verify(
            a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()),
            Times.Never
        );
        fixture.TestAuthorizer2.Mock.Verify(
            a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()),
            Times.Never
        );
        fixture.TestAuthorizer3.Mock.Verify(
            a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()),
            Times.Never
        );
    }

    [Fact]
    public async Task AuthorizeAction_calls_providers_with_task_null_and_or_action_null()
    {
        // Input
        AppIdentifier appIdentifier = new AppIdentifier("ttd/xunit-app");
        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(
            instanceOwnerPartyId: 1337,
            instanceGuid: Guid.NewGuid()
        );
        ClaimsPrincipal user = new ClaimsPrincipal();
        string action = "action";
        string taskId = "taskId";

        // Arrange
        using var fixture = Fixture.Create(
            partyId: instanceIdentifier.InstanceOwnerPartyId,
            withTelemetry: true,
            registerUserActionAuthorizer: services =>
            {
                services.AddUserActionAuthorizerForActionInTask<TestAuthorizer1>(
                    null!,
                    "action",
                    ServiceLifetime.Singleton
                );
                services.AddUserActionAuthorizerForActionInTask<TestAuthorizer2>(
                    "taskId",
                    null!,
                    ServiceLifetime.Singleton
                );
                services.AddUserActionAuthorizerForActionInTask<TestAuthorizer3>(
                    null!,
                    null!,
                    ServiceLifetime.Singleton
                );
            }
        );
        fixture
            .Mock<IAuthorizationClient>()
            .Setup(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId))
            .ReturnsAsync(true);

        fixture
            .TestAuthorizer1.Mock.Setup(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()))
            .ReturnsAsync(true);

        fixture
            .TestAuthorizer2.Mock.Setup(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()))
            .ReturnsAsync(true);

        fixture
            .TestAuthorizer3.Mock.Setup(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()))
            .ReturnsAsync(true);

        AuthorizationService authorizationService = fixture.AuthorizationService;

        // Actπ
        bool result = await authorizationService.AuthorizeAction(
            appIdentifier,
            instanceIdentifier,
            user,
            action,
            taskId
        );

        // Assert
        result.Should().BeTrue();
        fixture
            .Mock<IAuthorizationClient>()
            .Verify(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId), Times.Once);
        fixture.TestAuthorizer1.Mock.Verify(
            a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()),
            Times.Once
        );
        fixture.TestAuthorizer2.Mock.Verify(
            a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()),
            Times.Once
        );
        fixture.TestAuthorizer3.Mock.Verify(
            a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()),
            Times.Once
        );
    }

    [Fact]
    private async Task AuthorizeActions_returns_list_of_UserActions_with_auth_decisions()
    {
        // Input
        Instance instance = new Instance();
        ClaimsPrincipal user = new ClaimsPrincipal();
        List<AltinnAction> actions = new List<AltinnAction>()
        {
            new AltinnAction("read"),
            new AltinnAction("write"),
            new AltinnAction("brew-coffee"),
            new AltinnAction("drink-coffee", ActionType.ServerAction),
        };
        var actionsStrings = new List<string>() { "read", "write", "brew-coffee", "drink-coffee" };

        // Arrange
        using var fixture = Fixture.Create(withTelemetry: true);
        fixture
            .Mock<IAuthorizationClient>()
            .Setup(a => a.AuthorizeActions(instance, user, actionsStrings))
            .ReturnsAsync(
                new Dictionary<string, bool>()
                {
                    { "read", true },
                    { "write", true },
                    { "brew-coffee", true },
                    { "drink-coffee", false },
                }
            );

        AuthorizationService authorizationService = fixture.AuthorizationService;

        // Act
        List<UserAction> result = await authorizationService.AuthorizeActions(instance, user, actions);

        List<UserAction> expected = new List<UserAction>()
        {
            new UserAction()
            {
                Id = "read",
                ActionType = ActionType.ProcessAction,
                Authorized = true,
            },
            new UserAction()
            {
                Id = "write",
                ActionType = ActionType.ProcessAction,
                Authorized = true,
            },
            new UserAction()
            {
                Id = "brew-coffee",
                ActionType = ActionType.ProcessAction,
                Authorized = true,
            },
            new UserAction()
            {
                Id = "drink-coffee",
                ActionType = ActionType.ServerAction,
                Authorized = false,
            },
        };

        // Assert
        result.Should().BeEquivalentTo(expected);
        fixture
            .Mock<IAuthorizationClient>()
            .Verify(a => a.AuthorizeActions(instance, user, actionsStrings), Times.Once);
        fixture.Mock<IAuthorizationClient>().VerifyNoOtherCalls();
    }
}
