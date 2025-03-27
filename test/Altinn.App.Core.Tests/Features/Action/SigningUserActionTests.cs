#nullable disable
using System.Globalization;
using Altinn.App.Core.Features.Action;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Sign;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Core.Tests.Internal.Process.TestUtils;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Signee = Altinn.App.Core.Internal.Sign.Signee;

namespace Altinn.App.Core.Tests.Features.Action;

public class SigningUserActionTests
{
    private readonly ApplicationMetadata _defaultAppMetadata = new("org/id")
    {
        DataTypes = [new DataType { Id = "model" }],
    };

    [Theory]
    [ClassData(typeof(TestAuthentication.AllTokens))]
    public async Task HandleAction_returns_ok_if_user_is_valid(TestJwtToken token)
    {
        // Arrange
        (var userAction, var signClientMock) = CreateSigningUserAction(
            applicationMetadataToReturn: _defaultAppMetadata
        );
        var instance = new Instance()
        {
            Id = "500000/b194e9f5-02d0-41bc-8461-a0cbac8a6efc",
            InstanceOwner = new() { PartyId = token.PartyId.ToString(CultureInfo.InvariantCulture) },
            Process = new() { CurrentTask = new() { ElementId = "Task2" } },
            Data = new()
            {
                new() { Id = "a499c3ef-e88a-436b-8650-1c43e5037ada", DataType = "Model" },
            },
        };
        var userActionContext = new UserActionContext(instance, null, authentication: token.Auth);

        // Act
        var result = await userAction.HandleAction(userActionContext);

        // Assert
        switch (token.Auth)
        {
            case Authenticated.User user:
                {
                    var details = await user.LoadDetails();
                    SignatureContext expected = new SignatureContext(
                        new InstanceIdentifier(instance),
                        instance.Process.CurrentTask.ElementId,
                        "signature",
                        new Signee()
                        {
                            UserId = user.UserId.ToString(CultureInfo.InvariantCulture),
                            PersonNumber = details.SelectedParty.SSN,
                        },
                        new DataElementSignature("a499c3ef-e88a-436b-8650-1c43e5037ada")
                    );
                    signClientMock.Verify(
                        s =>
                            s.SignDataElements(
                                It.Is<SignatureContext>(sc => AssertSigningContextAsExpected(sc, expected))
                            ),
                        Times.Once
                    );
                    result.Should().BeEquivalentTo(UserActionResult.SuccessResult());
                    signClientMock.VerifyNoOtherCalls();
                }
                break;
            case Authenticated.SelfIdentifiedUser selfIdentifiedUser:
                {
                    SignatureContext expected = new SignatureContext(
                        new InstanceIdentifier(instance),
                        instance.Process.CurrentTask.ElementId,
                        "signature",
                        new Signee()
                        {
                            UserId = selfIdentifiedUser.UserId.ToString(CultureInfo.InvariantCulture),
                            PersonNumber = null,
                        },
                        new DataElementSignature("a499c3ef-e88a-436b-8650-1c43e5037ada")
                    );
                    signClientMock.Verify(
                        s =>
                            s.SignDataElements(
                                It.Is<SignatureContext>(sc => AssertSigningContextAsExpected(sc, expected))
                            ),
                        Times.Once
                    );
                    result.Should().BeEquivalentTo(UserActionResult.SuccessResult());
                    signClientMock.VerifyNoOtherCalls();
                }
                break;
            case Authenticated.SystemUser systemUser:
                {
                    SignatureContext expected = new SignatureContext(
                        new InstanceIdentifier(instance),
                        instance.Process.CurrentTask.ElementId,
                        "signature",
                        new Signee()
                        {
                            SystemUserId = systemUser.SystemUserId[0],
                            OrganisationNumber = systemUser.SystemUserOrgNr.Get(OrganisationNumberFormat.Local),
                        },
                        new DataElementSignature("a499c3ef-e88a-436b-8650-1c43e5037ada")
                    );
                    signClientMock.Verify(
                        s =>
                            s.SignDataElements(
                                It.Is<SignatureContext>(sc => AssertSigningContextAsExpected(sc, expected))
                            ),
                        Times.Once
                    );
                    result.Should().BeEquivalentTo(UserActionResult.SuccessResult());
                    signClientMock.VerifyNoOtherCalls();
                }
                break;
            default:
                Assert.Equal(ProcessErrorType.Unauthorized, result.ErrorType);
                break;
        }
    }

    [Fact]
    public async Task HandleAction_returns_ok_if_no_dataElementSignature_and_optional_datatypes()
    {
        // Arrange
        var appMetadata = new ApplicationMetadata("org/id")
        {
            // Optional because MinCount == 0
            DataTypes = [new DataType { Id = "model", MinCount = 0 }],
        };
        (var userAction, var signClientMock) = CreateSigningUserAction(applicationMetadataToReturn: appMetadata);
        var instance = new Instance()
        {
            Id = "500000/b194e9f5-02d0-41bc-8461-a0cbac8a6efc",
            InstanceOwner = new() { PartyId = "5000" },
            Process = new() { CurrentTask = new() { ElementId = "Task2" } },
            Data = new()
            {
                new() { Id = "a499c3ef-e88a-436b-8650-1c43e5037ada", DataType = "Model" },
            },
        };
        var userActionContext = new UserActionContext(
            instance,
            1337,
            authentication: TestAuthentication.GetUserAuthentication(userId: 1337, applicationMetadata: appMetadata)
        );

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
        (var userAction, var signClientMock) = CreateSigningUserAction(_defaultAppMetadata);
        var instance = new Instance()
        {
            Id = "500000/b194e9f5-02d0-41bc-8461-a0cbac8a6efc",
            InstanceOwner = new() { PartyId = "5000" },
            Process = new() { CurrentTask = new() { ElementId = "Task2" } },
            Data = new()
            {
                new() { Id = "a499c3ef-e88a-436b-8650-1c43e5037ada", DataType = "Model" },
            },
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
        var appMetadata = new ApplicationMetadata("org/id")
        {
            // Mandatory because MinCount != 0
            DataTypes =
            [
                new DataType { Id = "not_match", MinCount = 0 },
                new DataType { Id = "not_match_2", MinCount = 1 },
            ],
        };
        (var userAction, var signClientMock) = CreateSigningUserAction(applicationMetadataToReturn: appMetadata);
        var instance = new Instance()
        {
            Id = "500000/b194e9f5-02d0-41bc-8461-a0cbac8a6efc",
            InstanceOwner = new() { PartyId = "5000" },
            Process = new() { CurrentTask = new() { ElementId = "Task2" } },
            Data = new()
            {
                new() { Id = "a499c3ef-e88a-436b-8650-1c43e5037ada", DataType = "Model" },
            },
        };
        var userActionContext = new UserActionContext(
            instance,
            1337,
            authentication: TestAuthentication.GetUserAuthentication(1337, applicationMetadata: appMetadata)
        );

        // Act
        await Assert.ThrowsAsync<ApplicationConfigException>(
            async () => await userAction.HandleAction(userActionContext)
        );
        signClientMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleAction_throws_ApplicationConfigException_If_SignatureDataType_is_null()
    {
        // Arrange
        (var userAction, var signClientMock) = CreateSigningUserAction(
            applicationMetadataToReturn: _defaultAppMetadata,
            testBpmnfilename: "signing-task-process-missing-config.bpmn"
        );
        var instance = new Instance()
        {
            Id = "500000/b194e9f5-02d0-41bc-8461-a0cbac8a6efc",
            InstanceOwner = new() { PartyId = "5000" },
            Process = new() { CurrentTask = new() { ElementId = "Task2" } },
            Data = new()
            {
                new() { Id = "a499c3ef-e88a-436b-8650-1c43e5037ada", DataType = "Model" },
            },
        };
        var userActionContext = new UserActionContext(
            instance,
            1337,
            authentication: TestAuthentication.GetUserAuthentication(1337, applicationMetadata: _defaultAppMetadata)
        );

        // Act
        await Assert.ThrowsAsync<ApplicationConfigException>(
            async () => await userAction.HandleAction(userActionContext)
        );
        signClientMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleAction_throws_ApplicationConfigException_If_Empty_DataTypesToSign()
    {
        // Arrange
        var appMetadata = new ApplicationMetadata("org/id") { DataTypes = [] };
        (var userAction, var signClientMock) = CreateSigningUserAction(
            applicationMetadataToReturn: appMetadata,
            testBpmnfilename: "signing-task-process-empty-datatypes-to-sign.bpmn"
        );
        var instance = new Instance()
        {
            Id = "500000/b194e9f5-02d0-41bc-8461-a0cbac8a6efc",
            InstanceOwner = new() { PartyId = "5000" },
            Process = new() { CurrentTask = new() { ElementId = "Task2" } },
            Data = new()
            {
                new() { Id = "a499c3ef-e88a-436b-8650-1c43e5037ada", DataType = "Model" },
            },
        };
        var userActionContext = new UserActionContext(
            instance,
            1337,
            authentication: TestAuthentication.GetUserAuthentication(1337, applicationMetadata: appMetadata)
        );

        // Act
        await Assert.ThrowsAsync<ApplicationConfigException>(
            async () => await userAction.HandleAction(userActionContext)
        );
        signClientMock.VerifyNoOtherCalls();
    }

    private static (SigningUserAction SigningUserAction, Mock<ISignClient> SignClientMock) CreateSigningUserAction(
        ApplicationMetadata applicationMetadataToReturn,
        PlatformHttpException platformHttpExceptionToThrow = null,
        string testBpmnfilename = "signing-task-process.bpmn"
    )
    {
        IProcessReader processReader = ProcessTestUtils.SetupProcessReader(
            testBpmnfilename,
            Path.Combine("Features", "Action", "TestData")
        );

        var signingClientMock = new Mock<ISignClient>();
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock.Setup(m => m.GetApplicationMetadata()).ReturnsAsync(applicationMetadataToReturn);
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
