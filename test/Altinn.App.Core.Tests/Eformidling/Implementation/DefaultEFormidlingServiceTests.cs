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
        var appSettings = Options.Create(
            new AppSettings { RuntimeCookieName = "AltinnStudioRuntime", EFormidlingSender = "980123456", }
        );
        var platformSettings = Options.Create(new PlatformSettings { SubscriptionKey = "subscription-key" });
        var eFormidlingClient = new Mock<IEFormidlingClient>();
        var tokenGenerator = new Mock<IAccessTokenGenerator>();
        var eFormidlingMetadata = new Mock<IEFormidlingMetadata>();

        const string eFormidlingMetadataFilename = "arkivmelding.xml";
        const string modelDataType = "model";
        const string fileAttachmentsDataType = "file-attachments";
        var instanceGuid = Guid.Parse("41C1099C-7EDD-47F5-AD1F-6267B497796F");
        var instance = new Instance
        {
            Id = $"1337/{instanceGuid}",
            InstanceOwner = new InstanceOwner { PartyId = "1337", },
            Data =
            [
                new DataElement { Id = Guid.NewGuid().ToString(), DataType = modelDataType, },
                new DataElement
                {
                    Id = Guid.NewGuid().ToString(),
                    DataType = fileAttachmentsDataType,
                    Filename = "attachment.txt"
                },
                new DataElement
                {
                    Id = Guid.NewGuid().ToString(),
                    DataType = fileAttachmentsDataType,
                    Filename = "attachment.txt"
                },
                new DataElement
                {
                    Id = Guid.NewGuid().ToString(),
                    DataType = fileAttachmentsDataType,
                    Filename = "no-extension"
                },
                new DataElement
                {
                    Id = Guid.NewGuid().ToString(),
                    DataType = fileAttachmentsDataType,
                    Filename = null
                },
                //Same filename as the eFormidling metadata file.
                new DataElement
                {
                    Id = Guid.NewGuid().ToString(),
                    DataType = fileAttachmentsDataType,
                    Filename = eFormidlingMetadataFilename
                },
                //Same filename as model data type.
                new DataElement
                {
                    Id = Guid.NewGuid().ToString(),
                    DataType = fileAttachmentsDataType,
                    Filename = modelDataType + ".xml"
                }
            ]
        };

        appMetadata
            .Setup(a => a.GetApplicationMetadata())
            .ReturnsAsync(
                new ApplicationMetadata("ttd/test-app")
                {
                    Org = "ttd",
                    DataTypes =
                    [
                        new DataType
                        {
                            Id = modelDataType,
                            AppLogic = new ApplicationLogic { ClassRef = "SomeClass" }
                        },
                        new DataType { Id = fileAttachmentsDataType }
                    ],
                    EFormidling = new EFormidlingContract
                    {
                        Process = "urn:no:difi:profile:arkivmelding:plan:3.0",
                        Standard = "urn:no:difi:arkivmelding:xsd::arkivmelding",
                        TypeVersion = "v8",
                        Type = "arkivmelding",
                        SecurityLevel = 3,
                        DataTypes = [modelDataType, fileAttachmentsDataType]
                    }
                }
            );
        tokenGenerator.Setup(t => t.GenerateAccessToken("ttd", "test-app")).Returns("access-token");
        userTokenProvider.Setup(u => u.GetUserToken()).Returns("authz-token");
        eFormidlingReceivers.Setup(er => er.GetEFormidlingReceivers(instance)).ReturnsAsync(new List<Receiver>());
        eFormidlingMetadata
            .Setup(em => em.GenerateEFormidlingMetadata(instance))
            .ReturnsAsync(() =>
            {
                return (eFormidlingMetadataFilename, Stream.Null);
            });
        dataClient
            .Setup(x =>
                x.GetBinaryData(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<Guid>()
                )
            )
            .ReturnsAsync(Stream.Null);

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
            eFormidlingMetadata.Object
        );

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
        eFormidlingClient.Verify(ec =>
            ec.UploadAttachment(Stream.Null, instanceGuid.ToString(), eFormidlingMetadataFilename, expectedReqHeaders)
        );
        eFormidlingClient.Verify(ec =>
            ec.UploadAttachment(Stream.Null, instanceGuid.ToString(), $"{modelDataType}.xml", expectedReqHeaders)
        );
        eFormidlingClient.Verify(ec =>
            ec.UploadAttachment(Stream.Null, instanceGuid.ToString(), "attachment.txt", expectedReqHeaders)
        );
        eFormidlingClient.Verify(ec =>
            ec.UploadAttachment(Stream.Null, instanceGuid.ToString(), "attachment-1.txt", expectedReqHeaders)
        );
        eFormidlingClient.Verify(ec =>
            ec.UploadAttachment(Stream.Null, instanceGuid.ToString(), "no-extension", expectedReqHeaders)
        );
        eFormidlingClient.Verify(ec =>
            ec.UploadAttachment(Stream.Null, instanceGuid.ToString(), fileAttachmentsDataType, expectedReqHeaders)
        );
        eFormidlingClient.Verify(ec =>
            ec.UploadAttachment(
                Stream.Null,
                instanceGuid.ToString(),
                $"{Path.GetFileNameWithoutExtension(eFormidlingMetadataFilename)}-1.xml",
                expectedReqHeaders
            )
        );
        eFormidlingClient.Verify(ec =>
            ec.UploadAttachment(
                Stream.Null,
                instanceGuid.ToString(),
                $"{fileAttachmentsDataType}-{modelDataType}.xml",
                expectedReqHeaders
            )
        );

        eFormidlingClient.Verify(ec => ec.SendMessage(instanceGuid.ToString(), expectedReqHeaders));
        eventClient.Verify(e => e.AddEvent(EformidlingConstants.CheckInstanceStatusEventType, instance));

        eFormidlingClient.VerifyNoOtherCalls();
        eventClient.VerifyNoOtherCalls();
        tokenGenerator.VerifyNoOtherCalls();
        userTokenProvider.VerifyNoOtherCalls();
        eFormidlingReceivers.VerifyNoOtherCalls();
        appMetadata.VerifyNoOtherCalls();

        result.IsCompletedSuccessfully.Should().BeTrue();
    }

    [Theory]
    // Filename does not have a prefix for any data type, but collides with previous test-1.txt file, so it skips
    [InlineData("test.txt", "a", false, "test.txt", "test-2.txt")]
    // App logic data types, always gets the {dataType}.xml name (and skips existing indexes)
    [InlineData("test.txt", "a", true, "a.xml", "a-2.xml")]
    // Filename gets "{dataType}-" prefix if the given name is a prefix of another type
    [InlineData("abc.txt", "a", false, "a-abc.txt", "a-abc-1.txt")]
    // Filename does not get "{dataType}-" prefix if the given name is a prefix of only the same type
    [InlineData("abc.txt", "ab", false, "ab-abc.txt", "ab-abc-1.txt")]
    // Filename is null without applogic, so just use the dataType, and add suffix for uniqueness
    [InlineData(null, "ab", false, "ab", "ab-1")]
    // Filename is null, but with app logic, so use {dataType}.xml
    [InlineData(null, "ab", true, "ab.xml", "ab-1.xml")]
    // Filename prefixes dataType c, so it gets the {dataType}- prefix
    [InlineData("car.txt", "a", false, "a-car.txt", "a-car-1.txt")]
    // Filename prefixes dataType c, but is the same as the dataType, so it doesn't get {dataType}- prefix
    [InlineData("car.txt", "c", false, "car.txt", "car-1.txt")]
    public void UniqueFileName(
        string? fileName,
        string dataTypeId,
        bool hasAppLogic,
        string expected1,
        string expected2
    )
    {
        var dataTypeIds = new List<string> { "a", "ab", "c" };
        var usedFileNames = new HashSet<string> { "test-1.txt", "a-1.xml" };

        var uniqueFileName = DefaultEFormidlingService.GetUniqueFileName(
            fileName,
            dataTypeId,
            hasAppLogic,
            dataTypeIds,
            usedFileNames
        );
        usedFileNames.Add(uniqueFileName);

        uniqueFileName.Should().Be(expected1);

        uniqueFileName = DefaultEFormidlingService.GetUniqueFileName(
            fileName,
            dataTypeId,
            hasAppLogic,
            dataTypeIds,
            usedFileNames
        );
        usedFileNames.Add(uniqueFileName);

        uniqueFileName.Should().Be(expected2);
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
        var appSettings = Options.Create(
            new AppSettings { RuntimeCookieName = "AltinnStudioRuntime", EFormidlingSender = "980123456", }
        );
        var platformSettings = Options.Create(new PlatformSettings { SubscriptionKey = "subscription-key", });
        var eFormidlingClient = new Mock<IEFormidlingClient>();
        var tokenGenerator = new Mock<IAccessTokenGenerator>();
        var eFormidlingMetadata = new Mock<IEFormidlingMetadata>();
        var instanceGuid = Guid.Parse("41C1099C-7EDD-47F5-AD1F-6267B497796F");
        var instance = new Instance
        {
            Id = $"1337/{instanceGuid}",
            InstanceOwner = new InstanceOwner { PartyId = "1337", },
            Data = new List<DataElement>()
        };

        appMetadata
            .Setup(a => a.GetApplicationMetadata())
            .ReturnsAsync(
                new ApplicationMetadata("ttd/test-app")
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
                    },
                    DataTypes = []
                }
            );
        tokenGenerator.Setup(t => t.GenerateAccessToken("ttd", "test-app")).Returns("access-token");
        userTokenProvider.Setup(u => u.GetUserToken()).Returns("authz-token");
        eFormidlingReceivers.Setup(er => er.GetEFormidlingReceivers(instance)).ReturnsAsync(new List<Receiver>());
        eFormidlingMetadata
            .Setup(em => em.GenerateEFormidlingMetadata(instance))
            .ReturnsAsync(() =>
            {
                return ("arkivmelding.xml", Stream.Null);
            });
        eFormidlingClient
            .Setup(ec => ec.SendMessage(It.IsAny<string>(), It.IsAny<Dictionary<string, string>>()))
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
            eFormidlingMetadata.Object
        );

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
        eFormidlingClient.Verify(ec =>
            ec.UploadAttachment(Stream.Null, instanceGuid.ToString(), "arkivmelding.xml", expectedReqHeaders)
        );
        eFormidlingClient.Verify(ec => ec.SendMessage(instanceGuid.ToString(), expectedReqHeaders));

        eFormidlingClient.VerifyNoOtherCalls();
        eventClient.VerifyNoOtherCalls();
        tokenGenerator.VerifyNoOtherCalls();
        userTokenProvider.VerifyNoOtherCalls();
        eFormidlingReceivers.VerifyNoOtherCalls();
        appMetadata.VerifyNoOtherCalls();

        result.IsCompletedSuccessfully.Should().BeFalse();
    }
}
