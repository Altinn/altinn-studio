using System.Net;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.EFormidling;
using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.EFormidling.Models;
using Altinn.App.Core.EFormidling.Models.SBD;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
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

    private static readonly ValidAltinnEFormidlingConfiguration TestConfiguration = new(
        true,
        null,
        "urn:no:difi:profile:arkivmelding:plan:3.0",
        "urn:no:difi:arkivmelding:xsd::arkivmelding",
        "v8",
        "arkivmelding",
        3,
        null,
        [ModelDataType, FileAttachmentsDataType]
    );

    private readonly record struct Fixture(
        IServiceProvider ServiceProvider,
        Instance Instance,
        Guid InstanceGuid,
        Mock<IInstanceDataAccessor> DataAccessor
    ) : IAsyncDisposable
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

        var userTokenProvider = new Mock<IUserTokenProvider>(MockBehavior.Strict);
        var appMetadata = new Mock<IAppMetadata>(MockBehavior.Strict);
        var eFormidlingMetadata = new Mock<IEFormidlingMetadata>(MockBehavior.Strict);
        var eFormidlingReceivers = new Mock<IEFormidlingReceivers>(MockBehavior.Strict);
        var appSettings = Options.Create(
            new AppSettings { RuntimeCookieName = "AltinnStudioRuntime", EFormidlingSender = "980123456" }
        );
        var platformSettings = Options.Create(new PlatformSettings { SubscriptionKey = "subscription-key" });
        var eFormidlingClient = new Mock<IEFormidlingClient>();
        var tokenGenerator = new Mock<IAccessTokenGenerator>(MockBehavior.Strict);
        var processReader = new Mock<IProcessReader>(MockBehavior.Strict);
        var hostEnvironment = new Mock<IHostEnvironment>(MockBehavior.Strict);

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

        var dataAccessor = new Mock<IInstanceDataAccessor>(MockBehavior.Strict);
        dataAccessor.Setup(a => a.Instance).Returns(instance);
        dataAccessor
            .Setup(a => a.GetBinaryData(It.IsAny<DataElementIdentifier>()))
            .ReturnsAsync(ReadOnlyMemory<byte>.Empty);

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
                }
            );
        tokenGenerator.Setup(t => t.GenerateAccessToken("ttd", "test-app")).Returns("access-token");
        userTokenProvider.Setup(u => u.GetUserToken()).Returns("authz-token");
        eFormidlingReceivers
            .Setup(er => er.GetEFormidlingReceivers(dataAccessor.Object, It.IsAny<string?>()))
            .ReturnsAsync(new List<Receiver>());
        eFormidlingMetadata
            .Setup(em => em.GenerateEFormidlingMetadata(dataAccessor.Object))
            .ReturnsAsync(() =>
            {
                return (EFormidlingMetadataFilename, Stream.Null);
            });

        setupEFormidlingClient?.Invoke(eFormidlingClient);

        services.TryAddTransient(_ => userTokenProvider.Object);
        services.TryAddTransient(_ => appMetadata.Object);
        services.TryAddTransient(_ => eFormidlingReceivers.Object);
        services.TryAddTransient(_ => eFormidlingMetadata.Object);
        services.TryAddTransient(_ => appSettings);
        services.TryAddTransient(_ => platformSettings);
        services.TryAddTransient(_ => eFormidlingClient.Object);
        services.TryAddTransient(_ => tokenGenerator.Object);
        services.TryAddTransient(_ => processReader.Object);
        services.TryAddTransient(_ => hostEnvironment.Object);
        services.TryAddTransient<IEFormidlingService, DefaultEFormidlingService>();

        var serviceProvider = services.BuildStrictServiceProvider();
        return new(serviceProvider, instance, instanceGuid, dataAccessor);
    }

    [Fact]
    public async Task SendEFormidlingShipment()
    {
        // Arrange
        await using var fixture = CreateFixture();
        var (sp, instance, instanceGuid, dataAccessor) = fixture;
        var defaultEformidlingService = sp.GetRequiredService<IEFormidlingService>();

        // Act
        var result = defaultEformidlingService.SendEFormidlingShipment(dataAccessor.Object, TestConfiguration);

        // Assert
        fixture.Mock<IAppMetadata>().Verify(a => a.GetApplicationMetadata());
        fixture
            .Mock<IEFormidlingReceivers>()
            .Verify(er => er.GetEFormidlingReceivers(dataAccessor.Object, It.IsAny<string?>()));
        fixture.Mock<IEFormidlingMetadata>().Verify(em => em.GenerateEFormidlingMetadata(dataAccessor.Object));
        dataAccessor.Verify(
            a => a.GetBinaryData(It.IsAny<DataElementIdentifier>()),
            Times.Exactly(instance.Data.Count)
        );
        var eFormidlingClient = fixture.Mock<IEFormidlingClient>();
        eFormidlingClient.Verify(ec =>
            ec.CreateMessage(It.IsAny<StandardBusinessDocument>(), It.IsAny<CancellationToken>())
        );
        eFormidlingClient.Verify(ec =>
            ec.UploadAttachment(
                Stream.Null,
                instanceGuid.ToString(),
                EFormidlingMetadataFilename,
                It.IsAny<CancellationToken>()
            )
        );
        eFormidlingClient.Verify(ec =>
            ec.UploadAttachment(
                It.IsAny<Stream>(),
                instanceGuid.ToString(),
                $"{ModelDataType}.xml",
                It.IsAny<CancellationToken>()
            )
        );
        eFormidlingClient.Verify(ec =>
            ec.UploadAttachment(
                It.IsAny<Stream>(),
                instanceGuid.ToString(),
                "attachment.txt",
                It.IsAny<CancellationToken>()
            )
        );
        eFormidlingClient.Verify(ec =>
            ec.UploadAttachment(
                It.IsAny<Stream>(),
                instanceGuid.ToString(),
                "attachment-1.txt",
                It.IsAny<CancellationToken>()
            )
        );
        eFormidlingClient.Verify(ec =>
            ec.UploadAttachment(
                It.IsAny<Stream>(),
                instanceGuid.ToString(),
                "no-extension",
                It.IsAny<CancellationToken>()
            )
        );
        eFormidlingClient.Verify(ec =>
            ec.UploadAttachment(
                It.IsAny<Stream>(),
                instanceGuid.ToString(),
                FileAttachmentsDataType,
                It.IsAny<CancellationToken>()
            )
        );
        eFormidlingClient.Verify(ec =>
            ec.UploadAttachment(
                It.IsAny<Stream>(),
                instanceGuid.ToString(),
                $"{Path.GetFileNameWithoutExtension(EFormidlingMetadataFilename)}-1.xml",
                It.IsAny<CancellationToken>()
            )
        );
        eFormidlingClient.Verify(ec =>
            ec.UploadAttachment(
                It.IsAny<Stream>(),
                instanceGuid.ToString(),
                $"{FileAttachmentsDataType}-{ModelDataType}.xml",
                It.IsAny<CancellationToken>()
            )
        );

        eFormidlingClient.Verify(ec => ec.SendMessage(instanceGuid.ToString(), It.IsAny<CancellationToken>()));

        eFormidlingClient.VerifyNoOtherCalls();
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
                    .Setup(ec => ec.SendMessage(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                    .ThrowsAsync(new Exception("XUnit expected exception"));
            }
        );
        var (sp, _, instanceGuid, dataAccessor) = fixture;
        var defaultEformidlingService = sp.GetRequiredService<IEFormidlingService>();

        // Act
        var result = defaultEformidlingService.SendEFormidlingShipment(dataAccessor.Object, TestConfiguration);

        // Assert
        fixture.Mock<IAppMetadata>().Verify(a => a.GetApplicationMetadata());
        fixture
            .Mock<IEFormidlingReceivers>()
            .Verify(er => er.GetEFormidlingReceivers(dataAccessor.Object, It.IsAny<string?>()));
        fixture.Mock<IEFormidlingMetadata>().Verify(em => em.GenerateEFormidlingMetadata(dataAccessor.Object));
        var eFormidlingClient = fixture.Mock<IEFormidlingClient>();
        eFormidlingClient.Verify(ec =>
            ec.CreateMessage(It.IsAny<StandardBusinessDocument>(), It.IsAny<CancellationToken>())
        );
        eFormidlingClient.Verify(ec =>
            ec.UploadAttachment(
                Stream.Null,
                instanceGuid.ToString(),
                EFormidlingMetadataFilename,
                It.IsAny<CancellationToken>()
            )
        );
        eFormidlingClient.Verify(ec => ec.SendMessage(instanceGuid.ToString(), It.IsAny<CancellationToken>()));

        eFormidlingClient.VerifyNoOtherCalls();
        fixture.Mock<IEFormidlingReceivers>().VerifyNoOtherCalls();
        fixture.Mock<IAppMetadata>().VerifyNoOtherCalls();

        result.IsCompletedSuccessfully.Should().BeFalse();
    }

    private const string DuplicateMessageBody =
        "{\n"
        + "  \"timestamp\" : \"2026-05-28T14:52:16.925861287+02:00\",\n"
        + "  \"exception\" : \"no.difi.meldingsutveksling.exceptions.MessageAlreadyExistsException\",\n"
        + "  \"message\" : \"Message with messageId = e9f0f271-a01e-4457-8a24-3c2079824717 already exists\",\n"
        + "  \"status\" : 400,\n"
        + "  \"error\" : \"Bad Request\",\n"
        + "  \"path\" : \"/api/messages/out\"\n"
        + "}";

    /// <summary>
    /// The shape the client raises for a rejected request: status and captured body, no interpolation
    /// of the body into the message.
    /// </summary>
    private static PlatformHttpException Rejected(string body) =>
        new(new PlatformHttpResponse(HttpStatusCode.BadRequest) { Content = body }, "Bad Request");

    private static void SetupDuplicateCreate(Mock<IEFormidlingClient> eFormidlingClient, params string[] statuses)
    {
        eFormidlingClient
            .Setup(ec => ec.CreateMessage(It.IsAny<StandardBusinessDocument>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(Rejected(DuplicateMessageBody));
        eFormidlingClient
            .Setup(ec => ec.GetMessageStatusById(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                // A status entry without a status value (the frozen client model is pre-NRT, so a
                // missing field deserialises to null) must not break the recovery path.
                new Statuses
                {
                    Content = statuses
                        .Select(status => new Statuses.Entry { Status = status })
                        .Prepend(new Statuses.Entry())
                        .ToList(),
                }
            );
    }

    [Fact]
    public async Task SendEFormidlingShipment_resumes_unsent_message_on_duplicate_create()
    {
        // Arrange
        await using var fixture = CreateFixture(
            data: [],
            setupEFormidlingClient: static c => SetupDuplicateCreate(c, "opprettet")
        );
        var (sp, _, instanceGuid, dataAccessor) = fixture;
        var defaultEformidlingService = sp.GetRequiredService<IEFormidlingService>();

        // Act
        await defaultEformidlingService.SendEFormidlingShipment(dataAccessor.Object, TestConfiguration);

        // Assert - the existing unsent message is completed rather than left stuck
        var eFormidlingClient = fixture.Mock<IEFormidlingClient>();
        eFormidlingClient.Verify(ec =>
            ec.UploadAttachment(
                Stream.Null,
                instanceGuid.ToString(),
                EFormidlingMetadataFilename,
                It.IsAny<CancellationToken>()
            )
        );
        eFormidlingClient.Verify(ec => ec.SendMessage(instanceGuid.ToString(), It.IsAny<CancellationToken>()));
    }

    [Fact]
    public async Task SendEFormidlingShipment_skips_when_duplicate_already_sent()
    {
        // Arrange
        await using var fixture = CreateFixture(
            data: [],
            setupEFormidlingClient: static c => SetupDuplicateCreate(c, "opprettet", "sendt", "levert")
        );
        var (sp, _, instanceGuid, dataAccessor) = fixture;
        var defaultEformidlingService = sp.GetRequiredService<IEFormidlingService>();

        // Act
        await defaultEformidlingService.SendEFormidlingShipment(dataAccessor.Object, TestConfiguration);

        // Assert - idempotent no-op: nothing is uploaded and nothing is re-sent
        var eFormidlingClient = fixture.Mock<IEFormidlingClient>();
        eFormidlingClient.Verify(
            ec =>
                ec.UploadAttachment(
                    It.IsAny<Stream>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
        eFormidlingClient.Verify(ec => ec.SendMessage(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SendEFormidlingShipment_throws_when_duplicate_message_has_failed()
    {
        // Arrange
        await using var fixture = CreateFixture(
            data: [],
            setupEFormidlingClient: static c => SetupDuplicateCreate(c, "opprettet", "levetid_utlopt")
        );
        var (sp, _, _, dataAccessor) = fixture;
        var defaultEformidlingService = sp.GetRequiredService<IEFormidlingService>();

        // Act & Assert
        var exception = await Assert.ThrowsAsync<EformidlingDeliveryException>(() =>
            defaultEformidlingService.SendEFormidlingShipment(dataAccessor.Object, TestConfiguration)
        );
        Assert.Contains("levetid_utlopt", exception.Message);
    }

    [Theory]
    [InlineData(DuplicateMessageBody, true)]
    // Not JSON, but the truncated or plain-text body still names the exception.
    [InlineData("not json MessageAlreadyExistsException", true)]
    [InlineData(
        "{ \"exception\" : \"no.difi.meldingsutveksling.exceptions.SomethingElseException\", \"message\" : \"boom\" }",
        false
    )]
    [InlineData("Connection refused", false)]
    [InlineData("", false)]
    public void IsMessageAlreadyExistsError_matches_only_duplicate_errors(string body, bool expected)
    {
        Assert.Equal(expected, DefaultEFormidlingService.IsMessageAlreadyExistsError(Rejected(body)));
    }

    [Fact]
    public async Task GetEFormidlingShipmentStatus_classifies_the_reported_statuses()
    {
        // Arrange
        await using var fixture = CreateFixture(
            data: [],
            setupEFormidlingClient: static c =>
                c.Setup(ec => ec.GetMessageStatusById(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(
                        new Statuses
                        {
                            Content =
                            [
                                new Statuses.Entry { Status = "sendt" },
                                new Statuses.Entry { Status = "levert", Description = "Levert til mottaker" },
                            ],
                        }
                    )
        );
        var (sp, _, instanceGuid, dataAccessor) = fixture;
        var defaultEformidlingService = sp.GetRequiredService<IEFormidlingService>();

        // Act
        var status = await defaultEformidlingService.GetEFormidlingShipmentStatus(
            dataAccessor.Object,
            TestConfiguration
        );

        // Assert - queried by the instance guid, which is the shipment id
        Assert.Equal(EFormidlingDeliveryState.Delivered, status.State);
        Assert.Equal("levert", status.Status);
        Assert.Equal("Levert til mottaker", status.Description);
        fixture
            .Mock<IEFormidlingClient>()
            .Verify(ec => ec.GetMessageStatusById(instanceGuid.ToString(), It.IsAny<CancellationToken>()));
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
