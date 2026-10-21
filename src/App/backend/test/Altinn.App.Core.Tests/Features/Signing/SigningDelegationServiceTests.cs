using System.Net;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.AccessManagement;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.AccessManagement.Exceptions;
using Altinn.App.Core.Internal.AccessManagement.Models;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
using Microsoft.Extensions.Logging;
using Moq;
using static Altinn.App.Core.Features.Signing.Models.Signee;
using InternalSignee = Altinn.App.Core.Features.Signing.Models.Signee;
using SignDocument = Altinn.Platform.Storage.Interface.Models.SignDocument;
using SigneeState = Altinn.App.Core.Features.Signing.Models.SigneeContextState;
using StorageSignee = Altinn.Platform.Storage.Interface.Models.Signee;

namespace Altinn.App.Core.Tests.Features.Signing;

public class SigningDelegationServiceTests
{
    private readonly InternalSignee _signee = new PersonSignee
    {
        FullName = "Testperson 1",
        SocialSecurityNumber = "123456678233",
        Party = new Party { PartyUuid = Guid.NewGuid() },
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
        var cancellationToken = new CancellationToken();

        // Act
        (signeeContexts, var success) = await service.RevokeSigneeRights(
            taskId,
            instanceId,
            InstanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            cancellationToken
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
        var cancellationToken = new CancellationToken();

        // Act
        (signeeContexts, var success) = await service.RevokeSigneeRights(
            taskId,
            instanceId,
            InstanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            cancellationToken
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
    public async Task DelegateSigneeRights_DelegateSigneeRights()
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
                SigneeState = new SigneeState() { IsAccessDelegated = false },
                Signee = _signee,
            },
        };
        var cancellationToken = new CancellationToken();

        // Act
        await service.DelegateSigneeRights(
            taskId,
            instanceId,
            InstanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            cancellationToken
        );

        // Assert
        Assert.True(signeeContexts[0].SigneeState.IsAccessDelegated);
    }

    [Fact]
    public async Task DelegateSigneeRights_WhenAlreadyDelegated_DoesNotInvokeClient()
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
        Guid InstanceOwnerPartyUuid = Guid.NewGuid();
        var appIdentifier = new AppIdentifier("testOrg", "testApp");
        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                SigneeState = new SigneeState() { IsAccessDelegated = true }, // Signee is already delegated signing rights
                Signee = _signee,
            },
        };
        var cancellationToken = new CancellationToken();

        // Act
        await service.DelegateSigneeRights(
            taskId,
            instanceId,
            InstanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            cancellationToken
        );

        // Assert
        Assert.True(signeeContexts[0].SigneeState.IsAccessDelegated);
        accessManagementClient.Verify(
            x => x.DelegateRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()),
            Times.Never // No rights should be delegated, as the signee already has signing rights
        );
    }

    [Fact]
    public async Task DelegateSigneeRights_WhenSigneeHasNoPartyUuid_RecordsFailureWithoutCallingAccessManagement()
    {
        // Arrange
        var accessManagementClient = new Mock<IAccessManagementClient>();
        var logger = new Mock<ILogger<SigningDelegationService>>();
        var service = new SigningDelegationService(accessManagementClient.Object, logger.Object);
        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = "taskId",
                SigneeState = new SigneeState() { IsAccessDelegated = false },
                Signee = new PersonSignee
                {
                    FullName = "Testperson 2",
                    SocialSecurityNumber = "123456678234",
                    Party = new Party(),
                },
            },
        };

        // Act
        await service.DelegateSigneeRights(
            "taskId",
            "instanceOwnerPartyId/" + Guid.NewGuid(),
            Guid.NewGuid(),
            new AppIdentifier("testOrg", "testApp"),
            signeeContexts,
            CancellationToken.None
        );

        // Assert
        Assert.False(signeeContexts[0].SigneeState.IsAccessDelegated);
        Assert.Contains("no party UUID", signeeContexts[0].SigneeState.DelegationFailedReason);
        accessManagementClient.Verify(
            x => x.DelegateRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Theory]
    [InlineData(HttpStatusCode.BadRequest)]
    [InlineData(HttpStatusCode.NotFound)]
    public async Task DelegateSigneeRights_WhenAccessManagementRejectsTheSignee_RecordsFailureAndContinues(
        HttpStatusCode status
    )
    {
        // Arrange
        var accessManagementClient = new Mock<IAccessManagementClient>();
        accessManagementClient
            .SetupSequence(x => x.DelegateRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AccessManagementRequestException("Rejected", null, status, null))
            .ReturnsAsync(new DelegationResponse());
        var logger = new Mock<ILogger<SigningDelegationService>>();
        var service = new SigningDelegationService(accessManagementClient.Object, logger.Object);
        List<SigneeContext> signeeContexts = [CreateUndelegatedSignee(), CreateUndelegatedSignee()];

        // Act
        await service.DelegateSigneeRights(
            "taskId",
            "instanceOwnerPartyId/" + Guid.NewGuid(),
            Guid.NewGuid(),
            new AppIdentifier("testOrg", "testApp"),
            signeeContexts,
            CancellationToken.None
        );

        // Assert
        Assert.False(signeeContexts[0].SigneeState.IsAccessDelegated);
        Assert.Contains("Failed to delegate signee rights", signeeContexts[0].SigneeState.DelegationFailedReason);
        Assert.True(signeeContexts[1].SigneeState.IsAccessDelegated);
        Assert.Null(signeeContexts[1].SigneeState.DelegationFailedReason);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(HttpStatusCode.Unauthorized)]
    [InlineData(HttpStatusCode.Forbidden)]
    [InlineData(HttpStatusCode.TooManyRequests)]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    public async Task DelegateSigneeRights_WhenTheFailureIsNotAboutTheSignee_Throws(HttpStatusCode? status)
    {
        // Arrange
        var accessManagementClient = new Mock<IAccessManagementClient>();
        accessManagementClient
            .Setup(x => x.DelegateRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AccessManagementRequestException("Failed", null, status, null));
        var logger = new Mock<ILogger<SigningDelegationService>>();
        var service = new SigningDelegationService(accessManagementClient.Object, logger.Object);
        List<SigneeContext> signeeContexts = [CreateUndelegatedSignee()];

        // Act & Assert
        await Assert.ThrowsAsync<AccessManagementRequestException>(() =>
            service.DelegateSigneeRights(
                "taskId",
                "instanceOwnerPartyId/" + Guid.NewGuid(),
                Guid.NewGuid(),
                new AppIdentifier("testOrg", "testApp"),
                signeeContexts,
                CancellationToken.None
            )
        );
        Assert.False(signeeContexts[0].SigneeState.IsAccessDelegated);
        Assert.Null(signeeContexts[0].SigneeState.DelegationFailedReason);
    }

    private static SigneeContext CreateUndelegatedSignee() =>
        new()
        {
            TaskId = "taskId",
            SigneeState = new SigneeState() { IsAccessDelegated = false },
            Signee = new PersonSignee
            {
                FullName = "Testperson",
                SocialSecurityNumber = "123456678233",
                Party = new Party { PartyUuid = Guid.NewGuid() },
            },
        };

    [Fact]
    public async Task DelegateSigneeRights_WhenInstanceIdFormatIsInvalid_ThrowsArgumentException()
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
                SigneeState = new SigneeState() { IsAccessDelegated = false },
                Signee = _signee,
            },
        };
        var cancellationToken = new CancellationToken();

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.DelegateSigneeRights(
                taskId,
                invalidInstanceId,
                instanceOwnerPartyUuid,
                appIdentifier,
                signeeContexts,
                cancellationToken
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
        var cancellationToken = new CancellationToken();

        // Act
        (signeeContexts, var success) = await service.RevokeSigneeRights(
            taskId,
            instanceId,
            instanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            cancellationToken
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
        var cancellationToken = new CancellationToken();

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.RevokeSigneeRights(
                taskId,
                invalidInstanceId,
                instanceOwnerPartyUuid,
                appIdentifier,
                signeeContexts,
                cancellationToken
            )
        );
    }

    [Fact]
    public async Task DelegateSigneeRights_WithTelemetry_RecordsSuccessfulDelegation()
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
                SigneeState = new SigneeState() { IsAccessDelegated = false },
                Signee = _signee,
            },
        };
        var cancellationToken = new CancellationToken();

        // Act
        await service.DelegateSigneeRights(
            taskId,
            instanceId,
            instanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            cancellationToken
        );

        // Assert
        Assert.True(signeeContexts[0].SigneeState.IsAccessDelegated);
    }

    [Fact]
    public async Task DelegateSigneeRights_RecordsFailedDelegationOnError()
    {
        // Arrange
        var accessManagementClient = new Mock<IAccessManagementClient>();
        accessManagementClient
            .Setup(x => x.DelegateRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AccessManagementRequestException("Rejected", null, HttpStatusCode.BadRequest, null));
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
                SigneeState = new SigneeState() { IsAccessDelegated = false },
                Signee = _signee,
            },
        };
        var cancellationToken = new CancellationToken();

        // Act
        await service.DelegateSigneeRights(
            taskId,
            instanceId,
            instanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            cancellationToken
        );

        // Assert
        Assert.False(signeeContexts[0].SigneeState.IsAccessDelegated);
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
        var cancellationToken = new CancellationToken();

        // Act
        (signeeContexts, bool success) = await service.RevokeSigneeRights(
            taskId,
            instanceId,
            instanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            cancellationToken
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
        var cancellationToken = new CancellationToken();

        // Act
        (signeeContexts, bool success) = await service.RevokeSigneeRights(
            taskId,
            instanceId,
            instanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            cancellationToken
        );

        // Assert
        Assert.False(success);
    }

    [Fact]
    public async Task DelegateSigneeRights_WithAdditionalActions_DelegatesAllRights()
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
        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                SigneeState = new SigneeState() { IsAccessDelegated = false },
                Signee = _signee,
                AdditionalActionsToDelegate = ["reject"],
            },
        };
        var cancellationToken = new CancellationToken();

        // Act
        await service.DelegateSigneeRights(
            taskId,
            instanceId,
            instanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            cancellationToken
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
    public async Task DelegateSigneeRights_WithNullAdditionalActions_DelegatesOnlyReadAndSign()
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
        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                SigneeState = new SigneeState() { IsAccessDelegated = false },
                Signee = _signee,
                AdditionalActionsToDelegate = null,
            },
        };
        var cancellationToken = new CancellationToken();

        // Act
        await service.DelegateSigneeRights(
            taskId,
            instanceId,
            instanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            cancellationToken
        );

        // Assert
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
        var cancellationToken = new CancellationToken();

        // Act
        (signeeContexts, var success) = await service.RevokeSigneeRights(
            taskId,
            instanceId,
            instanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            cancellationToken
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

    private static readonly Party _personParty = new()
    {
        PartyUuid = Guid.NewGuid(),
        SSN = "12345678901",
        Name = "Testperson 3",
    };

    private static readonly Party _orgParty = new()
    {
        PartyUuid = Guid.NewGuid(),
        OrgNumber = "312345678",
        Name = "Testorganisasjon AS",
    };

    private static PersonSignee CreatePersonSignee() =>
        new()
        {
            Party = _personParty,
            SocialSecurityNumber = _personParty.SSN,
            FullName = _personParty.Name,
        };

    private static OrganizationSignee CreateOrganizationSignee() =>
        new()
        {
            OrgParty = _orgParty,
            OrgNumber = _orgParty.OrgNumber,
            OrgName = _orgParty.Name,
        };

    /// <summary>Records the requests Access Management receives.</summary>
    private static Mock<IAccessManagementClient> CreateRecordingAccessManagementClient(
        List<DelegationRequest> delegations,
        List<DelegationRequest> revocations
    )
    {
        var accessManagementClient = new Mock<IAccessManagementClient>();
        accessManagementClient
            .Setup(x => x.DelegateRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()))
            .Callback<DelegationRequest, CancellationToken>((request, _) => delegations.Add(request))
            .ReturnsAsync(new DelegationResponse());
        accessManagementClient
            .Setup(x => x.RevokeRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()))
            .Callback<DelegationRequest, CancellationToken>((request, _) => revocations.Add(request))
            .ReturnsAsync(new DelegationResponse());
        return accessManagementClient;
    }

    [Theory]
    [InlineData("person")]
    [InlineData("organization")]
    public async Task RevokeSigneeRights_RevokesFromThePartyTheRightsWereDelegatedTo(string signeeKind)
    {
        // Arrange
        List<DelegationRequest> delegations = [];
        List<DelegationRequest> revocations = [];
        var accessManagementClient = CreateRecordingAccessManagementClient(delegations, revocations);
        var service = new SigningDelegationService(
            accessManagementClient.Object,
            new Mock<ILogger<SigningDelegationService>>().Object
        );
        InternalSignee signee = signeeKind == "person" ? CreatePersonSignee() : CreateOrganizationSignee();
        string instanceId = "instanceOwnerPartyId/" + Guid.NewGuid();
        var appIdentifier = new AppIdentifier("testOrg", "testApp");
        List<SigneeContext> signeeContexts =
        [
            new()
            {
                TaskId = "taskId",
                SigneeState = new SigneeState(),
                Signee = signee,
            },
        ];
        await service.DelegateSigneeRights(
            "taskId",
            instanceId,
            Guid.NewGuid(),
            appIdentifier,
            signeeContexts,
            CancellationToken.None
        );

        // Act
        (_, bool success) = await service.RevokeSigneeRights(
            "taskId",
            instanceId,
            Guid.NewGuid(),
            appIdentifier,
            signeeContexts,
            CancellationToken.None
        );

        // Assert
        Assert.True(success);
        Assert.Equal(signee.GetParty().PartyUuid, signeeContexts[0].SigneeState.DelegatedToPartyUuid);
        Assert.Equal(signee.GetParty().PartyUuid.ToString(), Assert.Single(delegations).To!.Value);
        Assert.Equal(signee.GetParty().PartyUuid.ToString(), Assert.Single(revocations).To!.Value);
    }

    [Fact]
    public async Task RevokeSigneeRights_AfterAPersonSignedForTheOrganization_RevokesFromTheOrganization()
    {
        // Arrange
        List<DelegationRequest> delegations = [];
        List<DelegationRequest> revocations = [];
        var accessManagementClient = CreateRecordingAccessManagementClient(delegations, revocations);
        var service = new SigningDelegationService(
            accessManagementClient.Object,
            new Mock<ILogger<SigningDelegationService>>().Object
        );
        string instanceId = "instanceOwnerPartyId/" + Guid.NewGuid();
        var appIdentifier = new AppIdentifier("testOrg", "testApp");
        List<SigneeContext> signeeContexts =
        [
            new()
            {
                TaskId = "taskId",
                SigneeState = new SigneeState(),
                Signee = CreateOrganizationSignee(),
                AdditionalActionsToDelegate = ["reject"],
            },
        ];
        await service.DelegateSigneeRights(
            "taskId",
            instanceId,
            Guid.NewGuid(),
            appIdentifier,
            signeeContexts,
            CancellationToken.None
        );

        // A person signs for the organization, so the signee becomes that person.
        var altinnPartyClient = new Mock<IAltinnPartyClient>();
        altinnPartyClient
            .Setup(x =>
                x.LookupParty(
                    It.Is<PartyLookup>(lookup => lookup.Ssn == _personParty.SSN),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(_personParty);
        var signDocumentManager = new SignDocumentManager(
            altinnPartyClient.Object,
            new Mock<IAppMetadata>().Object,
            new Mock<ILogger<SigningService>>().Object
        );
        List<SigneeContext> signedContexts = await signDocumentManager.SynchronizeSigneeContextsWithSignDocuments(
            "taskId",
            signeeContexts,
            [
                new SignDocument
                {
                    SigneeInfo = new StorageSignee
                    {
                        PersonNumber = _personParty.SSN,
                        OrganisationNumber = _orgParty.OrgNumber,
                    },
                },
            ],
            CancellationToken.None
        );
        Assert.IsType<PersonOnBehalfOfOrgSignee>(Assert.Single(signedContexts).Signee);

        // Act
        (_, bool success) = await service.RevokeSigneeRights(
            "taskId",
            instanceId,
            Guid.NewGuid(),
            appIdentifier,
            signedContexts,
            CancellationToken.None
        );

        // Assert
        Assert.True(success);
        Assert.Equal(_orgParty.PartyUuid.ToString(), Assert.Single(delegations).To!.Value);
        DelegationRequest revocation = Assert.Single(revocations);
        Assert.Equal(_orgParty.PartyUuid.ToString(), revocation.To!.Value);
        Assert.Equal(["read", "sign", "reject"], revocation.Rights.Select(right => right.Action!.Value));
    }

    [Theory]
    [InlineData("person", false)]
    [InlineData("organization", true)]
    [InlineData("personOnBehalfOfOrg", true)]
    [InlineData("systemUser", true)]
    public async Task RevokeSigneeRights_WhenTheStateHasNoDelegatedParty_RevokesFromTheSigneesDelegatee(
        string signeeKind,
        bool revokesFromOrganization
    )
    {
        // Arrange
        List<DelegationRequest> revocations = [];
        var accessManagementClient = CreateRecordingAccessManagementClient([], revocations);
        var service = new SigningDelegationService(
            accessManagementClient.Object,
            new Mock<ILogger<SigningDelegationService>>().Object
        );
        InternalSignee signee = signeeKind switch
        {
            "person" => CreatePersonSignee(),
            "organization" => CreateOrganizationSignee(),
            "personOnBehalfOfOrg" => new PersonOnBehalfOfOrgSignee
            {
                Party = _personParty,
                SocialSecurityNumber = _personParty.SSN,
                FullName = _personParty.Name,
                OnBehalfOfOrg = CreateOrganizationSignee(),
            },
            _ => CreateOrganizationSignee().ToSystemUserSignee(Guid.NewGuid()),
        };
        List<SigneeContext> signeeContexts =
        [
            new()
            {
                TaskId = "taskId",
                SigneeState = new SigneeState { IsAccessDelegated = true },
                Signee = signee,
            },
        ];

        // Act
        (_, bool success) = await service.RevokeSigneeRights(
            "taskId",
            "instanceOwnerPartyId/" + Guid.NewGuid(),
            Guid.NewGuid(),
            new AppIdentifier("testOrg", "testApp"),
            signeeContexts,
            CancellationToken.None
        );

        // Assert
        Assert.True(success);
        Party expectedParty = revokesFromOrganization ? _orgParty : _personParty;
        Assert.Equal(expectedParty.PartyUuid.ToString(), Assert.Single(revocations).To!.Value);
    }

    [Fact]
    public async Task RevokeSigneeRights_WhenTheDelegatedPartyIsUnknown_RecordsFailureWithoutCallingAccessManagement()
    {
        // Arrange
        var accessManagementClient = new Mock<IAccessManagementClient>();
        var service = new SigningDelegationService(
            accessManagementClient.Object,
            new Mock<ILogger<SigningDelegationService>>().Object
        );
        List<SigneeContext> signeeContexts =
        [
            new()
            {
                TaskId = "taskId",
                SigneeState = new SigneeState { IsAccessDelegated = true },
                Signee = new PersonSignee
                {
                    FullName = "Testperson 2",
                    SocialSecurityNumber = "123456678234",
                    Party = new Party(),
                },
            },
        ];

        // Act
        (_, bool success) = await service.RevokeSigneeRights(
            "taskId",
            "instanceOwnerPartyId/" + Guid.NewGuid(),
            Guid.NewGuid(),
            new AppIdentifier("testOrg", "testApp"),
            signeeContexts,
            CancellationToken.None
        );

        // Assert
        Assert.False(success);
        Assert.True(signeeContexts[0].SigneeState.IsAccessDelegated);
        Assert.Contains("Failed to revoke signee rights", signeeContexts[0].SigneeState.DelegationFailedReason);
        accessManagementClient.Verify(
            x => x.RevokeRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }
}
