using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Action;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Sign;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Core.Tests.Internal.Process.TestUtils;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;
using Signee = Altinn.App.Core.Internal.Sign.Signee;

namespace Altinn.App.Core.Tests.Features.Action;

public class SigningUserActionTests
{
    [Fact]
    public async void HandleAction_returns_ok_if_user_is_valid()
    {
        // Arrange
        UserProfile userProfile = new UserProfile()
        {
            UserId = 1337,
            Party = new Party() { SSN = "12345678901" }
        };
        (var userAction, var signClientMock)= CreateSigningUserAction(userProfile);
        var instance = new Instance()
        {
            Id = "500000/b194e9f5-02d0-41bc-8461-a0cbac8a6efc",
            InstanceOwner = new()
            {
                PartyId = "5000",
            },
            Process = new()
            {
                CurrentTask = new()
                {
                    ElementId = "Task2"
                }
            },
            Data = new()
            {
                new()
                {
                    Id = "a499c3ef-e88a-436b-8650-1c43e5037ada",
                    DataType = "Model"
                }
            }
        };
        var userActionContext = new UserActionContext(instance, 1337);

        // Act
        var result = await userAction.HandleAction(userActionContext);

        // Assert
        SignatureContext expected = new SignatureContext(new InstanceIdentifier(instance), "signature", new Signee() { UserId = "1337", PersonNumber = "12345678901" }, new DataElementSignature("a499c3ef-e88a-436b-8650-1c43e5037ada"));
        signClientMock.Verify(s => s.SignDataElements(It.Is<SignatureContext>(sc => AssertSigningContextAsExpected(sc, expected))), Times.Once);
        result.Should().BeTrue();
    }
    
    private (SigningUserAction SigningUserAction, Mock<ISignClient> SignClientMock) CreateSigningUserAction(UserProfile userProfileToReturn = null, PlatformHttpException platformHttpExceptionToThrow = null)
    {
        IProcessReader processReader = ProcessTestUtils.SetupProcessReader("signing-task-process.bpmn", Path.Combine("Features", "Action", "TestData"));
        AppSettings appSettings = new AppSettings()
        {
            AppBasePath = Path.Combine("Features", "Action"),
            ConfigurationFolder = "TestData",
            ApplicationMetadataFileName = "appmetadata.json"
        };
        
        IAppMetadata appMetadata = new AppMetadata(Options.Create<AppSettings>(appSettings), new FrontendFeatures());
        var profileClientMock = new Mock<IProfileClient>();
        var signingClientMock = new Mock<ISignClient>();
        profileClientMock.Setup(p => p.GetUserProfile(It.IsAny<int>())).ReturnsAsync(userProfileToReturn);
        if (platformHttpExceptionToThrow != null)
        {
            signingClientMock.Setup(p => p.SignDataElements(It.IsAny<SignatureContext>())).ThrowsAsync(platformHttpExceptionToThrow);
        }
        
        return (new SigningUserAction(processReader, new NullLogger<SigningUserAction>(), appMetadata, profileClientMock.Object, signingClientMock.Object), signingClientMock);
    }

    private bool AssertSigningContextAsExpected(SignatureContext s1, SignatureContext s2)
    {
        s1.Should().BeEquivalentTo(s2);
        return true;
    }
}