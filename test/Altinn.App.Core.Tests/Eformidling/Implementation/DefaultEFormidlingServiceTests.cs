using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.EFormidling;
using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Core.Models;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Common.EFormidlingClient;
using Altinn.Common.EFormidlingClient.Models.SBD;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Eformidling.Implementation;

public class DefaultEFormidlingServiceTests
{
    [Fact]
    public void SendEFormidlingShipment()
    {
        // Arrange
        var logger = new NullLogger<DefaultEFormidlingService>();
        var userTokenProvider = new Mock<IUserTokenProvider>();
        var appMetadata = new Mock<IAppMetadata>();
        var dataClient = new Mock<IDataClient>();
        var eFormidlingReceivers = new Mock<IEFormidlingReceivers>();
        var eventClient = new Mock<IEventsClient>();
        var appSettings = Options.Create(new AppSettings
        {
            RuntimeCookieName = "AltinnStudioRuntime",
            EFormidlingSender = "980123456",
        });
        var platformSettings = Options.Create(new PlatformSettings
        {
            SubscriptionKey = "subscription-key"
        });
        var eFormidlingClient = new Mock<IEFormidlingClient>();
        var tokenGenerator = new Mock<IAccessTokenGenerator>();
        var eFormidlingMetadata = new Mock<IEFormidlingMetadata>();
        var instance = new Instance
        {
            Id = "1337/41C1099C-7EDD-47F5-AD1F-6267B497796F",
            InstanceOwner = new InstanceOwner
            {
                PartyId = "1337",
            },
            Data = new List<DataElement>()
        };

        appMetadata.Setup(a => a.GetApplicationMetadata()).ReturnsAsync(new ApplicationMetadata("ttd/test-app")
        {
            Org = "ttd",
            EFormidling = new EFormidlingContract
            {
                Process = "urn:no:difi:profile:arkivmelding:plan:3.0",
                Standard = "urn:no:difi:arkivmelding:xsd::arkivmelding",
                TypeVersion = "v8",
                Type = "arkivmelding",
                SecurityLevel = 3,
                DataTypes = new List<string>()
            }
        });
        tokenGenerator.Setup(t => t.GenerateAccessToken("ttd", "test-app")).Returns("access-token");
        userTokenProvider.Setup(u => u.GetUserToken()).Returns("authz-token");
        eFormidlingReceivers.Setup(er => er.GetEFormidlingReceivers(instance)).ReturnsAsync(new List<Receiver>());
        eFormidlingMetadata.Setup(em => em.GenerateEFormidlingMetadata(instance)).ReturnsAsync(() =>
        {
            return ("fakefilename.txt", Stream.Null); 
        });
        
        var defaultEformidlingService = new DefaultEFormidlingService(
            logger,
            userTokenProvider.Object,
            appMetadata.Object,
            dataClient.Object,
            eFormidlingReceivers.Object,
            eventClient.Object,
            appSettings,
            platformSettings,
            eFormidlingClient.Object,
            tokenGenerator.Object,
            eFormidlingMetadata.Object);

        // Act
        var result = defaultEformidlingService.SendEFormidlingShipment(instance);

        // Assert
        var expectedReqHeaders = new Dictionary<string, string>
        {
            { "Authorization", $"Bearer authz-token" },
            { General.EFormidlingAccessTokenHeaderName, "access-token" },
            { General.SubscriptionKeyHeaderName, "subscription-key" }
        };
        
        appMetadata.Verify(a => a.GetApplicationMetadata());
        tokenGenerator.Verify(t => t.GenerateAccessToken("ttd", "test-app"));
        userTokenProvider.Verify(u => u.GetUserToken());
        eFormidlingReceivers.Verify(er => er.GetEFormidlingReceivers(instance));
        eFormidlingMetadata.Verify(em => em.GenerateEFormidlingMetadata(instance));
        eFormidlingClient.Verify(ec => ec.CreateMessage(It.IsAny<StandardBusinessDocument>(), expectedReqHeaders));
        eFormidlingClient.Verify(ec => ec.UploadAttachment(Stream.Null, "41C1099C-7EDD-47F5-AD1F-6267B497796F", "fakefilename.txt", expectedReqHeaders));
        eFormidlingClient.Verify(ec => ec.SendMessage("41C1099C-7EDD-47F5-AD1F-6267B497796F", expectedReqHeaders));
        eventClient.Verify(e => e.AddEvent(EformidlingConstants.CheckInstanceStatusEventType, instance));
        
        eFormidlingClient.VerifyNoOtherCalls();
        eventClient.VerifyNoOtherCalls();
        tokenGenerator.VerifyNoOtherCalls();
        userTokenProvider.VerifyNoOtherCalls();
        eFormidlingReceivers.VerifyNoOtherCalls();
        appMetadata.VerifyNoOtherCalls();
        
        result.IsCompletedSuccessfully.Should().BeTrue();
    }
    
    [Fact]
    public void SendEFormidlingShipment_throws_exception_if_send_fails()
    {
        // Arrange
        var logger = new NullLogger<DefaultEFormidlingService>();
        var userTokenProvider = new Mock<IUserTokenProvider>();
        var appMetadata = new Mock<IAppMetadata>();
        var dataClient = new Mock<IDataClient>();
        var eFormidlingReceivers = new Mock<IEFormidlingReceivers>();
        var eventClient = new Mock<IEventsClient>();
        var appSettings = Options.Create(new AppSettings
        {
            RuntimeCookieName = "AltinnStudioRuntime",
            EFormidlingSender = "980123456",
        });
        var platformSettings = Options.Create(new PlatformSettings
        {
            SubscriptionKey = "subscription-key",
        });
        var eFormidlingClient = new Mock<IEFormidlingClient>();
        var tokenGenerator = new Mock<IAccessTokenGenerator>();
        var eFormidlingMetadata = new Mock<IEFormidlingMetadata>();
        var instance = new Instance
        {
            Id = "1337/41C1099C-7EDD-47F5-AD1F-6267B497796F",
            InstanceOwner = new InstanceOwner
            {
                PartyId = "1337",
            },
            Data = new List<DataElement>()
        };

        appMetadata.Setup(a => a.GetApplicationMetadata()).ReturnsAsync(new ApplicationMetadata("ttd/test-app")
        {
            Org = "ttd",
            EFormidling = new EFormidlingContract
            {
                Process = "urn:no:difi:profile:arkivmelding:plan:3.0",
                Standard = "urn:no:difi:arkivmelding:xsd::arkivmelding",
                TypeVersion = "v8",
                Type = "arkivmelding",
                SecurityLevel = 3,
                DataTypes = new List<string>()
            }
        });
        tokenGenerator.Setup(t => t.GenerateAccessToken("ttd", "test-app")).Returns("access-token");
        userTokenProvider.Setup(u => u.GetUserToken()).Returns("authz-token");
        eFormidlingReceivers.Setup(er => er.GetEFormidlingReceivers(instance)).ReturnsAsync(new List<Receiver>());
        eFormidlingMetadata.Setup(em => em.GenerateEFormidlingMetadata(instance)).ReturnsAsync(() =>
        {
            return ("fakefilename.txt", Stream.Null); 
        });
        eFormidlingClient.Setup(ec => ec.SendMessage(It.IsAny<string>(), It.IsAny<Dictionary<string, string>>()))
            .ThrowsAsync(new Exception("XUnit expected exception"));
        
        var defaultEformidlingService = new DefaultEFormidlingService(
            logger,
            userTokenProvider.Object,
            appMetadata.Object,
            dataClient.Object,
            eFormidlingReceivers.Object,
            eventClient.Object,
            appSettings,
            platformSettings,
            eFormidlingClient.Object,
            tokenGenerator.Object,
            eFormidlingMetadata.Object);

        // Act
        var result = defaultEformidlingService.SendEFormidlingShipment(instance);

        // Assert
        // Assert
        var expectedReqHeaders = new Dictionary<string, string>
        {
            { "Authorization", $"Bearer authz-token" },
            { General.EFormidlingAccessTokenHeaderName, "access-token" },
            { General.SubscriptionKeyHeaderName, "subscription-key" }
        };
        
        appMetadata.Verify(a => a.GetApplicationMetadata());
        tokenGenerator.Verify(t => t.GenerateAccessToken("ttd", "test-app"));
        userTokenProvider.Verify(u => u.GetUserToken());
        eFormidlingReceivers.Verify(er => er.GetEFormidlingReceivers(instance));
        eFormidlingMetadata.Verify(em => em.GenerateEFormidlingMetadata(instance));
        eFormidlingClient.Verify(ec => ec.CreateMessage(It.IsAny<StandardBusinessDocument>(), expectedReqHeaders));
        eFormidlingClient.Verify(ec => ec.UploadAttachment(Stream.Null, "41C1099C-7EDD-47F5-AD1F-6267B497796F", "fakefilename.txt", expectedReqHeaders));
        eFormidlingClient.Verify(ec => ec.SendMessage("41C1099C-7EDD-47F5-AD1F-6267B497796F", expectedReqHeaders));
        
        eFormidlingClient.VerifyNoOtherCalls();
        eventClient.VerifyNoOtherCalls();
        tokenGenerator.VerifyNoOtherCalls();
        userTokenProvider.VerifyNoOtherCalls();
        eFormidlingReceivers.VerifyNoOtherCalls();
        appMetadata.VerifyNoOtherCalls();
        
        result.IsCompletedSuccessfully.Should().BeFalse();
    }
}