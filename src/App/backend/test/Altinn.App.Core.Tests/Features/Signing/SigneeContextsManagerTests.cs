using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Features.Signing.Exceptions;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
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
            _appImplementationFactory,
            _appMetadata.Object,
            _logger.Object
        );

        // Setup default party lookup behavior
        _altinnPartyClient
            .Setup(x => x.LookupParty(It.IsAny<PartyLookup>()))
            .ReturnsAsync(
                (PartyLookup lookup) =>
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
}
