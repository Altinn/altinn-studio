using System.Net;
using Altinn.App.Core.Features.AccessManagement;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.AccessManagement.Exceptions;
using Altinn.App.Core.Internal.AccessManagement.Models;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
using Microsoft.Extensions.Logging;
using Moq;
using static Altinn.App.Core.Features.Signing.Models.Signee;
using InternalSignee = Altinn.App.Core.Features.Signing.Models.Signee;
using SigneeState = Altinn.App.Core.Features.Signing.Models.SigneeContextState;

namespace Altinn.App.Core.Tests.Features.Signing;

public class SigningDelegationServiceTests
{
    private readonly InternalSignee _signee = new PersonSignee
    {
        FullName = "Testperson 1",
        SocialSecurityNumber = "123456678233",
        Party = new Party(),
    };

    /// <summary>
    /// A signee whose party has a <see cref="Party.PartyUuid"/>, so that <c>DelegateRights</c> can resolve a
    /// delegatee for it (unlike <see cref="_signee"/>, whose party has none).
    /// </summary>
    private static InternalSignee CreateSigneeWithPartyUuid(Guid partyUuid) =>
        new PersonSignee
        {
            FullName = "Testperson 1",
            SocialSecurityNumber = "123456678233",
            Party = new Party { PartyUuid = partyUuid },
        };

    [Fact]
    public async Task RevokeSigneeRights_RevokeSigneeRights()
    {
        // Arrange
        var accessManagementClient = new Mock<IAccessManagementClient>();
        var logger = new Mock<ILogger<SigningDelegationService>>();
        var service = new SigningDelegationService(accessManagementClient.Object, logger.Object);
        var taskId = "taskId";
        Guid instanceGuid = Guid.NewGuid();
        var instanceId = "instanceOwnerPartyId" + "/" + instanceGuid;
        Guid InstanceOwnerPartyUuid = Guid.NewGuid();
        var appIdentifier = new AppIdentifier("testOrg", "testApp");
        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,

                SigneeState = new SigneeState() { IsAccessDelegated = true },
                Signee = _signee,
            },
        };
        var ct = new CancellationToken();

        // Act
        (signeeContexts, var success) = await service.RevokeSigneeRights(
            taskId,
            instanceId,
            InstanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            ct
        );

        // Assert
        Assert.True(success);
        Assert.False(signeeContexts[0].SigneeState.IsAccessDelegated);
    }

    [Fact]
    public async Task RevokeSigneeRights_SigneeStateIsNotDelegated()
    {
        // Arrange
        var accessManagementClient = new Mock<IAccessManagementClient>();
        accessManagementClient
            .Setup(x => x.RevokeRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()))
            .Verifiable();
        var logger = new Mock<ILogger<SigningDelegationService>>();
        var service = new SigningDelegationService(accessManagementClient.Object, logger.Object);
        var taskId = "taskId";
        Guid instanceGuid = Guid.NewGuid();
        var instanceId = "instanceOwnerPartyId" + "/" + instanceGuid;
        Guid InstanceOwnerPartyUuid = Guid.NewGuid();
        var appIdentifier = new AppIdentifier("testOrg", "testApp");
        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                SigneeState = new SigneeState() { IsAccessDelegated = false }, // Signee is not delegated signing rights
                Signee = _signee,
            },
        };
        var ct = new CancellationToken();

        // Act
        (signeeContexts, var success) = await service.RevokeSigneeRights(
            taskId,
            instanceId,
            InstanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            ct
        );

        // Assert
        Assert.True(success);
        Assert.False(signeeContexts[0].SigneeState.IsAccessDelegated);
        accessManagementClient.Verify(
            x => x.RevokeRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()),
            Times.Never // No rights should be revoked, as the signee is not delegated signing rights in the first place
        );
    }

    [Fact]
    public async Task DelegateRights_Success_SetsFlagAndClearsFailureFields()
    {
        // Arrange
        var accessManagementClient = new Mock<IAccessManagementClient>();
        accessManagementClient
            .Setup(x => x.DelegateRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DelegationResponse());
        var logger = new Mock<ILogger<SigningDelegationService>>();
        var service = new SigningDelegationService(accessManagementClient.Object, logger.Object);
        var taskId = "taskId";
        Guid instanceGuid = Guid.NewGuid();
        var instanceId = "instanceOwnerPartyId" + "/" + instanceGuid;
        Guid instanceOwnerPartyUuid = Guid.NewGuid();
        var appIdentifier = new AppIdentifier("testOrg", "testApp");
        Guid workflowId = Guid.NewGuid();
        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                SigneeState = new SigneeState()
                {
                    IsAccessDelegated = false,
                    DelegationFailure = DelegationFailureCode.Rejected,
                    DelegationFailedReason = "a previous failure",
                },
                Signee = CreateSigneeWithPartyUuid(Guid.NewGuid()),
            },
        };
        var ct = CancellationToken.None;

        // Act
        await service.DelegateRights(
            taskId,
            instanceId,
            instanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            workflowId,
            ct
        );

        // Assert
        Assert.True(signeeContexts[0].SigneeState.IsAccessDelegated);
        Assert.Null(signeeContexts[0].SigneeState.DelegationFailure);
        Assert.Null(signeeContexts[0].SigneeState.DelegationFailedReason);
        accessManagementClient.Verify(
            x => x.DelegateRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task DelegateRights_WhenAlreadyDelegated_DoesNotInvokeClient()
    {
        // Arrange
        var accessManagementClient = new Mock<IAccessManagementClient>();
        accessManagementClient
            .Setup(x => x.DelegateRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()))
            .Verifiable();
        var logger = new Mock<ILogger<SigningDelegationService>>();
        var service = new SigningDelegationService(accessManagementClient.Object, logger.Object);
        var taskId = "taskId";
        Guid instanceGuid = Guid.NewGuid();
        var instanceId = "instanceOwnerPartyId" + "/" + instanceGuid;
        Guid instanceOwnerPartyUuid = Guid.NewGuid();
        var appIdentifier = new AppIdentifier("testOrg", "testApp");
        Guid workflowId = Guid.NewGuid();
        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                SigneeState = new SigneeState() { IsAccessDelegated = true }, // Signee is already delegated signing rights
                Signee = _signee,
            },
        };
        var ct = CancellationToken.None;

        // Act
        await service.DelegateRights(
            taskId,
            instanceId,
            instanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            workflowId,
            ct
        );

        // Assert
        Assert.True(signeeContexts[0].SigneeState.IsAccessDelegated);
        accessManagementClient.Verify(
            x => x.DelegateRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()),
            Times.Never // No rights should be delegated, as the signee already has signing rights
        );
    }

    [Fact]
    public async Task DelegateRights_NullPartyUuid_RecordsInvalidPartyAndContinuesToNextSignee()
    {
        // Arrange
        var accessManagementClient = new Mock<IAccessManagementClient>();
        accessManagementClient
            .Setup(x => x.DelegateRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DelegationResponse());
        var logger = new Mock<ILogger<SigningDelegationService>>();
        var service = new SigningDelegationService(accessManagementClient.Object, logger.Object);
        var taskId = "taskId";
        Guid instanceGuid = Guid.NewGuid();
        var instanceId = "instanceOwnerPartyId" + "/" + instanceGuid;
        Guid instanceOwnerPartyUuid = Guid.NewGuid();
        var appIdentifier = new AppIdentifier("testOrg", "testApp");
        Guid workflowId = Guid.NewGuid();
        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                SigneeState = new SigneeState() { IsAccessDelegated = false },
                Signee = _signee, // Party has no PartyUuid
            },
            new()
            {
                TaskId = taskId,
                SigneeState = new SigneeState() { IsAccessDelegated = false },
                Signee = CreateSigneeWithPartyUuid(Guid.NewGuid()),
            },
        };
        var ct = CancellationToken.None;

        // Act
        await service.DelegateRights(
            taskId,
            instanceId,
            instanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            workflowId,
            ct
        );

        // Assert
        Assert.False(signeeContexts[0].SigneeState.IsAccessDelegated);
        Assert.Equal(DelegationFailureCode.InvalidParty, signeeContexts[0].SigneeState.DelegationFailure);
        Assert.False(string.IsNullOrEmpty(signeeContexts[0].SigneeState.DelegationFailedReason));

        Assert.True(signeeContexts[1].SigneeState.IsAccessDelegated);
        Assert.Null(signeeContexts[1].SigneeState.DelegationFailure);

        accessManagementClient.Verify(
            x => x.DelegateRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()),
            Times.Once // Only the second signee (with a party uuid) results in a client call
        );
    }

    [Fact]
    public async Task DelegateRights_PermanentFailure_RecordsClassifiedCodeAndReasonAndContinues()
    {
        // Arrange
        var accessManagementClient = new Mock<IAccessManagementClient>();
        accessManagementClient
            .SetupSequence(x => x.DelegateRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AccessManagementRequestException("Forbidden", null, HttpStatusCode.Forbidden, null))
            .ReturnsAsync(new DelegationResponse());
        var logger = new Mock<ILogger<SigningDelegationService>>();
        var service = new SigningDelegationService(accessManagementClient.Object, logger.Object);
        var taskId = "taskId";
        Guid instanceGuid = Guid.NewGuid();
        var instanceId = "instanceOwnerPartyId" + "/" + instanceGuid;
        Guid instanceOwnerPartyUuid = Guid.NewGuid();
        var appIdentifier = new AppIdentifier("testOrg", "testApp");
        Guid workflowId = Guid.NewGuid();
        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                SigneeState = new SigneeState() { IsAccessDelegated = false },
                Signee = CreateSigneeWithPartyUuid(Guid.NewGuid()),
            },
            new()
            {
                TaskId = taskId,
                SigneeState = new SigneeState() { IsAccessDelegated = false },
                Signee = CreateSigneeWithPartyUuid(Guid.NewGuid()),
            },
        };
        var ct = CancellationToken.None;

        // Act
        await service.DelegateRights(
            taskId,
            instanceId,
            instanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            workflowId,
            ct
        );

        // Assert
        Assert.False(signeeContexts[0].SigneeState.IsAccessDelegated);
        Assert.Equal(DelegationFailureCode.Rejected, signeeContexts[0].SigneeState.DelegationFailure);
        Assert.False(string.IsNullOrEmpty(signeeContexts[0].SigneeState.DelegationFailedReason));

        // The second signee is still processed after the first one's permanent failure.
        Assert.True(signeeContexts[1].SigneeState.IsAccessDelegated);
        Assert.Null(signeeContexts[1].SigneeState.DelegationFailure);

        accessManagementClient.Verify(
            x => x.DelegateRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()),
            Times.Exactly(2)
        );
    }

    [Fact]
    public async Task DelegateRights_TransientFailure_Rethrows()
    {
        // Arrange
        var accessManagementClient = new Mock<IAccessManagementClient>();
        var transientException = new HttpRequestException("network error"); // No StatusCode -> a transport failure
        accessManagementClient
            .Setup(x => x.DelegateRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(transientException);
        var logger = new Mock<ILogger<SigningDelegationService>>();
        var service = new SigningDelegationService(accessManagementClient.Object, logger.Object);
        var taskId = "taskId";
        Guid instanceGuid = Guid.NewGuid();
        var instanceId = "instanceOwnerPartyId" + "/" + instanceGuid;
        Guid instanceOwnerPartyUuid = Guid.NewGuid();
        var appIdentifier = new AppIdentifier("testOrg", "testApp");
        Guid workflowId = Guid.NewGuid();
        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                SigneeState = new SigneeState() { IsAccessDelegated = false },
                Signee = CreateSigneeWithPartyUuid(Guid.NewGuid()),
            },
        };
        var ct = CancellationToken.None;

        // Act & Assert
        HttpRequestException thrown = await Assert.ThrowsAsync<HttpRequestException>(() =>
            service.DelegateRights(
                taskId,
                instanceId,
                instanceOwnerPartyUuid,
                appIdentifier,
                signeeContexts,
                workflowId,
                ct
            )
        );
        Assert.Same(transientException, thrown);
        Assert.False(signeeContexts[0].SigneeState.IsAccessDelegated);
    }

    [Fact]
    public async Task DelegateRights_WhenInstanceIdFormatIsInvalid_ThrowsArgumentException()
    {
        // Arrange
        var accessManagementClient = new Mock<IAccessManagementClient>();
        var logger = new Mock<ILogger<SigningDelegationService>>();
        var service = new SigningDelegationService(accessManagementClient.Object, logger.Object);
        var taskId = "taskId";
        var invalidInstanceId = "invalidInstanceId"; // Invalid format, missing '/'
        Guid instanceOwnerPartyUuid = Guid.NewGuid();
        var appIdentifier = new AppIdentifier("testOrg", "testApp");
        Guid workflowId = Guid.NewGuid();
        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                SigneeState = new SigneeState() { IsAccessDelegated = false },
                Signee = _signee,
            },
        };
        var ct = CancellationToken.None;

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.DelegateRights(
                taskId,
                invalidInstanceId,
                instanceOwnerPartyUuid,
                appIdentifier,
                signeeContexts,
                workflowId,
                ct
            )
        );
    }

    [Fact]
    public async Task RevokeSigneeRights_WhenRevocationFails_ReturnsFalseAndSetsFailureReason()
    {
        // Arrange
        var accessManagementClient = new Mock<IAccessManagementClient>();
        accessManagementClient
            .Setup(x => x.RevokeRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Revocation failed"));
        var logger = new Mock<ILogger<SigningDelegationService>>();
        var service = new SigningDelegationService(accessManagementClient.Object, logger.Object);
        var taskId = "taskId";
        Guid instanceGuid = Guid.NewGuid();
        var instanceId = "instanceOwnerPartyId" + "/" + instanceGuid;
        Guid instanceOwnerPartyUuid = Guid.NewGuid();
        var appIdentifier = new AppIdentifier("testOrg", "testApp");
        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                SigneeState = new SigneeState() { IsAccessDelegated = true },
                Signee = _signee,
            },
        };
        var ct = new CancellationToken();

        // Act
        (signeeContexts, var success) = await service.RevokeSigneeRights(
            taskId,
            instanceId,
            instanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            ct
        );

        // Assert
        Assert.False(success);
        Assert.Contains("Failed to revoke signee rights", signeeContexts[0].SigneeState.DelegationFailedReason);
    }

    [Fact]
    public async Task RevokeSigneeRights_WhenInstanceIdFormatIsInvalid_ThrowsArgumentException()
    {
        // Arrange
        var accessManagementClient = new Mock<IAccessManagementClient>();
        var logger = new Mock<ILogger<SigningDelegationService>>();
        var service = new SigningDelegationService(accessManagementClient.Object, logger.Object);
        var taskId = "taskId";
        var invalidInstanceId = "invalidInstanceId"; // Invalid format, missing '/'
        Guid instanceOwnerPartyUuid = Guid.NewGuid();
        var appIdentifier = new AppIdentifier("testOrg", "testApp");
        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                SigneeState = new SigneeState() { IsAccessDelegated = true },
                Signee = _signee,
            },
        };
        var ct = new CancellationToken();

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.RevokeSigneeRights(
                taskId,
                invalidInstanceId,
                instanceOwnerPartyUuid,
                appIdentifier,
                signeeContexts,
                ct
            )
        );
    }

    [Fact]
    public async Task DelegateRights_WithTelemetry_RecordsSuccessfulDelegation()
    {
        // Arrange
        var accessManagementClient = new Mock<IAccessManagementClient>();
        accessManagementClient
            .Setup(x => x.DelegateRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DelegationResponse());
        var logger = new Mock<ILogger<SigningDelegationService>>();
        var service = new SigningDelegationService(accessManagementClient.Object, logger.Object);
        var taskId = "taskId";
        Guid instanceGuid = Guid.NewGuid();
        var instanceId = "instanceOwnerPartyId" + "/" + instanceGuid;
        Guid instanceOwnerPartyUuid = Guid.NewGuid();
        var appIdentifier = new AppIdentifier("testOrg", "testApp");
        Guid workflowId = Guid.NewGuid();
        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                SigneeState = new SigneeState() { IsAccessDelegated = false },
                Signee = CreateSigneeWithPartyUuid(Guid.NewGuid()),
            },
        };
        var ct = CancellationToken.None;

        // Act
        await service.DelegateRights(
            taskId,
            instanceId,
            instanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            workflowId,
            ct
        );

        // Assert
        Assert.True(signeeContexts[0].SigneeState.IsAccessDelegated);
    }

    [Fact]
    public async Task DelegateRights_RecordsFailedDelegationOnError()
    {
        // Arrange
        var accessManagementClient = new Mock<IAccessManagementClient>();
        accessManagementClient
            .Setup(x => x.DelegateRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Delegation failed"));
        var logger = new Mock<ILogger<SigningDelegationService>>();
        var service = new SigningDelegationService(accessManagementClient.Object, logger.Object);
        var taskId = "taskId";
        Guid instanceGuid = Guid.NewGuid();
        var instanceId = "instanceOwnerPartyId" + "/" + instanceGuid;
        Guid instanceOwnerPartyUuid = Guid.NewGuid();
        var appIdentifier = new AppIdentifier("testOrg", "testApp");
        Guid workflowId = Guid.NewGuid();
        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                SigneeState = new SigneeState() { IsAccessDelegated = false },
                Signee = CreateSigneeWithPartyUuid(Guid.NewGuid()),
            },
        };
        var ct = CancellationToken.None;

        // Act
        // A generic exception with no HTTP status and no transport cause classifies as a permanent per-signee
        // failure, so this does not throw - the failure is recorded on the signee instead.
        await service.DelegateRights(
            taskId,
            instanceId,
            instanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            workflowId,
            ct
        );

        // Assert
        Assert.False(signeeContexts[0].SigneeState.IsAccessDelegated);
        Assert.NotNull(signeeContexts[0].SigneeState.DelegationFailure);
    }

    [Fact]
    public async Task RevokeSigneeRights_WithTelemetry_RecordsSuccessfulRevocation()
    {
        // Arrange
        var accessManagementClient = new Mock<IAccessManagementClient>();
        var logger = new Mock<ILogger<SigningDelegationService>>();
        var service = new SigningDelegationService(accessManagementClient.Object, logger.Object);
        var taskId = "taskId";
        Guid instanceGuid = Guid.NewGuid();
        var instanceId = "instanceOwnerPartyId" + "/" + instanceGuid;
        Guid instanceOwnerPartyUuid = Guid.NewGuid();
        var appIdentifier = new AppIdentifier("testOrg", "testApp");
        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                SigneeState = new SigneeState() { IsAccessDelegated = true },
                Signee = _signee,
            },
        };
        var ct = new CancellationToken();

        // Act
        (signeeContexts, bool success) = await service.RevokeSigneeRights(
            taskId,
            instanceId,
            instanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            ct
        );

        // Assert
        Assert.True(success);
        Assert.False(signeeContexts[0].SigneeState.IsAccessDelegated);
    }

    [Fact]
    public async Task RevokeSigneeRights_RecordsFailedRevocationOnError()
    {
        // Arrange
        var accessManagementClient = new Mock<IAccessManagementClient>();
        accessManagementClient
            .Setup(x => x.RevokeRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Revocation failed"));
        var logger = new Mock<ILogger<SigningDelegationService>>();
        var service = new SigningDelegationService(accessManagementClient.Object, logger.Object);
        var taskId = "taskId";
        Guid instanceGuid = Guid.NewGuid();
        var instanceId = "instanceOwnerPartyId" + "/" + instanceGuid;
        Guid instanceOwnerPartyUuid = Guid.NewGuid();
        var appIdentifier = new AppIdentifier("testOrg", "testApp");
        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                SigneeState = new SigneeState() { IsAccessDelegated = true },
                Signee = _signee,
            },
        };
        var ct = new CancellationToken();

        // Act
        (signeeContexts, bool success) = await service.RevokeSigneeRights(
            taskId,
            instanceId,
            instanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            ct
        );

        // Assert
        Assert.False(success);
    }

    [Fact]
    public async Task DelegateRights_WithAdditionalActions_DelegatesAllRights()
    {
        // Arrange
        DelegationRequest? capturedRequest = null;
        var accessManagementClient = new Mock<IAccessManagementClient>();
        accessManagementClient
            .Setup(x => x.DelegateRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()))
            .Callback<DelegationRequest, CancellationToken>((req, _) => capturedRequest = req)
            .ReturnsAsync(new DelegationResponse());
        var logger = new Mock<ILogger<SigningDelegationService>>();
        var service = new SigningDelegationService(accessManagementClient.Object, logger.Object);
        var taskId = "taskId";
        Guid instanceGuid = Guid.NewGuid();
        var instanceId = "instanceOwnerPartyId" + "/" + instanceGuid;
        Guid instanceOwnerPartyUuid = Guid.NewGuid();
        var appIdentifier = new AppIdentifier("testOrg", "testApp");
        Guid workflowId = Guid.NewGuid();
        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                SigneeState = new SigneeState() { IsAccessDelegated = false },
                Signee = CreateSigneeWithPartyUuid(Guid.NewGuid()),
                AdditionalActionsToDelegate = ["reject"],
            },
        };
        var ct = CancellationToken.None;

        // Act
        await service.DelegateRights(
            taskId,
            instanceId,
            instanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            workflowId,
            ct
        );

        // Assert
        Assert.True(signeeContexts[0].SigneeState.IsAccessDelegated);
        Assert.NotNull(capturedRequest);
        Assert.Equal(3, capturedRequest!.Rights.Count);
        Assert.Equal("read", capturedRequest.Rights[0].Action!.Value);
        Assert.Equal("sign", capturedRequest.Rights[1].Action!.Value);
        Assert.Equal("reject", capturedRequest.Rights[2].Action!.Value);
    }

    [Fact]
    public async Task DelegateRights_WithNullAdditionalActions_DelegatesOnlyReadAndSign()
    {
        // Arrange
        DelegationRequest? capturedRequest = null;
        var accessManagementClient = new Mock<IAccessManagementClient>();
        accessManagementClient
            .Setup(x => x.DelegateRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()))
            .Callback<DelegationRequest, CancellationToken>((req, _) => capturedRequest = req)
            .ReturnsAsync(new DelegationResponse());
        var logger = new Mock<ILogger<SigningDelegationService>>();
        var service = new SigningDelegationService(accessManagementClient.Object, logger.Object);
        var taskId = "taskId";
        Guid instanceGuid = Guid.NewGuid();
        var instanceId = "instanceOwnerPartyId" + "/" + instanceGuid;
        Guid instanceOwnerPartyUuid = Guid.NewGuid();
        var appIdentifier = new AppIdentifier("testOrg", "testApp");
        Guid workflowId = Guid.NewGuid();
        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                SigneeState = new SigneeState() { IsAccessDelegated = false },
                Signee = CreateSigneeWithPartyUuid(Guid.NewGuid()),
                AdditionalActionsToDelegate = null,
            },
        };
        var ct = CancellationToken.None;

        // Act
        await service.DelegateRights(
            taskId,
            instanceId,
            instanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            workflowId,
            ct
        );

        // Assert
        Assert.True(signeeContexts[0].SigneeState.IsAccessDelegated);
        Assert.NotNull(capturedRequest);
        Assert.Equal(2, capturedRequest!.Rights.Count);
        Assert.Equal("read", capturedRequest.Rights[0].Action!.Value);
        Assert.Equal("sign", capturedRequest.Rights[1].Action!.Value);
    }

    [Fact]
    public async Task RevokeSigneeRights_WithAdditionalActions_RevokesAllRights()
    {
        // Arrange
        DelegationRequest? capturedRequest = null;
        var accessManagementClient = new Mock<IAccessManagementClient>();
        accessManagementClient
            .Setup(x => x.RevokeRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()))
            .Callback<DelegationRequest, CancellationToken>((req, _) => capturedRequest = req)
            .ReturnsAsync(new DelegationResponse());
        var logger = new Mock<ILogger<SigningDelegationService>>();
        var service = new SigningDelegationService(accessManagementClient.Object, logger.Object);
        var taskId = "taskId";
        Guid instanceGuid = Guid.NewGuid();
        var instanceId = "instanceOwnerPartyId" + "/" + instanceGuid;
        Guid instanceOwnerPartyUuid = Guid.NewGuid();
        var appIdentifier = new AppIdentifier("testOrg", "testApp");
        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                SigneeState = new SigneeState() { IsAccessDelegated = true },
                Signee = _signee,
                AdditionalActionsToDelegate = ["reject"],
            },
        };
        var ct = new CancellationToken();

        // Act
        (signeeContexts, var success) = await service.RevokeSigneeRights(
            taskId,
            instanceId,
            instanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            ct
        );

        // Assert
        Assert.True(success);
        Assert.False(signeeContexts[0].SigneeState.IsAccessDelegated);
        Assert.NotNull(capturedRequest);
        Assert.Equal(3, capturedRequest!.Rights.Count);
        Assert.Equal("read", capturedRequest.Rights[0].Action!.Value);
        Assert.Equal("sign", capturedRequest.Rights[1].Action!.Value);
        Assert.Equal("reject", capturedRequest.Rights[2].Action!.Value);
    }
}
