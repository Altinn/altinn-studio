using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Internal.Process;

public class ProcessEngineAuthorizerTests
{
    private readonly Mock<IAuthorizationService> _authServiceMock;
    private readonly Mock<IHttpContextAccessor> _httpContextAccessorMock;
    private readonly ProcessEngineAuthorizer _authorizer;
    private readonly ClaimsPrincipal _user;

    private const string WriteAction = "write";
    private const string ConfirmAction = "confirm";
    private const string SignAction = "sign";
    private const string PayAction = "pay";

    public ProcessEngineAuthorizerTests()
    {
        _authServiceMock = new Mock<IAuthorizationService>(MockBehavior.Strict);
        _httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        var loggerMock = new Mock<ILogger<ProcessEngineAuthorizer>>();

        _user = new ClaimsPrincipal(
            new ClaimsIdentity(
                new List<Claim> { new Claim("sub", "12345"), new Claim("name", "Test User") },
                "TestAuthentication"
            )
        );

        HttpContext httpContext = new DefaultHttpContext { };

        _httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContext);

        _authorizer = new ProcessEngineAuthorizer(
            _authServiceMock.Object,
            _httpContextAccessorMock.Object,
            loggerMock.Object
        );
    }

    [Fact]
    public async Task AuthorizeProcessNext_WithNullCurrentTask_ReturnsFalse()
    {
        // Arrange
        Instance instance = CreateInstance(null);

        // Act
        bool result = await _authorizer.AuthorizeProcessNext(instance);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task AuthorizeProcessNext_WithSpecificAction_CallsAuthorizationService()
    {
        // Arrange
        Instance instance = CreateInstance("task1", "data");

        _authServiceMock
            .Setup(x =>
                x.AuthorizeAction(
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<ClaimsPrincipal>(),
                    WriteAction,
                    instance.Process.CurrentTask.ElementId
                )
            )
            .ReturnsAsync(true)
            .Verifiable();

        // Act
        bool result = await _authorizer.AuthorizeProcessNext(instance, WriteAction);

        // Assert
        Assert.True(result);
        _authServiceMock.Verify();
    }

    [Fact]
    public async Task AuthorizeProcessNext_WithNoAction_DataTask_ChecksWriteAction()
    {
        // Arrange
        Instance instance = CreateInstance("task1", "data");

        _authServiceMock
            .Setup(x =>
                x.AuthorizeAction(
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<ClaimsPrincipal>(),
                    WriteAction,
                    instance.Process.CurrentTask.ElementId
                )
            )
            .ReturnsAsync(true)
            .Verifiable();

        // Act
        bool result = await _authorizer.AuthorizeProcessNext(instance);

        // Assert
        Assert.True(result);
        _authServiceMock.Verify();
    }

    [Fact]
    public async Task AuthorizeProcessNext_WithNoAction_PaymentTask_ChecksBothPayAndWriteActions()
    {
        // Arrange
        Instance instance = CreateInstance("task1", "payment");

        _authServiceMock
            .Setup(x =>
                x.AuthorizeAction(
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<ClaimsPrincipal>(),
                    PayAction,
                    instance.Process.CurrentTask.ElementId
                )
            )
            .ReturnsAsync(false)
            .Verifiable();

        _authServiceMock
            .Setup(x =>
                x.AuthorizeAction(
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<ClaimsPrincipal>(),
                    WriteAction,
                    instance.Process.CurrentTask.ElementId
                )
            )
            .ReturnsAsync(true)
            .Verifiable();

        // Act
        bool result = await _authorizer.AuthorizeProcessNext(instance);

        // Assert
        Assert.True(result);
        _authServiceMock.Verify();
    }

    [Fact]
    public async Task AuthorizeProcessNext_WithNoAction_ConfirmationTask_ChecksConfirmAction()
    {
        // Arrange
        Instance instance = CreateInstance("task1", "confirmation");

        _authServiceMock
            .Setup(x =>
                x.AuthorizeAction(
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<ClaimsPrincipal>(),
                    ConfirmAction,
                    instance.Process.CurrentTask.ElementId
                )
            )
            .ReturnsAsync(true)
            .Verifiable();

        // Act
        bool result = await _authorizer.AuthorizeProcessNext(instance);

        // Assert
        Assert.True(result);
        _authServiceMock.Verify();
    }

    [Fact]
    public async Task AuthorizeProcessNext_WithNoAction_SigningTask_ChecksSignAndWriteActions()
    {
        // Arrange
        Instance instance = CreateInstance("task1", "signing");

        _authServiceMock
            .Setup(x =>
                x.AuthorizeAction(
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<ClaimsPrincipal>(),
                    SignAction,
                    instance.Process.CurrentTask.ElementId
                )
            )
            .ReturnsAsync(false)
            .Verifiable();

        _authServiceMock
            .Setup(x =>
                x.AuthorizeAction(
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<ClaimsPrincipal>(),
                    WriteAction,
                    instance.Process.CurrentTask.ElementId
                )
            )
            .ReturnsAsync(true)
            .Verifiable();

        // Act
        bool result = await _authorizer.AuthorizeProcessNext(instance);

        // Assert
        Assert.True(result);
        _authServiceMock.Verify();
    }

    [Fact]
    public async Task AuthorizeProcessNext_WithNoAuthorizedActions_ReturnsFalse()
    {
        // Arrange
        Instance instance = CreateInstance("task1", "data");

        _authServiceMock
            .Setup(x =>
                x.AuthorizeAction(
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<ClaimsPrincipal>(),
                    WriteAction,
                    instance.Process.CurrentTask.ElementId
                )
            )
            .ReturnsAsync(false);

        // Act
        bool result = await _authorizer.AuthorizeProcessNext(instance);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task AuthorizeProcessNext_NoHttpContext_ThrowsAuthenticationContextException()
    {
        // Arrange
        Instance instance = CreateInstance("task1", "data");
        _httpContextAccessorMock.Setup(x => x.HttpContext).Returns((HttpContext?)null);

        // Act & Assert
        await Assert.ThrowsAsync<ProcessException>(async () => await _authorizer.AuthorizeProcessNext(instance));
    }

    [Theory]
    [InlineData("data", new[] { "write" })]
    [InlineData("feedback", new[] { "write" })]
    [InlineData("payment", new[] { "pay", "write" })]
    [InlineData("confirmation", new[] { "confirm" })]
    [InlineData("signing", new[] { "sign", "write" })]
    [InlineData("customTask", new[] { "customTask" })]
    public void GetActionsThatAllowProcessNextForTaskType_ReturnsExpectedActions(
        string taskType,
        string[] expectedActions
    )
    {
        // Act
        string[] result = ProcessEngineAuthorizer.GetActionsThatAllowProcessNextForTaskType(taskType);

        // Assert
        Assert.Equal(expectedActions, result);
    }

    private static Instance CreateInstance(string? taskId, string? taskType = null)
    {
        var instance = new Instance
        {
            Id = "1337/12df57b6-cecf-4e7d-9415-857d93a817b3",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            AppId = "org/app",
            Org = "org",
            Process = new ProcessState(),
        };

        if (taskId != null)
        {
            instance.Process.CurrentTask = new ProcessElementInfo
            {
                ElementId = taskId,
                AltinnTaskType = taskType ?? "unknown",
            };
        }

        return instance;
    }
}
