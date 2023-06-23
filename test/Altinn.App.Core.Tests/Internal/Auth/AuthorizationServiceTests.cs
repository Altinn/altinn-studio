#nullable enable
using System.Security.Claims;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Action;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Process.Action;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
using FluentAssertions;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Internal.Auth;

public class AuthorizationServiceTests
{
    [Fact]
    public async Task GetPartyList_returns_party_list_from_AuthorizationClient()
    {
        // Input
        int userId = 1337;
        
        // Arrange
        Mock<IAuthorizationClient> authorizationClientMock = new Mock<IAuthorizationClient>();
        List<Party> partyList = new List<Party>();
        authorizationClientMock.Setup(a => a.GetPartyList(userId)).ReturnsAsync(partyList);
        AuthorizationService authorizationService = new AuthorizationService(authorizationClientMock.Object, new List<IUserActionAuthorizerProvider>());
        
        // Act
        List<Party>? result = await authorizationService.GetPartyList(userId);
        
        // Assert
        result.Should().BeSameAs(partyList);
        authorizationClientMock.Verify(a => a.GetPartyList(userId), Times.Once);
    }
    
    [Fact]
    public async Task ValidateSelectedParty_returns_validation_from_AuthorizationClient()
    {
        // Input
        int userId = 1337;
        int partyId = 1338;
        
        // Arrange
        Mock<IAuthorizationClient> authorizationClientMock = new Mock<IAuthorizationClient>();
        authorizationClientMock.Setup(a => a.ValidateSelectedParty(userId, partyId)).ReturnsAsync(true);
        AuthorizationService authorizationService = new AuthorizationService(authorizationClientMock.Object, new List<IUserActionAuthorizerProvider>());
        
        // Act
        bool? result = await authorizationService.ValidateSelectedParty(userId, partyId);
        
        // Assert
        result.Should().BeTrue();
        authorizationClientMock.Verify(a => a.ValidateSelectedParty(userId, partyId), Times.Once);
    }
    
    [Fact]
    public async Task AuthorizeAction_returns_true_when_AutorizationClient_true_and_no_IUserActinAuthorizerProvider_is_provided()
    {
        // Input
        AppIdentifier appIdentifier = new AppIdentifier("ttd/xunit-app");
        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instanceOwnerPartyId: 1337, instanceGuid: Guid.NewGuid());
        ClaimsPrincipal user = new ClaimsPrincipal();
        string action = "action";
        string taskId = "taskId";
        
        // Arrange
        Mock<IAuthorizationClient> authorizationClientMock = new Mock<IAuthorizationClient>();
        authorizationClientMock.Setup(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId)).ReturnsAsync(true);
        AuthorizationService authorizationService = new AuthorizationService(authorizationClientMock.Object, new List<IUserActionAuthorizerProvider>());
        
        // Act
        bool result = await authorizationService.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId);
        
        // Assert
        result.Should().BeTrue();
        authorizationClientMock.Verify(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId), Times.Once);
    }
    
    [Fact]
    public async Task AuthorizeAction_returns_false_when_AutorizationClient_false_and_no_IUserActinAuthorizerProvider_is_provided()
    {
        // Input
        AppIdentifier appIdentifier = new AppIdentifier("ttd/xunit-app");
        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instanceOwnerPartyId: 1337, instanceGuid: Guid.NewGuid());
        ClaimsPrincipal user = new ClaimsPrincipal();
        string action = "action";
        string taskId = "taskId";
        
        // Arrange
        Mock<IAuthorizationClient> authorizationClientMock = new Mock<IAuthorizationClient>();
        authorizationClientMock.Setup(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId)).ReturnsAsync(false);
        AuthorizationService authorizationService = new AuthorizationService(authorizationClientMock.Object, new List<IUserActionAuthorizerProvider>());
        
        // Act
        bool result = await authorizationService.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId);
        
        // Assert
        result.Should().BeFalse();
        authorizationClientMock.Verify(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId), Times.Once);
    }
    
    [Fact]
    public async Task AuthorizeAction_returns_false_when_AutorizationClient_true_and_one_IUserActinAuthorizerProvider_returns_false()
    {
        // Input
        AppIdentifier appIdentifier = new AppIdentifier("ttd/xunit-app");
        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instanceOwnerPartyId: 1337, instanceGuid: Guid.NewGuid());
        ClaimsPrincipal user = new ClaimsPrincipal();
        string action = "action";
        string taskId = "taskId";
        
        // Arrange
        Mock<IAuthorizationClient> authorizationClientMock = new Mock<IAuthorizationClient>();
        authorizationClientMock.Setup(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId)).ReturnsAsync(true);
        
        Mock<IUserActionAuthorizer> userActionAuthorizerMock = new Mock<IUserActionAuthorizer>();
        userActionAuthorizerMock.Setup(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>())).ReturnsAsync(false);
        IUserActionAuthorizerProvider userActionAuthorizerProvider = new UserActionAuthorizerProvider("taskId", "action", userActionAuthorizerMock.Object);
        
        AuthorizationService authorizationService = new AuthorizationService(authorizationClientMock.Object, new List<IUserActionAuthorizerProvider>() { userActionAuthorizerProvider });
        
        // Act
        bool result = await authorizationService.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId);
        
        // Assert
        result.Should().BeFalse();
        authorizationClientMock.Verify(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId), Times.Once);
        userActionAuthorizerMock.Verify(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()), Times.Once);
    }
    
    [Fact]
    public async Task AuthorizeAction_does_not_call_UserActionAuthorizer_if_AuthorizationClient_returns_false()
    {
        // Input
        AppIdentifier appIdentifier = new AppIdentifier("ttd/xunit-app");
        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instanceOwnerPartyId: 1337, instanceGuid: Guid.NewGuid());
        ClaimsPrincipal user = new ClaimsPrincipal();
        string action = "action";
        string taskId = "taskId";
        
        // Arrange
        Mock<IAuthorizationClient> authorizationClientMock = new Mock<IAuthorizationClient>();
        authorizationClientMock.Setup(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId)).ReturnsAsync(false);
        
        Mock<IUserActionAuthorizer> userActionAuthorizerMock = new Mock<IUserActionAuthorizer>();
        userActionAuthorizerMock.Setup(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>())).ReturnsAsync(true);
        IUserActionAuthorizerProvider userActionAuthorizerProvider = new UserActionAuthorizerProvider("taskId", "action", userActionAuthorizerMock.Object);
        
        AuthorizationService authorizationService = new AuthorizationService(authorizationClientMock.Object, new List<IUserActionAuthorizerProvider>() { userActionAuthorizerProvider });
        
        // Act
        bool result = await authorizationService.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId);
        
        // Assert
        result.Should().BeFalse();
        authorizationClientMock.Verify(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId), Times.Once);
        userActionAuthorizerMock.Verify(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()), Times.Never);
    }
    
    [Fact]
    public async Task AuthorizeAction_calls_all_providers_and_return_true_if_all_true()
    {
        // Input
        AppIdentifier appIdentifier = new AppIdentifier("ttd/xunit-app");
        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instanceOwnerPartyId: 1337, instanceGuid: Guid.NewGuid());
        ClaimsPrincipal user = new ClaimsPrincipal();
        string action = "action";
        string taskId = "taskId";
        
        // Arrange
        Mock<IAuthorizationClient> authorizationClientMock = new Mock<IAuthorizationClient>();
        authorizationClientMock.Setup(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId)).ReturnsAsync(true);
        
        Mock<IUserActionAuthorizer> userActionAuthorizerOneMock = new Mock<IUserActionAuthorizer>();
        userActionAuthorizerOneMock.Setup(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>())).ReturnsAsync(true);
        IUserActionAuthorizerProvider userActionAuthorizerOneProvider = new UserActionAuthorizerProvider("taskId", "action", userActionAuthorizerOneMock.Object);
        Mock<IUserActionAuthorizer> userActionAuthorizerTwoMock = new Mock<IUserActionAuthorizer>();
        userActionAuthorizerTwoMock.Setup(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>())).ReturnsAsync(true);
        IUserActionAuthorizerProvider userActionAuthorizerTwoProvider = new UserActionAuthorizerProvider("taskId", "action", userActionAuthorizerTwoMock.Object);
        
        AuthorizationService authorizationService = new AuthorizationService(authorizationClientMock.Object, new List<IUserActionAuthorizerProvider>() { userActionAuthorizerOneProvider, userActionAuthorizerTwoProvider });
        
        // Act
        bool result = await authorizationService.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId);
        
        // Assert
        result.Should().BeTrue();
        authorizationClientMock.Verify(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId), Times.Once);
        userActionAuthorizerOneMock.Verify(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()), Times.Once);
        userActionAuthorizerTwoMock.Verify(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()), Times.Once);
    }
    
    [Fact]
    public async Task AuthorizeAction_does_not_call_providers_with_non_matching_taskId_and_or_action()
    {
        // Input
        AppIdentifier appIdentifier = new AppIdentifier("ttd/xunit-app");
        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instanceOwnerPartyId: 1337, instanceGuid: Guid.NewGuid());
        ClaimsPrincipal user = new ClaimsPrincipal();
        string action = "action";
        string taskId = "taskId";
        
        // Arrange
        Mock<IAuthorizationClient> authorizationClientMock = new Mock<IAuthorizationClient>();
        authorizationClientMock.Setup(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId)).ReturnsAsync(true);
        
        Mock<IUserActionAuthorizer> userActionAuthorizerOneMock = new Mock<IUserActionAuthorizer>();
        userActionAuthorizerOneMock.Setup(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>())).ReturnsAsync(false);
        IUserActionAuthorizerProvider userActionAuthorizerOneProvider = new UserActionAuthorizerProvider("taskId", "action2", userActionAuthorizerOneMock.Object);
        
        Mock<IUserActionAuthorizer> userActionAuthorizerTwoMock = new Mock<IUserActionAuthorizer>();
        userActionAuthorizerTwoMock.Setup(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>())).ReturnsAsync(false);
        IUserActionAuthorizerProvider userActionAuthorizerTwoProvider = new UserActionAuthorizerProvider("taskId2", "action", userActionAuthorizerTwoMock.Object);
        
        Mock<IUserActionAuthorizer> userActionAuthorizerThreeMock = new Mock<IUserActionAuthorizer>();
        userActionAuthorizerThreeMock.Setup(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>())).ReturnsAsync(false);
        IUserActionAuthorizerProvider userActionAuthorizerThreeProvider = new UserActionAuthorizerProvider("taskId3", "action3", userActionAuthorizerThreeMock.Object);
        
        AuthorizationService authorizationService = new AuthorizationService(authorizationClientMock.Object, new List<IUserActionAuthorizerProvider>() { userActionAuthorizerOneProvider, userActionAuthorizerTwoProvider, userActionAuthorizerThreeProvider });
        
        // Act
        bool result = await authorizationService.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId);
        
        // Assert
        result.Should().BeTrue();
        authorizationClientMock.Verify(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId), Times.Once);
        userActionAuthorizerOneMock.Verify(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()), Times.Never);
        userActionAuthorizerTwoMock.Verify(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()), Times.Never);
        userActionAuthorizerThreeMock.Verify(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()), Times.Never);
    }
    
    [Fact]
    public async Task AuthorizeAction_calls_providers_with_task_null_and_or_action_null()
    {
        // Input
        AppIdentifier appIdentifier = new AppIdentifier("ttd/xunit-app");
        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instanceOwnerPartyId: 1337, instanceGuid: Guid.NewGuid());
        ClaimsPrincipal user = new ClaimsPrincipal();
        string action = "action";
        string taskId = "taskId";
        
        // Arrange
        Mock<IAuthorizationClient> authorizationClientMock = new Mock<IAuthorizationClient>();
        authorizationClientMock.Setup(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId)).ReturnsAsync(true);
        
        Mock<IUserActionAuthorizer> userActionAuthorizerOneMock = new Mock<IUserActionAuthorizer>();
        userActionAuthorizerOneMock.Setup(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>())).ReturnsAsync(true);
        IUserActionAuthorizerProvider userActionAuthorizerOneProvider = new UserActionAuthorizerProvider(null, "action", userActionAuthorizerOneMock.Object);
        
        Mock<IUserActionAuthorizer> userActionAuthorizerTwoMock = new Mock<IUserActionAuthorizer>();
        userActionAuthorizerTwoMock.Setup(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>())).ReturnsAsync(true);
        IUserActionAuthorizerProvider userActionAuthorizerTwoProvider = new UserActionAuthorizerProvider("taskId", null, userActionAuthorizerTwoMock.Object);
        
        Mock<IUserActionAuthorizer> userActionAuthorizerThreeMock = new Mock<IUserActionAuthorizer>();
        userActionAuthorizerThreeMock.Setup(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>())).ReturnsAsync(true);
        IUserActionAuthorizerProvider userActionAuthorizerThreeProvider = new UserActionAuthorizerProvider(null, null, userActionAuthorizerThreeMock.Object);
        
        AuthorizationService authorizationService = new AuthorizationService(authorizationClientMock.Object, new List<IUserActionAuthorizerProvider>() { userActionAuthorizerOneProvider, userActionAuthorizerTwoProvider, userActionAuthorizerThreeProvider });
        
        // Actπ
        bool result = await authorizationService.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId);
        
        // Assert
        result.Should().BeTrue();
        authorizationClientMock.Verify(a => a.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId), Times.Once);
        userActionAuthorizerOneMock.Verify(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()), Times.Once);
        userActionAuthorizerTwoMock.Verify(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()), Times.Once);
        userActionAuthorizerThreeMock.Verify(a => a.AuthorizeAction(It.IsAny<UserActionAuthorizerContext>()), Times.Once);
    }
}
