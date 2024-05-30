#nullable disable
using Altinn.App.Core.Features.Action;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Sign;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Core.Tests.Internal.Process.TestUtils;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Signee = Altinn.App.Core.Internal.Sign.Signee;

namespace Altinn.App.Core.Tests.Features.Action;

public class SigningUserActionTests
{
    [Fact]
    public async Task HandleAction_returns_ok_if_user_is_valid()
    {
        // Arrange
        UserProfile userProfile = new UserProfile()
        {
            UserId = 1337,
            Party = new Party() { SSN = "12345678901" }
        };
        var appMetadata = new ApplicationMetadata("org/id") { DataTypes = [new DataType { Id = "model" }] };
        (var userAction, var signClientMock) = CreateSigningUserAction(
            applicationMetadataToReturn: appMetadata,
            userProfileToReturn: userProfile
        );
        var instance = new Instance()
        {
            Id = "500000/b194e9f5-02d0-41bc-8461-a0cbac8a6efc",
            InstanceOwner = new() { PartyId = "5000", },
            Process = new() { CurrentTask = new() { ElementId = "Task2" } },
            Data = new()
            {
                new() { Id = "a499c3ef-e88a-436b-8650-1c43e5037ada", DataType = "Model" }
            }
        };
        var userActionContext = new UserActionContext(instance, 1337);

        // Act
        var result = await userAction.HandleAction(userActionContext);

        // Assert
        SignatureContext expected = new SignatureContext(
            new InstanceIdentifier(instance),
            instance.Process.CurrentTask.ElementId,
            "signature",
            new Signee() { UserId = "1337", PersonNumber = "12345678901" },
            new DataElementSignature("a499c3ef-e88a-436b-8650-1c43e5037ada")
        );
        signClientMock.Verify(
            s => s.SignDataElements(It.Is<SignatureContext>(sc => AssertSigningContextAsExpected(sc, expected))),
            Times.Once
        );
        result.Should().BeEquivalentTo(UserActionResult.SuccessResult());
        signClientMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleAction_returns_ok_if_no_dataElementSignature_and_optional_datatypes()
    {
        // Arrange
        UserProfile userProfile = new UserProfile()
        {
            UserId = 1337,
            Party = new Party() { SSN = "12345678901" }
        };
        var appMetadata = new ApplicationMetadata("org/id")
        {
            // Optional because MinCount == 0
            DataTypes = [new DataType { Id = "model", MinCount = 0 }]
        };
        (var userAction, var signClientMock) = CreateSigningUserAction(
            applicationMetadataToReturn: appMetadata,
            userProfileToReturn: userProfile
        );
        var instance = new Instance()
        {
            Id = "500000/b194e9f5-02d0-41bc-8461-a0cbac8a6efc",
            InstanceOwner = new() { PartyId = "5000", },
            Process = new() { CurrentTask = new() { ElementId = "Task2" } },
            Data = new()
            {
                new() { Id = "a499c3ef-e88a-436b-8650-1c43e5037ada", DataType = "Model" }
            }
        };
        var userActionContext = new UserActionContext(instance, 1337);

        // Act
        var result = await userAction.HandleAction(userActionContext);

        // Assert
        SignatureContext expected = new SignatureContext(
            new InstanceIdentifier(instance),
            instance.Process.CurrentTask.ElementId,
            "signature",
            new Signee() { UserId = "1337", PersonNumber = "12345678901" },
            new DataElementSignature("a499c3ef-e88a-436b-8650-1c43e5037ada")
        );
        signClientMock.Verify(
            s => s.SignDataElements(It.Is<SignatureContext>(sc => AssertSigningContextAsExpected(sc, expected))),
            Times.Once
        );
        result.Should().BeEquivalentTo(UserActionResult.SuccessResult());
        signClientMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleAction_returns_error_when_UserId_not_set_in_context()
    {
        // Arrange
        UserProfile userProfile = new UserProfile()
        {
            UserId = 1337,
            Party = new Party() { SSN = "12345678901" }
        };
        (var userAction, var signClientMock) = CreateSigningUserAction(userProfile);
        var instance = new Instance()
        {
            Id = "500000/b194e9f5-02d0-41bc-8461-a0cbac8a6efc",
            InstanceOwner = new() { PartyId = "5000", },
            Process = new() { CurrentTask = new() { ElementId = "Task2" } },
            Data = new()
            {
                new() { Id = "a499c3ef-e88a-436b-8650-1c43e5037ada", DataType = "Model" }
            }
        };
        var userActionContext = new UserActionContext(instance, null);

        // Act
        var result = await userAction.HandleAction(userActionContext);

        // Assert
        var fail = UserActionResult.FailureResult(
            error: new ActionError() { Code = "NoUserId", Message = "User id is missing in token" },
            errorType: ProcessErrorType.Unauthorized
        );
        result.Should().BeEquivalentTo(fail);
        signClientMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleAction_throws_ApplicationConfigException_when_no_dataElementSignature_and_mandatory_datatypes()
    {
        // Arrange
        UserProfile userProfile = new UserProfile()
        {
            UserId = 1337,
            Party = new Party() { SSN = "12345678901" }
        };
        var appMetadata = new ApplicationMetadata("org/id")
        {
            // Mandatory because MinCount != 0
            DataTypes =
            [
                new DataType { Id = "not_match", MinCount = 0 },
                new DataType { Id = "not_match_2", MinCount = 1 }
            ]
        };
        (var userAction, var signClientMock) = CreateSigningUserAction(
            applicationMetadataToReturn: appMetadata,
            userProfileToReturn: userProfile
        );
        var instance = new Instance()
        {
            Id = "500000/b194e9f5-02d0-41bc-8461-a0cbac8a6efc",
            InstanceOwner = new() { PartyId = "5000", },
            Process = new() { CurrentTask = new() { ElementId = "Task2" } },
            Data = new()
            {
                new() { Id = "a499c3ef-e88a-436b-8650-1c43e5037ada", DataType = "Model" }
            }
        };
        var userActionContext = new UserActionContext(instance, 1337);

        // Act
        await Assert.ThrowsAsync<ApplicationConfigException>(
            async () => await userAction.HandleAction(userActionContext)
        );
        signClientMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleAction_throws_ApplicationConfigException_if_SignatureDataType_is_null()
    {
        // Arrange
        UserProfile userProfile = new UserProfile()
        {
            UserId = 1337,
            Party = new Party() { SSN = "12345678901" }
        };
        (var userAction, var signClientMock) = CreateSigningUserAction(
            userProfileToReturn: userProfile,
            testBpmnfilename: "signing-task-process-missing-config.bpmn"
        );
        var instance = new Instance()
        {
            Id = "500000/b194e9f5-02d0-41bc-8461-a0cbac8a6efc",
            InstanceOwner = new() { PartyId = "5000", },
            Process = new() { CurrentTask = new() { ElementId = "Task2" } },
            Data = new()
            {
                new() { Id = "a499c3ef-e88a-436b-8650-1c43e5037ada", DataType = "Model" }
            }
        };
        var userActionContext = new UserActionContext(instance, 1337);

        // Act
        await Assert.ThrowsAsync<ApplicationConfigException>(
            async () => await userAction.HandleAction(userActionContext)
        );
        signClientMock.VerifyNoOtherCalls();
    }

    private static (SigningUserAction SigningUserAction, Mock<ISignClient> SignClientMock) CreateSigningUserAction(
        UserProfile userProfileToReturn = null,
        ApplicationMetadata applicationMetadataToReturn = null,
        PlatformHttpException platformHttpExceptionToThrow = null,
        string testBpmnfilename = "signing-task-process.bpmn"
    )
    {
        IProcessReader processReader = ProcessTestUtils.SetupProcessReader(
            testBpmnfilename,
            Path.Combine("Features", "Action", "TestData")
        );

        var profileClientMock = new Mock<IProfileClient>();
        var signingClientMock = new Mock<ISignClient>();
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock.Setup(m => m.GetApplicationMetadata()).ReturnsAsync(applicationMetadataToReturn);
        profileClientMock.Setup(p => p.GetUserProfile(It.IsAny<int>())).ReturnsAsync(userProfileToReturn);
        if (platformHttpExceptionToThrow != null)
        {
            signingClientMock
                .Setup(p => p.SignDataElements(It.IsAny<SignatureContext>()))
                .ThrowsAsync(platformHttpExceptionToThrow);
        }

        return (
            new SigningUserAction(
                processReader,
                new NullLogger<SigningUserAction>(),
                profileClientMock.Object,
                signingClientMock.Object,
                appMetadataMock.Object
            ),
            signingClientMock
        );
    }

    private bool AssertSigningContextAsExpected(SignatureContext s1, SignatureContext s2)
    {
        s1.Should().BeEquivalentTo(s2);
        return true;
    }
}
