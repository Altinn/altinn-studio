using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.EFormidling;
using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Features;
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
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Eformidling.Implementation;

public class DefaultEFormidlingServiceTests
{
    private const string EFormidlingMetadataFilename = "arkivmelding.xml";
    private const string ModelDataType = "model";
    private const string FileAttachmentsDataType = "file-attachments";

    private readonly record struct Fixture(IServiceProvider ServiceProvider, Instance Instance, Guid InstanceGuid)
        : IAsyncDisposable
    {
        public Mock<T> Mock<T>()
            where T : class => Moq.Mock.Get(ServiceProvider.GetRequiredService<T>());

        public ValueTask DisposeAsync()
        {
            switch (ServiceProvider)
            {
                case IAsyncDisposable disposable:
                    return disposable.DisposeAsync();
                case IDisposable disposable:
                    disposable.Dispose();
                    break;
            }
            return default;
        }
    }

    private Fixture CreateFixture(
        ServiceCollection? services = null,
        IReadOnlyList<DataElement>? data = null,
        Action<Mock<IEFormidlingClient>>? setupEFormidlingClient = null
    )
    {
        services ??= new ServiceCollection();
        services.AddAppImplementationFactory();
        services.AddLogging(logging => logging.AddProvider(NullLoggerProvider.Instance));

        var userTokenProvider = new Mock<IUserTokenProvider>();
        var appMetadata = new Mock<IAppMetadata>();
        var dataClient = new Mock<IDataClient>();
        var eFormidlingMetadata = new Mock<IEFormidlingMetadata>();
        var eFormidlingReceivers = new Mock<IEFormidlingReceivers>();
        var eventClient = new Mock<IEventsClient>();
        var appSettings = Options.Create(
            new AppSettings { RuntimeCookieName = "AltinnStudioRuntime", EFormidlingSender = "980123456" }
        );
        var platformSettings = Options.Create(new PlatformSettings { SubscriptionKey = "subscription-key" });
        var eFormidlingClient = new Mock<IEFormidlingClient>();
        var tokenGenerator = new Mock<IAccessTokenGenerator>();

        var instanceGuid = Guid.Parse("41C1099C-7EDD-47F5-AD1F-6267B497796F");
        var instance = new Instance
        {
            Id = $"1337/{instanceGuid}",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Data =
                data?.ToList()
                ??
                [
                    new DataElement { Id = Guid.NewGuid().ToString(), DataType = ModelDataType },
                    new DataElement
                    {
                        Id = Guid.NewGuid().ToString(),
                        DataType = FileAttachmentsDataType,
                        Filename = "attachment.txt",
                    },
                    new DataElement
                    {
                        Id = Guid.NewGuid().ToString(),
                        DataType = FileAttachmentsDataType,
                        Filename = "attachment.txt",
                    },
                    new DataElement
                    {
                        Id = Guid.NewGuid().ToString(),
                        DataType = FileAttachmentsDataType,
                        Filename = "no-extension",
                    },
                    new DataElement
                    {
                        Id = Guid.NewGuid().ToString(),
                        DataType = FileAttachmentsDataType,
                        Filename = null,
                    },
                    //Same filename as the eFormidling metadata file.
                    new DataElement
                    {
                        Id = Guid.NewGuid().ToString(),
                        DataType = FileAttachmentsDataType,
                        Filename = EFormidlingMetadataFilename,
                    },
                    //Same filename as model data type.
                    new DataElement
                    {
                        Id = Guid.NewGuid().ToString(),
                        DataType = FileAttachmentsDataType,
                        Filename = ModelDataType + ".xml",
                    },
                ],
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
                            Id = ModelDataType,
                            AppLogic = new ApplicationLogic { ClassRef = "SomeClass" },
                        },
                        new DataType { Id = FileAttachmentsDataType },
                    ],
                    EFormidling = new EFormidlingContract
                    {
                        Process = "urn:no:difi:profile:arkivmelding:plan:3.0",
                        Standard = "urn:no:difi:arkivmelding:xsd::arkivmelding",
                        TypeVersion = "v8",
                        Type = "arkivmelding",
                        SecurityLevel = 3,
                        DataTypes = [ModelDataType, FileAttachmentsDataType],
                    },
                }
            );
        tokenGenerator.Setup(t => t.GenerateAccessToken("ttd", "test-app")).Returns("access-token");
        userTokenProvider.Setup(u => u.GetUserToken()).Returns("authz-token");
        eFormidlingReceivers.Setup(er => er.GetEFormidlingReceivers(instance)).ReturnsAsync(new List<Receiver>());
        eFormidlingMetadata
            .Setup(em => em.GenerateEFormidlingMetadata(instance))
            .ReturnsAsync(() =>
            {
                return (EFormidlingMetadataFilename, Stream.Null);
            });
        dataClient
            .Setup(x =>
                x.GetBinaryData(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(Stream.Null);

        setupEFormidlingClient?.Invoke(eFormidlingClient);

        services.TryAddTransient(_ => userTokenProvider.Object);
        services.TryAddTransient(_ => appMetadata.Object);
        services.TryAddTransient(_ => dataClient.Object);
        services.TryAddTransient(_ => eFormidlingReceivers.Object);
        services.TryAddTransient(_ => eventClient.Object);
        services.TryAddTransient(_ => appSettings);
        services.TryAddTransient(_ => platformSettings);
        services.TryAddTransient(_ => eFormidlingClient.Object);
        services.TryAddTransient(_ => tokenGenerator.Object);
        services.TryAddTransient(_ => eFormidlingMetadata.Object);

        services.TryAddTransient<IEFormidlingService, DefaultEFormidlingService>();

        var serviceProvider = services.BuildStrictServiceProvider();
        return new(serviceProvider, instance, instanceGuid);
    }

    [Fact]
    public async Task SendEFormidlingShipment()
    {
        // Arrange
        await using var fixture = CreateFixture();
        var (sp, instance, instanceGuid) = fixture;
        var defaultEformidlingService = sp.GetRequiredService<IEFormidlingService>();

        // Act
        var result = defaultEformidlingService.SendEFormidlingShipment(instance);

        // Assert
        var expectedReqHeaders = new Dictionary<string, string>
        {
            { "Authorization", $"Bearer authz-token" },
            { General.EFormidlingAccessTokenHeaderName, "access-token" },
            { General.SubscriptionKeyHeaderName, "subscription-key" },
        };

        fixture.Mock<IAppMetadata>().Verify(a => a.GetApplicationMetadata());
        fixture.Mock<IAccessTokenGenerator>().Verify(t => t.GenerateAccessToken("ttd", "test-app"));
        fixture.Mock<IUserTokenProvider>().Verify(u => u.GetUserToken());
        fixture.Mock<IEFormidlingReceivers>().Verify(er => er.GetEFormidlingReceivers(instance));
        fixture.Mock<IEFormidlingMetadata>().Verify(em => em.GenerateEFormidlingMetadata(instance));
        var eFormidlingClient = fixture.Mock<IEFormidlingClient>();
        eFormidlingClient.Verify(ec => ec.CreateMessage(It.IsAny<StandardBusinessDocument>(), expectedReqHeaders));
        eFormidlingClient.Verify(ec =>
            ec.UploadAttachment(Stream.Null, instanceGuid.ToString(), EFormidlingMetadataFilename, expectedReqHeaders)
        );
        eFormidlingClient.Verify(ec =>
            ec.UploadAttachment(Stream.Null, instanceGuid.ToString(), $"{ModelDataType}.xml", expectedReqHeaders)
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
            ec.UploadAttachment(Stream.Null, instanceGuid.ToString(), FileAttachmentsDataType, expectedReqHeaders)
        );
        eFormidlingClient.Verify(ec =>
            ec.UploadAttachment(
                Stream.Null,
                instanceGuid.ToString(),
                $"{Path.GetFileNameWithoutExtension(EFormidlingMetadataFilename)}-1.xml",
                expectedReqHeaders
            )
        );
        eFormidlingClient.Verify(ec =>
            ec.UploadAttachment(
                Stream.Null,
                instanceGuid.ToString(),
                $"{FileAttachmentsDataType}-{ModelDataType}.xml",
                expectedReqHeaders
            )
        );

        eFormidlingClient.Verify(ec => ec.SendMessage(instanceGuid.ToString(), expectedReqHeaders));
        fixture
            .Mock<IEventsClient>()
            .Verify(e => e.AddEvent(EformidlingConstants.CheckInstanceStatusEventType, instance));

        eFormidlingClient.VerifyNoOtherCalls();
        fixture.Mock<IEventsClient>().VerifyNoOtherCalls();
        fixture.Mock<IAccessTokenGenerator>().VerifyNoOtherCalls();
        fixture.Mock<IUserTokenProvider>().VerifyNoOtherCalls();
        fixture.Mock<IEFormidlingReceivers>().VerifyNoOtherCalls();
        fixture.Mock<IAppMetadata>().VerifyNoOtherCalls();

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
    public async Task SendEFormidlingShipment_throws_exception_if_send_fails()
    {
        // Arrange
        await using var fixture = CreateFixture(
            data: [],
            setupEFormidlingClient: static eFormidlingClient =>
            {
                eFormidlingClient
                    .Setup(ec => ec.SendMessage(It.IsAny<string>(), It.IsAny<Dictionary<string, string>>()))
                    .ThrowsAsync(new Exception("XUnit expected exception"));
            }
        );
        var (sp, instance, instanceGuid) = fixture;
        var defaultEformidlingService = sp.GetRequiredService<IEFormidlingService>();

        // Act
        var result = defaultEformidlingService.SendEFormidlingShipment(instance);

        // Assert
        var expectedReqHeaders = new Dictionary<string, string>
        {
            { "Authorization", $"Bearer authz-token" },
            { General.EFormidlingAccessTokenHeaderName, "access-token" },
            { General.SubscriptionKeyHeaderName, "subscription-key" },
        };

        fixture.Mock<IAppMetadata>().Verify(a => a.GetApplicationMetadata());
        fixture.Mock<IAccessTokenGenerator>().Verify(t => t.GenerateAccessToken("ttd", "test-app"));
        fixture.Mock<IUserTokenProvider>().Verify(u => u.GetUserToken());
        fixture.Mock<IEFormidlingReceivers>().Verify(er => er.GetEFormidlingReceivers(instance));
        fixture.Mock<IEFormidlingMetadata>().Verify(em => em.GenerateEFormidlingMetadata(instance));
        var eFormidlingClient = fixture.Mock<IEFormidlingClient>();
        eFormidlingClient.Verify(ec => ec.CreateMessage(It.IsAny<StandardBusinessDocument>(), expectedReqHeaders));
        eFormidlingClient.Verify(ec =>
            ec.UploadAttachment(Stream.Null, instanceGuid.ToString(), EFormidlingMetadataFilename, expectedReqHeaders)
        );
        eFormidlingClient.Verify(ec => ec.SendMessage(instanceGuid.ToString(), expectedReqHeaders));

        eFormidlingClient.VerifyNoOtherCalls();
        fixture.Mock<IEventsClient>().VerifyNoOtherCalls();
        fixture.Mock<IAccessTokenGenerator>().VerifyNoOtherCalls();
        fixture.Mock<IUserTokenProvider>().VerifyNoOtherCalls();
        fixture.Mock<IEFormidlingReceivers>().VerifyNoOtherCalls();
        fixture.Mock<IAppMetadata>().VerifyNoOtherCalls();

        result.IsCompletedSuccessfully.Should().BeFalse();
    }

    [Theory]
    [InlineData(ServiceLifetime.Transient, ServiceLifetime.Transient)]
    [InlineData(ServiceLifetime.Transient, ServiceLifetime.Scoped)]
    [InlineData(ServiceLifetime.Transient, ServiceLifetime.Singleton)]
    [InlineData(ServiceLifetime.Scoped, ServiceLifetime.Transient)]
    [InlineData(ServiceLifetime.Scoped, ServiceLifetime.Scoped)]
    [InlineData(ServiceLifetime.Scoped, ServiceLifetime.Singleton)]
    [InlineData(ServiceLifetime.Singleton, ServiceLifetime.Transient)]
    [InlineData(ServiceLifetime.Singleton, ServiceLifetime.Scoped)]
    [InlineData(ServiceLifetime.Singleton, ServiceLifetime.Singleton)]
    public async Task Test_App_Dependency_Lifetimes(ServiceLifetime implLifetime, ServiceLifetime serviceLifetime)
    {
        // Arrange
        var services = new ServiceCollection
        {
            new ServiceDescriptor(
                typeof(IEFormidlingMetadata),
                _ => new Mock<IEFormidlingMetadata>().Object,
                implLifetime
            ),
            new ServiceDescriptor(
                typeof(IEFormidlingReceivers),
                _ => new Mock<IEFormidlingReceivers>().Object,
                implLifetime
            ),
            new ServiceDescriptor(typeof(IEFormidlingService), typeof(DefaultEFormidlingService), serviceLifetime),
        };

        // Act
        await using var fixture = CreateFixture(services);
        await using var scope = fixture.ServiceProvider.CreateAsyncScope();

        // Assert
        var svc = scope.ServiceProvider.GetService<IEFormidlingService>();
        svc.Should().NotBeNull();
    }
}
