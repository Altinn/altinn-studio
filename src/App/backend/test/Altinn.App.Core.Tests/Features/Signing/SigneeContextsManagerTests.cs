using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Features.Signing.Exceptions;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using EmailModel = Altinn.App.Core.Features.Signing.Email;
using InternalOrganizationSignee = Altinn.App.Core.Features.Signing.Models.Signee.OrganizationSignee;
using InternalPersonSignee = Altinn.App.Core.Features.Signing.Models.Signee.PersonSignee;
using SmsModel = Altinn.App.Core.Features.Signing.Sms;

namespace Altinn.App.Core.Tests.Features.Signing;

public sealed class SigneeContextsManagerTests : IDisposable
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
        PropertyNameCaseInsensitive = true,
        WriteIndented = true,
        ReferenceHandler = ReferenceHandler.Preserve,
        MaxDepth = 16,
    };
    private readonly ServiceProvider _serviceProvider;
    private readonly SigneeContextsManager _signeeContextsManager;

    private readonly Mock<IAltinnPartyClient> _altinnPartyClient = new(MockBehavior.Strict);
    private readonly Mock<IInstanceClient> _instanceClient = new(MockBehavior.Strict);
    private readonly Mock<ISigneeProvider> _signeeProvider = new(MockBehavior.Strict);
    private readonly Mock<IAppMetadata> _appMetadata = new();
    private readonly Mock<ILogger<SigneeContextsManager>> _logger = new();
    private readonly AppImplementationFactory _appImplementationFactory;

    private const string SigneeStatesDataTypeId = "signeeStates";

    public void Dispose() => _serviceProvider.Dispose();

    public SigneeContextsManagerTests()
    {
        var services = new ServiceCollection();
        services.AddAppImplementationFactory();
        services.AddSingleton(_signeeProvider.Object);
        _serviceProvider = services.BuildServiceProvider();

        _appMetadata
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(
                new ApplicationMetadata("ttd/app")
                {
                    DataTypes =
                    [
                        new DataType { Id = SigneeStatesDataTypeId, ActionRequiredToRead = "restricted-read" },
                    ],
                }
            );

        _appImplementationFactory = _serviceProvider.GetRequiredService<AppImplementationFactory>();

        _signeeContextsManager = new SigneeContextsManager(
            _altinnPartyClient.Object,
            _instanceClient.Object,
            _appImplementationFactory,
            _appMetadata.Object,
            _logger.Object
        );

        // Setup default party lookup behavior
        _altinnPartyClient
            .Setup(x => x.LookupParty(It.IsAny<PartyLookup>(), It.IsAny<StorageAuthenticationMethod?>()))
            .ReturnsAsync(
                (PartyLookup lookup, StorageAuthenticationMethod? _) =>
                {
                    if (lookup.Ssn is not null)
                    {
                        return new Party
                        {
                            SSN = lookup.Ssn,
                            Name = "Test Person",
                            Person = new Person
                            {
                                SSN = lookup.Ssn,
                                Name = "Test Person",
                                MobileNumber = "12345678",
                            },
                        };
                    }

                    if (lookup.OrgNo is not null)
                    {
                        return new Party
                        {
                            OrgNumber = lookup.OrgNo,
                            Name = "Test Organization",
                            Organization = new Organization
                            {
                                OrgNumber = lookup.OrgNo,
                                Name = "Test Organization",
                                EMailAddress = "test@org.com",
                                MobileNumber = "87654321",
                            },
                        };
                    }

                    return null!;
                }
            );
    }

    [Fact]
    public async Task GenerateSigneeContexts_WithValidPersonSignees_ReturnsCorrectSigneeContexts()
    {
        // Arrange
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeProviderId = "testProvider",
            SigneeStatesDataTypeId = SigneeStatesDataTypeId,
        };

        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };

        var cachedInstanceMutator = new Mock<IInstanceDataMutator>();
        cachedInstanceMutator.Setup(x => x.Instance).Returns(instance);

        var personSignee1 = new ProvidedPerson
        {
            SocialSecurityNumber = "12345678901",
            FullName = "Person One",
            CommunicationConfig = new CommunicationConfig
            {
                Notification = new Notification
                {
                    Email = new EmailModel { EmailAddress = "person1@example.com" },
                    Sms = new SmsModel { MobileNumber = "11111111" },
                },
            },
        };

        var personSignee2 = new ProvidedPerson
        {
            SocialSecurityNumber = "10987654321",
            FullName = "Person Two",
            CommunicationConfig = new CommunicationConfig
            {
                Notification = new Notification
                {
                    Email = new EmailModel { EmailAddress = "person2@example.com" },
                    Sms = new SmsModel { MobileNumber = "22222222" },
                },
            },
        };

        var signeesResult = new SigneeProviderResult { Signees = [personSignee1, personSignee2] };

        _signeeProvider.Setup(x => x.Id).Returns("testProvider");
        _signeeProvider.Setup(x => x.GetSignees(It.IsAny<GetSigneesParameters>())).ReturnsAsync(signeesResult);

        // Act
        var result = await _signeeContextsManager.GenerateSigneeContexts(
            cachedInstanceMutator.Object,
            signatureConfiguration,
            CancellationToken.None
        );

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Count);

        // Verify first signee context
        var firstContext = result[0];
        Assert.Equal("Task_1", firstContext.TaskId);
        Assert.NotNull(firstContext.SigneeState);
        Assert.False(firstContext.SigneeState.IsAccessDelegated);
        Assert.False(firstContext.SigneeState.HasBeenMessagedForCallToSign);

        Assert.IsType<InternalPersonSignee>(firstContext.Signee);
        var firstSignee = (InternalPersonSignee)firstContext.Signee;
        Assert.Equal("12345678901", firstSignee.SocialSecurityNumber);
        Assert.Equal("Test Person", firstSignee.FullName);

        Assert.NotNull(firstContext.CommunicationConfig);
        Assert.NotNull(firstContext.CommunicationConfig.Notification);
        Assert.NotNull(firstContext.CommunicationConfig.Notification.Email);
        Assert.Equal("person1@example.com", firstContext.CommunicationConfig.Notification.Email.EmailAddress);
        Assert.NotNull(firstContext.CommunicationConfig.Notification.Sms);
        Assert.Equal("11111111", firstContext.CommunicationConfig.Notification.Sms.MobileNumber);

        // Verify second signee context
        var secondContext = result[1];
        Assert.Equal("Task_1", secondContext.TaskId);
        Assert.NotNull(secondContext.SigneeState);
        Assert.False(secondContext.SigneeState.IsAccessDelegated);
        Assert.False(secondContext.SigneeState.HasBeenMessagedForCallToSign);

        Assert.IsType<InternalPersonSignee>(secondContext.Signee);
        var secondSignee = (InternalPersonSignee)secondContext.Signee;
        Assert.Equal("10987654321", secondSignee.SocialSecurityNumber);
        Assert.Equal("Test Person", secondSignee.FullName);

        Assert.NotNull(secondContext.CommunicationConfig);
        Assert.NotNull(secondContext.CommunicationConfig.Notification);
        Assert.NotNull(secondContext.CommunicationConfig.Notification.Email);
        Assert.Equal("person2@example.com", secondContext.CommunicationConfig.Notification.Email.EmailAddress);
        Assert.NotNull(secondContext.CommunicationConfig.Notification.Sms);
        Assert.Equal("22222222", secondContext.CommunicationConfig.Notification.Sms.MobileNumber);
    }

    [Fact]
    public async Task GenerateSigneeContexts_WithValidOrganizationSignees_ReturnsCorrectSigneeContexts()
    {
        // Arrange
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeProviderId = "testProvider",
            SigneeStatesDataTypeId = SigneeStatesDataTypeId,
        };

        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };

        var cachedInstanceMutator = new Mock<IInstanceDataMutator>();
        cachedInstanceMutator.Setup(x => x.Instance).Returns(instance);

        var orgSignee = new ProvidedOrganization
        {
            OrganizationNumber = "123456789",
            Name = "Test Organization",
            CommunicationConfig = new CommunicationConfig
            {
                Notification = new Notification
                {
                    Email = new EmailModel { }, // Empty to test auto-fill from Party
                    Sms = new SmsModel { }, // Empty to test auto-fill from Party
                },
            },
        };

        var signeesResult = new SigneeProviderResult { Signees = [orgSignee] };

        _signeeProvider.Setup(x => x.Id).Returns("testProvider");
        _signeeProvider.Setup(x => x.GetSignees(It.IsAny<GetSigneesParameters>())).ReturnsAsync(signeesResult);

        // Act
        var result = await _signeeContextsManager.GenerateSigneeContexts(
            cachedInstanceMutator.Object,
            signatureConfiguration,
            CancellationToken.None
        );

        // Assert
        Assert.NotNull(result);
        Assert.Single(result);

        var context = result[0];
        Assert.Equal("Task_1", context.TaskId);
        Assert.NotNull(context.SigneeState);
        Assert.False(context.SigneeState.IsAccessDelegated);
        Assert.False(context.SigneeState.HasBeenMessagedForCallToSign);

        Assert.IsType<InternalOrganizationSignee>(context.Signee);
        var signee = (InternalOrganizationSignee)context.Signee;
        Assert.Equal("123456789", signee.OrgNumber);
        Assert.Equal("Test Organization", signee.OrgName);

        Assert.NotNull(context.CommunicationConfig);
        Assert.NotNull(context.CommunicationConfig.Notification);
        Assert.NotNull(context.CommunicationConfig.Notification.Email);
        Assert.Equal("test@org.com", context.CommunicationConfig.Notification.Email.EmailAddress);
        Assert.NotNull(context.CommunicationConfig.Notification.Sms);
        Assert.Equal("87654321", context.CommunicationConfig.Notification.Sms.MobileNumber);
    }

    [Theory]
    [InlineData(true, "test@org.com", "87654321")] // Organization: both email and mobile come from the party register
    [InlineData(false, null, "12345678")] // Person: only the mobile is backfilled; persons get no email from the register
    public async Task GenerateSigneeContexts_EmptyContactValues_AreBackfilledFromParty(
        bool isOrganization,
        string? expectedEmail,
        string? expectedMobile
    )
    {
        // Arrange
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeProviderId = "testProvider",
            SigneeStatesDataTypeId = SigneeStatesDataTypeId,
        };

        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };

        var cachedInstanceMutator = new Mock<IInstanceDataMutator>();
        cachedInstanceMutator.Setup(x => x.Instance).Returns(instance);

        // Channel objects are present but carry no address/number, so they should be backfilled from the party.
        var communicationConfig = new CommunicationConfig
        {
            Notification = new Notification { Email = new EmailModel(), Sms = new SmsModel() },
        };

        ProvidedSignee signee = isOrganization
            ? new ProvidedOrganization
            {
                OrganizationNumber = "123456789",
                Name = "Test Organization",
                CommunicationConfig = communicationConfig,
            }
            : new ProvidedPerson
            {
                SocialSecurityNumber = "12345678901",
                FullName = "Person One",
                CommunicationConfig = communicationConfig,
            };

        var signeesResult = new SigneeProviderResult { Signees = [signee] };
        _signeeProvider.Setup(x => x.Id).Returns("testProvider");
        _signeeProvider.Setup(x => x.GetSignees(It.IsAny<GetSigneesParameters>())).ReturnsAsync(signeesResult);

        // Act
        var result = await _signeeContextsManager.GenerateSigneeContexts(
            cachedInstanceMutator.Object,
            signatureConfiguration,
            CancellationToken.None
        );

        // Assert
        var notification = Assert.Single(result).CommunicationConfig?.Notification;
        Assert.NotNull(notification);
        Assert.Equal(expectedEmail, notification.Email?.EmailAddress);
        Assert.Equal(expectedMobile, notification.Sms?.MobileNumber);
    }

    [Fact]
    public async Task GenerateSigneeContexts_NullContactObjects_AreNotBackfilled()
    {
        // Arrange: the party register has contact info, but the notification channels themselves are null.
        // The backfill only fires when a channel object exists, so nothing should be created here.
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeProviderId = "testProvider",
            SigneeStatesDataTypeId = SigneeStatesDataTypeId,
        };

        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };

        var cachedInstanceMutator = new Mock<IInstanceDataMutator>();
        cachedInstanceMutator.Setup(x => x.Instance).Returns(instance);

        var orgSignee = new ProvidedOrganization
        {
            OrganizationNumber = "123456789",
            Name = "Test Organization",
            CommunicationConfig = new CommunicationConfig
            {
                Notification = new Notification { Email = null, Sms = null },
            },
        };

        var signeesResult = new SigneeProviderResult { Signees = [orgSignee] };
        _signeeProvider.Setup(x => x.Id).Returns("testProvider");
        _signeeProvider.Setup(x => x.GetSignees(It.IsAny<GetSigneesParameters>())).ReturnsAsync(signeesResult);

        // Act
        var result = await _signeeContextsManager.GenerateSigneeContexts(
            cachedInstanceMutator.Object,
            signatureConfiguration,
            CancellationToken.None
        );

        // Assert
        var notification = Assert.Single(result).CommunicationConfig?.Notification;
        Assert.NotNull(notification);
        Assert.Null(notification.Email);
        Assert.Null(notification.Sms);
    }

    [Fact]
    public async Task GenerateSigneeContexts_WithNoSigneeProvider_ReturnsEmptyList()
    {
        // Arrange
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeProviderId = null,
            SigneeStatesDataTypeId = SigneeStatesDataTypeId,
        };

        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };

        var cachedInstanceMutator = new Mock<IInstanceDataMutator>();
        cachedInstanceMutator.Setup(x => x.Instance).Returns(instance);

        // Act
        var result = await _signeeContextsManager.GenerateSigneeContexts(
            cachedInstanceMutator.Object,
            signatureConfiguration,
            CancellationToken.None
        );

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GenerateSigneeContexts_WithNoMatchingProvider_ThrowsSigneeProviderNotFoundException()
    {
        // Arrange
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeProviderId = "nonExistentProvider",
            SigneeStatesDataTypeId = SigneeStatesDataTypeId,
        };

        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };

        var cachedInstanceMutator = new Mock<IInstanceDataMutator>();
        cachedInstanceMutator.Setup(x => x.Instance).Returns(instance);

        _signeeProvider.Setup(x => x.Id).Returns("testProvider");

        // Act & Assert
        await Assert.ThrowsAsync<SigneeProviderNotFoundException>(() =>
            _signeeContextsManager.GenerateSigneeContexts(
                cachedInstanceMutator.Object,
                signatureConfiguration,
                CancellationToken.None
            )
        );
    }

    [Theory]
    [InlineData(HttpStatusCode.TooManyRequests, true)]
    [InlineData(HttpStatusCode.ServiceUnavailable, true)]
    [InlineData(HttpStatusCode.BadRequest, false)]
    [InlineData(HttpStatusCode.NotFound, false)]
    public async Task GenerateSigneeContexts_PartyLookupFailure_OnlyRetriesTransientErrors(
        HttpStatusCode status,
        bool transient
    )
    {
        const string socialSecurityNumber = "12345678901";
        var exception = new HttpRequestException($"Lookup failed for {socialSecurityNumber}", null, status);
        _altinnPartyClient
            .Setup(x => x.LookupParty(It.IsAny<PartyLookup>(), It.IsAny<StorageAuthenticationMethod?>()))
            .ThrowsAsync(exception);
        _signeeProvider.Setup(x => x.Id).Returns("testProvider");
        _signeeProvider
            .Setup(x => x.GetSignees(It.IsAny<GetSigneesParameters>()))
            .ReturnsAsync(
                new SigneeProviderResult
                {
                    Signees =
                    [
                        new ProvidedPerson { SocialSecurityNumber = socialSecurityNumber, FullName = "Test Person" },
                    ],
                }
            );
        var mutator = new Mock<IInstanceDataMutator>();
        mutator
            .Setup(x => x.Instance)
            .Returns(
                new Instance
                {
                    Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
                }
            );
        var configuration = new AltinnSignatureConfiguration
        {
            SigneeProviderId = "testProvider",
            SigneeStatesDataTypeId = SigneeStatesDataTypeId,
        };

        Exception? actual = await Record.ExceptionAsync(() =>
            _signeeContextsManager.GenerateSigneeContexts(mutator.Object, configuration, CancellationToken.None)
        );

        if (transient)
        {
            Assert.Same(exception, actual);
        }
        else
        {
            var permanent = Assert.IsType<SigneeInitializationPermanentException>(actual);
            Assert.Contains("Correct the signee data", permanent.Message);
            Assert.DoesNotContain(socialSecurityNumber, permanent.Message);
        }
    }

    [Fact]
    public async Task GetSigneeContexts_WithNoSigneeStatesDataTypeId_ReturnsEmptyList()
    {
        // Arrange
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeProviderId = "testProvider",
            SigneeStatesDataTypeId = null,
        };

        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };

        var cachedInstanceAccessor = new Mock<IInstanceDataAccessor>();
        cachedInstanceAccessor.Setup(x => x.Instance).Returns(instance);

        // Act
        var result = await _signeeContextsManager.GetSigneeContexts(
            cachedInstanceAccessor.Object,
            signatureConfiguration,
            CancellationToken.None
        );

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetSigneeContexts_WithNoMatchingDataElement_ReturnsEmptyList()
    {
        // Arrange
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeProviderId = "testProvider",
            SigneeStatesDataTypeId = SigneeStatesDataTypeId,
        };

        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
            Data = [],
        };

        var cachedInstanceAccessor = new Mock<IInstanceDataAccessor>();
        cachedInstanceAccessor.Setup(x => x.Instance).Returns(instance);

        // Act
        var result = await _signeeContextsManager.GetSigneeContexts(
            cachedInstanceAccessor.Object,
            signatureConfiguration,
            CancellationToken.None
        );

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetSigneeContexts_WithValidDataElement_ReturnsDeserializedSigneeContexts()
    {
        // Arrange
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeProviderId = "testProvider",
            SigneeStatesDataTypeId = SigneeStatesDataTypeId,
        };

        var signeeStateDataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = SigneeStatesDataTypeId,
        };

        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
            Data = [signeeStateDataElement],
        };

        // Create test signee contexts to serialize
        var signeeContexts = new List<SigneeContext>
        {
            new()
            {
                TaskId = "Task_1",
                SigneeState = new SigneeContextState
                {
                    IsAccessDelegated = true,
                    HasBeenMessagedForCallToSign = true,
                    CtaCorrespondenceId = Guid.NewGuid(),
                },
                Signee = new InternalPersonSignee
                {
                    FullName = "Test Person",
                    SocialSecurityNumber = "12345678901",
                    Party = new Party { SSN = "12345678901", Name = "Test Person" },
                },
                CommunicationConfig = new CommunicationConfig
                {
                    Notification = new Notification
                    {
                        Email = new EmailModel { EmailAddress = "test@example.com" },
                        Sms = new SmsModel { MobileNumber = "12345678" },
                    },
                },
            },
        };

        // Serialize the signee contexts
        var serializedData = JsonSerializer.SerializeToUtf8Bytes(signeeContexts, _jsonSerializerOptions);

        var cachedInstanceAccessor = new Mock<IInstanceDataAccessor>();
        cachedInstanceAccessor.Setup(x => x.Instance).Returns(instance);
        cachedInstanceAccessor
            .Setup(x => x.GetBinaryData(signeeStateDataElement))
            .ReturnsAsync(new ReadOnlyMemory<byte>(serializedData));

        // Act
        var result = await _signeeContextsManager.GetSigneeContexts(
            cachedInstanceAccessor.Object,
            signatureConfiguration,
            CancellationToken.None
        );

        // Assert
        Assert.NotNull(result);
        Assert.Single(result);

        var context = result[0];
        Assert.Equal("Task_1", context.TaskId);
        Assert.NotNull(context.SigneeState);
        Assert.True(context.SigneeState.IsAccessDelegated);
        Assert.True(context.SigneeState.HasBeenMessagedForCallToSign);
        Assert.NotNull(context.SigneeState.CtaCorrespondenceId);

        Assert.IsType<InternalPersonSignee>(context.Signee);
        var signee = (InternalPersonSignee)context.Signee;
        Assert.Equal("12345678901", signee.SocialSecurityNumber);
        Assert.Equal("Test Person", signee.FullName);

        Assert.NotNull(context.CommunicationConfig);
        Assert.NotNull(context.CommunicationConfig.Notification);
        Assert.NotNull(context.CommunicationConfig.Notification.Email);
        Assert.Equal("test@example.com", context.CommunicationConfig.Notification.Email.EmailAddress);
        Assert.NotNull(context.CommunicationConfig.Notification.Sms);
        Assert.Equal("12345678", context.CommunicationConfig.Notification.Sms.MobileNumber);

        cachedInstanceAccessor.Verify(
            m =>
                m.OverrideAuthenticationMethod(
                    It.Is<DataType>(dt => dt.Id == signatureConfiguration.SigneeStatesDataTypeId),
                    StorageAuthenticationMethod.ServiceOwner()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task GetSigneeContexts_WithMissingSigneeStatesDataTypeId_ThrowsApplicationConfigException()
    {
        // Arrange
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeProviderId = "testProvider",
            SigneeStatesDataTypeId = null,
        };

        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };

        var cachedInstanceAccessor = new Mock<IInstanceDataAccessor>();
        cachedInstanceAccessor.Setup(x => x.Instance).Returns(instance);

        // Act & Assert - This should not throw since the method handles null SigneeStatesDataTypeId
        var result = await _signeeContextsManager.GetSigneeContexts(
            cachedInstanceAccessor.Object,
            signatureConfiguration,
            CancellationToken.None
        );

        Assert.Empty(result);
    }

    [Fact]
    public async Task GenerateSigneeContexts_WithAdditionalActionsToDelegate_ThreadsToSigneeContext()
    {
        // Arrange
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeProviderId = "testProvider",
            SigneeStatesDataTypeId = SigneeStatesDataTypeId,
        };

        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };

        var cachedInstanceMutator = new Mock<IInstanceDataMutator>();
        cachedInstanceMutator.Setup(x => x.Instance).Returns(instance);

        var personSignee = new ProvidedPerson
        {
            SocialSecurityNumber = "12345678901",
            FullName = "Person One",
            AdditionalActionsToDelegate = ["reject"],
        };

        var signeesResult = new SigneeProviderResult { Signees = [personSignee] };

        _signeeProvider.Setup(x => x.Id).Returns("testProvider");
        _signeeProvider.Setup(x => x.GetSignees(It.IsAny<GetSigneesParameters>())).ReturnsAsync(signeesResult);

        // Act
        var result = await _signeeContextsManager.GenerateSigneeContexts(
            cachedInstanceMutator.Object,
            signatureConfiguration,
            CancellationToken.None
        );

        // Assert
        Assert.NotNull(result);
        Assert.Single(result);
        var additionalActions = result[0].AdditionalActionsToDelegate;
        Assert.NotNull(additionalActions);
        Assert.Equal("reject", Assert.Single(additionalActions));
    }

    [Fact]
    public void FindTaskSigneeStateElement_TaggedElementExists_ReturnsIt()
    {
        const string taskId = "Task_1";
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeStatesDataTypeId = SigneeStatesDataTypeId,
        };

        DataElement taggedElement = CreateTaggedSigneeStateElement(taskId);
        DataElement untaggedElement = CreateSigneeStateElement();

        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
            Data = [taggedElement, untaggedElement],
        };

        var instanceDataAccessor = new Mock<IInstanceDataAccessor>();
        instanceDataAccessor.Setup(x => x.Instance).Returns(instance);

        DataElement? result = _signeeContextsManager.FindTaskSigneeStateElement(
            instanceDataAccessor.Object,
            signatureConfiguration,
            taskId
        );

        Assert.Same(taggedElement, result);
    }

    [Fact]
    public void FindTaskSigneeStateElement_NoTaggedElement_ReturnsNull()
    {
        const string taskId = "Task_1";
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeStatesDataTypeId = SigneeStatesDataTypeId,
        };

        DataElement untaggedElement = CreateSigneeStateElement();
        DataElement otherTaskElement = CreateTaggedSigneeStateElement("Task_2");

        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
            Data = [untaggedElement, otherTaskElement],
        };

        var instanceDataAccessor = new Mock<IInstanceDataAccessor>();
        instanceDataAccessor.Setup(x => x.Instance).Returns(instance);

        DataElement? result = _signeeContextsManager.FindTaskSigneeStateElement(
            instanceDataAccessor.Object,
            signatureConfiguration,
            taskId
        );

        Assert.Null(result);
    }

    [Fact]
    public void FindTaskSigneeStateElement_TwoTaggedElements_ReturnsMostRecentlyChanged()
    {
        const string taskId = "Task_1";
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeStatesDataTypeId = SigneeStatesDataTypeId,
        };

        DataElement older = CreateTaggedSigneeStateElement(taskId);
        older.LastChanged = DateTime.UtcNow.AddMinutes(-10);
        DataElement newer = CreateTaggedSigneeStateElement(taskId);
        newer.LastChanged = DateTime.UtcNow;

        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
            Data = [older, newer],
        };

        var instanceDataAccessor = new Mock<IInstanceDataAccessor>();
        instanceDataAccessor.Setup(x => x.Instance).Returns(instance);

        DataElement? result = _signeeContextsManager.FindTaskSigneeStateElement(
            instanceDataAccessor.Object,
            signatureConfiguration,
            taskId
        );

        Assert.Same(newer, result);
    }

    [Fact]
    public async Task RefreshTaskSigneeStateElementFromStorage_ElementInStorageNotLocally_AddsAndReturnsIt()
    {
        const string taskId = "Task_1";
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeStatesDataTypeId = SigneeStatesDataTypeId,
        };

        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
            Data = [],
        };

        DataElement storageElement = CreateTaggedSigneeStateElement(taskId);
        var storedInstance = new Instance { Data = [storageElement] };

        var instanceDataMutator = new Mock<IInstanceDataMutator>();
        instanceDataMutator.Setup(x => x.Instance).Returns(instance);

        _instanceClient
            .Setup(x => x.GetInstance(instance, StorageAuthenticationMethod.ServiceOwner(), CancellationToken.None))
            .ReturnsAsync(storedInstance);

        DataElement? result = await _signeeContextsManager.RefreshTaskSigneeStateElementFromStorage(
            instanceDataMutator.Object,
            signatureConfiguration,
            taskId,
            CancellationToken.None
        );

        Assert.Same(storageElement, result);
        Assert.Contains(storageElement, instance.Data);
    }

    [Fact]
    public async Task RefreshTaskSigneeStateElementFromStorage_ElementAlreadyLocal_ReturnsWithoutDuplicating()
    {
        const string taskId = "Task_1";
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeStatesDataTypeId = SigneeStatesDataTypeId,
        };

        DataElement sharedElement = CreateTaggedSigneeStateElement(taskId);

        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
            Data = [sharedElement],
        };
        var storedInstance = new Instance { Data = [sharedElement] };

        var instanceDataMutator = new Mock<IInstanceDataMutator>();
        instanceDataMutator.Setup(x => x.Instance).Returns(instance);

        _instanceClient
            .Setup(x => x.GetInstance(instance, StorageAuthenticationMethod.ServiceOwner(), CancellationToken.None))
            .ReturnsAsync(storedInstance);

        DataElement? result = await _signeeContextsManager.RefreshTaskSigneeStateElementFromStorage(
            instanceDataMutator.Object,
            signatureConfiguration,
            taskId,
            CancellationToken.None
        );

        Assert.Same(sharedElement, result);
        Assert.Single(instance.Data);
    }

    [Fact]
    public async Task RefreshTaskSigneeStateElementFromStorage_NoneInStorage_ReturnsNull()
    {
        const string taskId = "Task_1";
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeStatesDataTypeId = SigneeStatesDataTypeId,
        };

        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
            Data = [],
        };
        var storedInstance = new Instance { Data = [] };

        var instanceDataMutator = new Mock<IInstanceDataMutator>();
        instanceDataMutator.Setup(x => x.Instance).Returns(instance);

        _instanceClient
            .Setup(x => x.GetInstance(instance, StorageAuthenticationMethod.ServiceOwner(), CancellationToken.None))
            .ReturnsAsync(storedInstance);

        DataElement? result = await _signeeContextsManager.RefreshTaskSigneeStateElementFromStorage(
            instanceDataMutator.Object,
            signatureConfiguration,
            taskId,
            CancellationToken.None
        );

        Assert.Null(result);
    }

    [Fact]
    public void RemoveOtherSigneeStateElements_RemovesUntaggedAndOtherTaskElements_KeepsOwnTask()
    {
        const string taskId = "Task_1";
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeStatesDataTypeId = SigneeStatesDataTypeId,
        };

        DataElement ownElement = CreateTaggedSigneeStateElement(taskId);
        DataElement untaggedElement = CreateSigneeStateElement();
        DataElement otherTaskElement = CreateTaggedSigneeStateElement("Task_2");

        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
            Data = [ownElement, untaggedElement, otherTaskElement],
        };

        var instanceDataMutator = new Mock<IInstanceDataMutator>();
        instanceDataMutator.Setup(x => x.Instance).Returns(instance);

        _signeeContextsManager.RemoveOtherSigneeStateElements(
            instanceDataMutator.Object,
            signatureConfiguration,
            taskId
        );

        instanceDataMutator.Verify(x => x.RemoveDataElement(untaggedElement), Times.Once);
        instanceDataMutator.Verify(x => x.RemoveDataElement(otherTaskElement), Times.Once);
        instanceDataMutator.Verify(x => x.RemoveDataElement(ownElement), Times.Never);
    }

    [Fact]
    public async Task LoadSigneeContexts_RoundTripsPersistedSigneeContexts()
    {
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeStatesDataTypeId = SigneeStatesDataTypeId,
        };
        DataElement signeeStateDataElement = CreateSigneeStateElement();

        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
            Data = [signeeStateDataElement],
        };

        List<SigneeContext> signeeContexts = [CreateMinimalSigneeContext("Task_1")];
        signeeContexts[0].SigneeState.IsAccessDelegated = true;

        byte[] serializedData = JsonSerializer.SerializeToUtf8Bytes(signeeContexts, _jsonSerializerOptions);

        var instanceDataAccessor = new Mock<IInstanceDataAccessor>();
        instanceDataAccessor.Setup(x => x.Instance).Returns(instance);
        instanceDataAccessor
            .Setup(x => x.GetBinaryData(signeeStateDataElement))
            .ReturnsAsync(new ReadOnlyMemory<byte>(serializedData));

        List<SigneeContext> result = await _signeeContextsManager.LoadSigneeContexts(
            instanceDataAccessor.Object,
            signatureConfiguration,
            signeeStateDataElement
        );

        SigneeContext context = Assert.Single(result);
        Assert.Equal("Task_1", context.TaskId);
        Assert.True(context.SigneeState.IsAccessDelegated);

        instanceDataAccessor.Verify(
            m =>
                m.OverrideAuthenticationMethod(
                    It.Is<DataType>(dt => dt.Id == SigneeStatesDataTypeId),
                    StorageAuthenticationMethod.ServiceOwner()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task PersistSigneeContexts_ExistingTaggedElement_UpdatesIt()
    {
        const string taskId = "Task_1";
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeStatesDataTypeId = SigneeStatesDataTypeId,
        };

        DataElement existingElement = CreateTaggedSigneeStateElement(taskId);

        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
            Data = [existingElement],
        };

        var instanceDataMutator = new Mock<IInstanceDataMutator>();
        instanceDataMutator.Setup(x => x.Instance).Returns(instance);
        instanceDataMutator
            .Setup(x =>
                x.UpdateBinaryDataElement(existingElement, "application/json", It.IsAny<ReadOnlyMemory<byte>>())
            )
            .Returns(
                new BinaryDataChange(
                    ChangeType.Updated,
                    new DataType { Id = SigneeStatesDataTypeId },
                    "application/json",
                    existingElement,
                    null,
                    ReadOnlyMemory<byte>.Empty,
                    taskId
                )
            );

        List<SigneeContext> signeeContexts = [CreateMinimalSigneeContext(taskId)];

        await _signeeContextsManager.PersistSigneeContexts(
            instanceDataMutator.Object,
            signatureConfiguration,
            taskId,
            signeeContexts
        );

        instanceDataMutator.Verify(
            x => x.UpdateBinaryDataElement(existingElement, "application/json", It.IsAny<ReadOnlyMemory<byte>>()),
            Times.Once
        );
        instanceDataMutator.Verify(
            x =>
                x.AddBinaryDataElement(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    It.IsAny<string?>(),
                    It.IsAny<List<Altinn.Platform.Storage.Interface.Models.KeyValueEntry>?>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task PersistSigneeContexts_NoExistingElement_AddsNewOneTaggedWithTask()
    {
        const string taskId = "Task_1";
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeStatesDataTypeId = SigneeStatesDataTypeId,
        };

        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
            Data = [],
        };

        var instanceDataMutator = new Mock<IInstanceDataMutator>();
        instanceDataMutator.Setup(x => x.Instance).Returns(instance);
        instanceDataMutator
            .Setup(x =>
                x.AddBinaryDataElement(
                    SigneeStatesDataTypeId,
                    "application/json",
                    null,
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    taskId,
                    null
                )
            )
            .Returns(
                new BinaryDataChange(
                    ChangeType.Created,
                    new DataType { Id = SigneeStatesDataTypeId },
                    "application/json",
                    null,
                    null,
                    ReadOnlyMemory<byte>.Empty,
                    taskId
                )
            );

        List<SigneeContext> signeeContexts = [CreateMinimalSigneeContext(taskId)];

        await _signeeContextsManager.PersistSigneeContexts(
            instanceDataMutator.Object,
            signatureConfiguration,
            taskId,
            signeeContexts
        );

        instanceDataMutator.Verify(
            x =>
                x.AddBinaryDataElement(
                    SigneeStatesDataTypeId,
                    "application/json",
                    null,
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    taskId,
                    null
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task GetSigneeContexts_FixtureWithoutFailureProperties_DeserializesWithNullFailures()
    {
        // A fixture written before DelegationFailure/NotificationFailure existed on SigneeContextState:
        // the properties are absent from the JSON entirely, not merely null.
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeStatesDataTypeId = SigneeStatesDataTypeId,
        };
        DataElement signeeStateDataElement = CreateSigneeStateElement();

        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
            Data = [signeeStateDataElement],
        };

        List<SigneeContext> signeeContexts = [CreateMinimalSigneeContext("Task_1")];
        string json = JsonSerializer.Serialize(signeeContexts, _jsonSerializerOptions);
        string legacyJson = RemoveJsonProperties(json, "delegationFailure", "notificationFailure");

        Assert.DoesNotContain("delegationFailure", legacyJson);
        Assert.DoesNotContain("notificationFailure", legacyJson);
        Assert.Contains("\"$id\"", legacyJson);
        Assert.Contains("\"$values\"", legacyJson);

        var instanceDataAccessor = new Mock<IInstanceDataAccessor>();
        instanceDataAccessor.Setup(x => x.Instance).Returns(instance);
        instanceDataAccessor
            .Setup(x => x.GetBinaryData(signeeStateDataElement))
            .ReturnsAsync(new ReadOnlyMemory<byte>(Encoding.UTF8.GetBytes(legacyJson)));

        List<SigneeContext> result = await _signeeContextsManager.GetSigneeContexts(
            instanceDataAccessor.Object,
            signatureConfiguration,
            CancellationToken.None
        );

        SigneeContext context = Assert.Single(result);
        Assert.Null(context.SigneeState.DelegationFailure);
        Assert.Null(context.SigneeState.NotificationFailure);
    }

    [Fact]
    public async Task GetSigneeContexts_FixtureWithUnrecognisedDelegationFailureValue_DeserializesAsUnknown()
    {
        // A fixture carrying a delegationFailure value from a newer app-lib version than this one knows about.
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeStatesDataTypeId = SigneeStatesDataTypeId,
        };
        DataElement signeeStateDataElement = CreateSigneeStateElement();

        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
            Data = [signeeStateDataElement],
        };

        List<SigneeContext> signeeContexts = [CreateMinimalSigneeContext("Task_1")];
        string json = JsonSerializer.Serialize(signeeContexts, _jsonSerializerOptions);
        string fixtureJson = SetJsonProperty(json, "delegationFailure", "somethingNew");

        Assert.Contains("\"somethingNew\"", fixtureJson);

        var instanceDataAccessor = new Mock<IInstanceDataAccessor>();
        instanceDataAccessor.Setup(x => x.Instance).Returns(instance);
        instanceDataAccessor
            .Setup(x => x.GetBinaryData(signeeStateDataElement))
            .ReturnsAsync(new ReadOnlyMemory<byte>(Encoding.UTF8.GetBytes(fixtureJson)));

        List<SigneeContext> result = await _signeeContextsManager.GetSigneeContexts(
            instanceDataAccessor.Object,
            signatureConfiguration,
            CancellationToken.None
        );

        SigneeContext context = Assert.Single(result);
        Assert.Equal(DelegationFailureCode.Unknown, context.SigneeState.DelegationFailure);
    }

    private static DataElement CreateSigneeStateElement() =>
        new() { Id = Guid.NewGuid().ToString(), DataType = SigneeStatesDataTypeId };

    private static DataElement CreateTaggedSigneeStateElement(string taskId) =>
        new()
        {
            Id = Guid.NewGuid().ToString(),
            DataType = SigneeStatesDataTypeId,
            References =
            [
                new Reference
                {
                    Relation = RelationType.GeneratedFrom,
                    ValueType = ReferenceType.Task,
                    Value = taskId,
                },
            ],
        };

    private static SigneeContext CreateMinimalSigneeContext(string taskId) =>
        new()
        {
            TaskId = taskId,
            SigneeState = new SigneeContextState(),
            Signee = new InternalPersonSignee
            {
                FullName = "Test Person",
                SocialSecurityNumber = "12345678901",
                Party = new Party { SSN = "12345678901", Name = "Test Person" },
            },
        };

    private static string RemoveJsonProperties(string json, params string[] propertyNames)
    {
        JsonNode node = JsonNode.Parse(json) ?? throw new InvalidOperationException("Failed to parse JSON fixture.");
        RemoveJsonPropertiesRecursive(node, propertyNames);
        return node.ToJsonString();
    }

    private static void RemoveJsonPropertiesRecursive(JsonNode? node, string[] propertyNames)
    {
        switch (node)
        {
            case JsonObject jsonObject:
                foreach (string propertyName in propertyNames)
                {
                    jsonObject.Remove(propertyName);
                }

                foreach (KeyValuePair<string, JsonNode?> property in jsonObject)
                {
                    RemoveJsonPropertiesRecursive(property.Value, propertyNames);
                }
                break;
            case JsonArray jsonArray:
                foreach (JsonNode? item in jsonArray)
                {
                    RemoveJsonPropertiesRecursive(item, propertyNames);
                }
                break;
        }
    }

    private static string SetJsonProperty(string json, string propertyName, string value)
    {
        JsonNode node = JsonNode.Parse(json) ?? throw new InvalidOperationException("Failed to parse JSON fixture.");
        SetJsonPropertyRecursive(node, propertyName, value);
        return node.ToJsonString();
    }

    private static void SetJsonPropertyRecursive(JsonNode? node, string propertyName, string value)
    {
        switch (node)
        {
            case JsonObject jsonObject:
                if (jsonObject.ContainsKey(propertyName))
                {
                    jsonObject[propertyName] = value;
                }

                foreach (KeyValuePair<string, JsonNode?> property in jsonObject)
                {
                    SetJsonPropertyRecursive(property.Value, propertyName, value);
                }
                break;
            case JsonArray jsonArray:
                foreach (JsonNode? item in jsonArray)
                {
                    SetJsonPropertyRecursive(item, propertyName, value);
                }
                break;
        }
    }
}
