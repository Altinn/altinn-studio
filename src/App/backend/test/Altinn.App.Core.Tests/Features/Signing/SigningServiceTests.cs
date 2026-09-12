using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Features.Signing.Exceptions;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.AltinnCdn;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;
using static Altinn.App.Core.Features.Signing.Models.Signee;
using SigneeState = Altinn.App.Core.Features.Signing.Models.SigneeContextState;
using StorageSignee = Altinn.Platform.Storage.Interface.Models.Signee;

namespace Altinn.App.Core.Tests.Features.Signing;

public sealed class SigningServiceTests : IDisposable
{
    private readonly ServiceProvider _serviceProvider;
    private readonly SigningService _signingService;

    private readonly Mock<IAltinnPartyClient> _altinnPartyClient = new(MockBehavior.Strict);
    private readonly Mock<IAltinnCdnClient> _altinnCdnClient = new(MockBehavior.Strict);
    private readonly Mock<ISigningDelegationService> _signingDelegationService = new(MockBehavior.Strict);
    private readonly Mock<ISigneeProvider> _signeeProvider = new(MockBehavior.Strict);
    private readonly Mock<ILogger<SigningService>> _logger = new();
    private readonly Mock<ISigneeContextsManager> _signeeContextsManager = new(MockBehavior.Strict);
    private readonly Mock<ISignDocumentManager> _signDocumentManager = new(MockBehavior.Strict);
    private readonly Mock<IAppMetadata> _appMetadata = new(MockBehavior.Strict);
    private readonly Mock<ISigningCallToActionService> _signingCallToActionService = new(MockBehavior.Strict);
    private readonly Mock<IAuthorizationClient> _authorizationClient = new(MockBehavior.Strict);
    private readonly Mock<IHostEnvironment> _hostEnvironment = new(MockBehavior.Strict);

    public void Dispose() => _serviceProvider.Dispose();

    public SigningServiceTests()
    {
        var services = new ServiceCollection();
        services.AddAppImplementationFactory();
        services.AddSingleton(_signeeProvider.Object);
        _serviceProvider = services.BuildStrictServiceProvider();

        _hostEnvironment.Setup(x => x.EnvironmentName).Returns("Development");

        _signingService = new SigningService(
            _hostEnvironment.Object,
            _altinnPartyClient.Object,
            _altinnCdnClient.Object,
            _signingDelegationService.Object,
            _appMetadata.Object,
            _signingCallToActionService.Object,
            _authorizationClient.Object,
            _logger.Object,
            _signeeContextsManager.Object,
            _signDocumentManager.Object
        );

        _altinnPartyClient
            .Setup(x => x.LookupParty(It.IsAny<PartyLookup>(), It.IsAny<StorageAuthenticationMethod?>()))
            .ReturnsAsync(
                (PartyLookup lookup, StorageAuthenticationMethod? _) =>
                {
                    return lookup.Ssn is not null
                        ? new Party
                        {
                            PartyId = 1,
                            PartyUuid = Guid.Parse("00000000-0000-0000-0000-000000000073"),
                            Name = "Test Person",
                            SSN = lookup.Ssn,
                        }
                        : new Party
                        {
                            PartyId = 2,
                            PartyUuid = Guid.Parse("00000000-0000-0000-0000-000000000080"),
                            Name = "Test Org",
                            OrgNumber = lookup.OrgNo,
                        };
                }
            );
    }

    [Fact]
    public async Task GetSigneeContexts_HappyPath()
    {
        // Arrange
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeStatesDataTypeId = "signeeStates",
            SignatureDataType = "signature",
        };

        var cachedInstanceMutator = new Mock<IInstanceDataMutator>();

        var signeeStateDataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = signatureConfiguration.SigneeStatesDataTypeId,
        };

        var signDocumentDataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = signatureConfiguration.SignatureDataType,
        };

        var signDocumentDataElement2 = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = signatureConfiguration.SignatureDataType,
        };

        Instance instance = new()
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
            Data = [signeeStateDataElement, signDocumentDataElement, signDocumentDataElement2],
        };

        var org = new Organization { OrgNumber = "123456789", Name = "An org" };
        var person = new Person { SSN = "12345678910", Name = "A person" };

        List<SigneeContext> signeeContexts =
        [
            new()
            {
                TaskId = instance.Process.CurrentTask.ElementId,
                SigneeState = new SigneeState
                {
                    IsAccessDelegated = true,
                    HasBeenMessagedForCallToSign = true,
                    CtaCorrespondenceId = Guid.Parse("12345678-1234-1234-1234-123456789012"),
                },

                Signee = new PersonOnBehalfOfOrgSignee
                {
                    FullName = "A person",
                    SocialSecurityNumber = person.SSN,
                    Party = new Party
                    {
                        PartyId = 1,
                        PartyUuid = Guid.Parse("00000000-0000-0000-0000-000000000146"),
                        SSN = person.SSN,
                        Name = person.Name,
                    },
                    OnBehalfOfOrg = new OrganizationSignee
                    {
                        OrgName = org.Name,
                        OrgNumber = org.OrgNumber,
                        OrgParty = new Party
                        {
                            PartyId = 2,
                            PartyUuid = Guid.Parse("00000000-0000-0000-0000-000000000157"),
                            Name = org.Name,
                            OrgNumber = org.OrgNumber,
                        },
                    },
                },
            },
        ];

        var signDocumentWithMatchingSignatureContext = new SignDocument
        {
            SigneeInfo = new StorageSignee { OrganisationNumber = org.OrgNumber, PersonNumber = person.SSN },
        };

        var signDocumentWithoutMatchingSignatureContext = new SignDocument
        {
            SigneeInfo = new StorageSignee { PersonNumber = person.SSN },
        };

        var signDocuments = new List<SignDocument>
        {
            signDocumentWithMatchingSignatureContext,
            signDocumentWithoutMatchingSignatureContext,
        };

        var synchronizedSigneeContexts = new List<SigneeContext>
        {
            new()
            {
                TaskId = instance.Process.CurrentTask.ElementId,
                SigneeState = new SigneeState
                {
                    IsAccessDelegated = true,
                    HasBeenMessagedForCallToSign = true,
                    CtaCorrespondenceId = Guid.Parse("12345678-1234-1234-1234-123456789012"),
                },
                Signee = new PersonOnBehalfOfOrgSignee
                {
                    FullName = "A person",
                    SocialSecurityNumber = person.SSN,
                    Party = new Party
                    {
                        PartyId = 1,
                        PartyUuid = Guid.Parse("00000000-0000-0000-0000-000000000200"),
                        SSN = person.SSN,
                        Name = person.Name,
                    },
                    OnBehalfOfOrg = new OrganizationSignee
                    {
                        OrgName = org.Name,
                        OrgNumber = org.OrgNumber,
                        OrgParty = new Party
                        {
                            PartyId = 2,
                            PartyUuid = Guid.Parse("00000000-0000-0000-0000-000000000211"),
                            Name = org.Name,
                            OrgNumber = org.OrgNumber,
                        },
                    },
                },
                SignDocument = signDocumentWithMatchingSignatureContext,
            },
            new()
            {
                TaskId = instance.Process.CurrentTask.ElementId,
                SigneeState = new() { IsAccessDelegated = true, HasBeenMessagedForCallToSign = true },
                Signee = new PersonSignee
                {
                    SocialSecurityNumber = person.SSN,
                    FullName = person.Name,
                    Party = new Party
                    {
                        PartyId = 1,
                        PartyUuid = Guid.Parse("00000000-0000-0000-0000-000000000230"),
                        SSN = person.SSN,
                        Name = person.Name,
                    },
                },
                SignDocument = signDocumentWithoutMatchingSignatureContext,
            },
        };

        cachedInstanceMutator.Setup(x => x.Instance).Returns(instance);

        _signeeContextsManager
            .Setup(x =>
                x.GetSigneeContexts(cachedInstanceMutator.Object, signatureConfiguration, CancellationToken.None)
            )
            .ReturnsAsync(signeeContexts);
        _signDocumentManager
            .Setup(x =>
                x.GetSignDocuments(cachedInstanceMutator.Object, signatureConfiguration, CancellationToken.None)
            )
            .ReturnsAsync([signDocumentWithMatchingSignatureContext, signDocumentWithoutMatchingSignatureContext]);
        _signDocumentManager
            .Setup(x =>
                x.SynchronizeSigneeContextsWithSignDocuments(
                    instance.Process.CurrentTask.ElementId,
                    signeeContexts,
                    signDocuments,
                    CancellationToken.None
                )
            )
            .ReturnsAsync(synchronizedSigneeContexts);

        _altinnPartyClient
            .Setup(x => x.LookupParty(It.IsAny<PartyLookup>(), It.IsAny<StorageAuthenticationMethod?>()))
            .ReturnsAsync(
                (PartyLookup lookup, StorageAuthenticationMethod? _) =>
                {
                    return lookup.Ssn is not null
                        ? new Party
                        {
                            PartyId = 1,
                            PartyUuid = Guid.Parse("00000000-0000-0000-0000-000000000271"),
                            SSN = lookup.Ssn,
                            Name = "A person",
                        }
                        : new Party
                        {
                            PartyId = 2,
                            PartyUuid = Guid.Parse("00000000-0000-0000-0000-000000000278"),
                            OrgNumber = lookup.OrgNo,
                            Name = "An organization",
                            Organization = new Organization { Name = "An organization", OrgNumber = lookup.OrgNo! },
                        };
                }
            );

        // Act
        List<SigneeContext> result = await _signingService.GetSigneeContexts(
            cachedInstanceMutator.Object,
            signatureConfiguration,
            CancellationToken.None
        );

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Count);

        SigneeContext signeeContextWithMatchingSignatureDocument = result.First(x =>
            x.Signee is PersonOnBehalfOfOrgSignee personOnBehalfOfOrgSignee
            && personOnBehalfOfOrgSignee.OnBehalfOfOrg.OrgNumber == org.OrgNumber
        );

        Assert.Equal(instance.Process.CurrentTask.ElementId, signeeContextWithMatchingSignatureDocument.TaskId);

        Assert.NotNull(signeeContextWithMatchingSignatureDocument);
        Assert.NotNull(signeeContextWithMatchingSignatureDocument.SigneeState);
        Assert.True(signeeContextWithMatchingSignatureDocument.SigneeState.IsAccessDelegated);
        Assert.True(signeeContextWithMatchingSignatureDocument.SigneeState.HasBeenMessagedForCallToSign);
        Assert.Equal(
            Guid.Parse("12345678-1234-1234-1234-123456789012"),
            signeeContextWithMatchingSignatureDocument.SigneeState.CtaCorrespondenceId
        );

        Assert.NotNull(signeeContextWithMatchingSignatureDocument.SignDocument);
        Assert.NotNull(signeeContextWithMatchingSignatureDocument.SignDocument?.SigneeInfo);
        Assert.Equal(
            org.OrgNumber,
            signeeContextWithMatchingSignatureDocument.SignDocument!.SigneeInfo!.OrganisationNumber
        );

        Assert.IsType<PersonOnBehalfOfOrgSignee>(signeeContextWithMatchingSignatureDocument.Signee);
        PersonOnBehalfOfOrgSignee personOnBehalfOfOrgSignee = (PersonOnBehalfOfOrgSignee)
            signeeContextWithMatchingSignatureDocument.Signee;

        Assert.NotNull(personOnBehalfOfOrgSignee.OnBehalfOfOrg);
        Assert.Equal(org.Name, personOnBehalfOfOrgSignee.OnBehalfOfOrg.OrgName);
        Assert.Equal(org.OrgNumber, personOnBehalfOfOrgSignee.OnBehalfOfOrg.OrgNumber);

        SigneeContext signatureWithOnTheFlySigneeContext = result.First(x =>
            x.Signee is PersonSignee personSignee && personSignee.SocialSecurityNumber == person.SSN
        );

        Assert.Equal(instance.Process.CurrentTask.ElementId, signatureWithOnTheFlySigneeContext.TaskId);

        Assert.NotNull(signatureWithOnTheFlySigneeContext);
        Assert.NotNull(signatureWithOnTheFlySigneeContext.SigneeState);
        Assert.True(signatureWithOnTheFlySigneeContext.SigneeState.IsAccessDelegated);

        Assert.NotNull(signatureWithOnTheFlySigneeContext.SignDocument);
        Assert.NotNull(signatureWithOnTheFlySigneeContext.SignDocument?.SigneeInfo);
        Assert.Equal(person.SSN, signatureWithOnTheFlySigneeContext.SignDocument?.SigneeInfo?.PersonNumber);

        Assert.IsType<PersonSignee>(signatureWithOnTheFlySigneeContext.Signee);
        PersonSignee personSigneeOnTheFly = (PersonSignee)signatureWithOnTheFlySigneeContext.Signee;

        Assert.Equal(person.Name, personSigneeOnTheFly.FullName);
        Assert.Equal(person.SSN, personSigneeOnTheFly.SocialSecurityNumber);
    }

    [Fact]
    public async Task AbortRuntimeDelegatedSigning_Removes_SigningData_And_Revokes_Delegation()
    {
        // Arrange
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeStatesDataTypeId = "signeeStates",
            SignatureDataType = "signature",
        };

        var signeeStateDataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = signatureConfiguration.SigneeStatesDataTypeId,
        };

        var signatureDataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = signatureConfiguration.SignatureDataType,
        };

        const string taskId = "task1";
        var instance = new Instance
        {
            Id = new InstanceIdentifier(123, Guid.NewGuid()).ToString(),
            AppId = "ttd/app1",
            InstanceOwner = new InstanceOwner { PartyId = Guid.NewGuid().ToString(), OrganisationNumber = "ttd" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
            Data = [signeeStateDataElement, signatureDataElement],
        };

        var cachedInstanceMutator = new Mock<IInstanceDataMutator>();

        cachedInstanceMutator.Setup(x => x.Instance).Returns(instance);
        cachedInstanceMutator.Setup(x => x.TaskId).Returns(instance.Process.CurrentTask.ElementId);

        var signeeStateDataElementIdentifier = new DataElementIdentifier(signeeStateDataElement.Id);
        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                Signee = new PersonSignee
                {
                    SocialSecurityNumber = "12345678910",
                    FullName = "Name",
                    Party = new Party
                    {
                        PartyId = 1,
                        PartyUuid = Guid.Parse("00000000-0000-0000-0000-000000000399"),
                        Name = "Test Person",
                    },
                },
                SigneeState = new SigneeState { IsAccessDelegated = true },
            },
        };

        var signatureDataElementIdentifier = new DataElementIdentifier(signatureDataElement.Id);
        List<SignDocument> signDocuments =
        [
            new SignDocument { SigneeInfo = new StorageSignee { PersonNumber = "12345678910" } },
        ];

        var signeeContextsWithDocuments = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                Signee = new PersonSignee
                {
                    SocialSecurityNumber = "12345678910",
                    FullName = "Name",
                    Party = new Party
                    {
                        PartyId = 1,
                        PartyUuid = Guid.Parse("00000000-0000-0000-0000-000000000425"),
                        Name = "Test Person",
                    },
                },
                SigneeState = new SigneeState { IsAccessDelegated = true },
                SignDocument = signDocuments[0],
            },
        };

        _signeeContextsManager
            .Setup(x =>
                x.GetSigneeContexts(cachedInstanceMutator.Object, signatureConfiguration, CancellationToken.None)
            )
            .ReturnsAsync(signeeContexts);

        _signDocumentManager
            .Setup(x =>
                x.GetSignDocuments(cachedInstanceMutator.Object, signatureConfiguration, CancellationToken.None)
            )
            .ReturnsAsync(signDocuments);

        _signDocumentManager
            .Setup(x =>
                x.SynchronizeSigneeContextsWithSignDocuments(
                    taskId,
                    signeeContexts,
                    signDocuments,
                    CancellationToken.None
                )
            )
            .ReturnsAsync(signeeContextsWithDocuments);

        _signingDelegationService
            .Setup(x =>
                x.RevokeSigneeRights(
                    taskId,
                    It.IsAny<string>(),
                    It.IsAny<Guid>(),
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<List<SigneeContext>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync((signeeContexts, true));

        _altinnPartyClient
            .Setup(x => x.LookupParty(It.IsAny<PartyLookup>(), It.IsAny<StorageAuthenticationMethod?>()))
            .ReturnsAsync(
                new Party
                {
                    PartyId = 1,
                    PartyUuid = Guid.Parse("00000000-0000-0000-0000-000000000476"),
                    Name = "Test Party",
                }
            );

        // Act
        await _signingService.AbortRuntimeDelegatedSigning(
            cachedInstanceMutator.Object,
            signatureConfiguration,
            CancellationToken.None
        );

        // Assert
        cachedInstanceMutator.Verify(x => x.Instance);
        cachedInstanceMutator.Verify(x => x.TaskId);

        // Verify that the data elements are removed
        cachedInstanceMutator.Verify(x => x.RemoveDataElement(signeeStateDataElement), Times.Once);
        cachedInstanceMutator.Verify(x => x.RemoveDataElement(signatureDataElement), Times.Once);

        cachedInstanceMutator.VerifyNoOtherCalls();

        // Verify that the signee contexts are retrieved and synchronized
        _signeeContextsManager.Verify(
            x => x.GetSigneeContexts(cachedInstanceMutator.Object, signatureConfiguration, CancellationToken.None),
            Times.Once
        );
        _signeeContextsManager.VerifyNoOtherCalls();

        _signDocumentManager.Verify(
            x => x.GetSignDocuments(cachedInstanceMutator.Object, signatureConfiguration, CancellationToken.None),
            Times.Once
        );
        _signDocumentManager.Verify(
            x =>
                x.SynchronizeSigneeContextsWithSignDocuments(
                    taskId,
                    signeeContexts,
                    signDocuments,
                    CancellationToken.None
                ),
            Times.Once
        );
        _signDocumentManager.VerifyNoOtherCalls();

        // Verify that the delegation is revoked
        _signingDelegationService.Verify(x =>
            x.RevokeSigneeRights(
                taskId,
                It.IsAny<string>(),
                It.IsAny<Guid>(),
                It.IsAny<AppIdentifier>(),
                It.IsAny<List<SigneeContext>>(),
                It.IsAny<CancellationToken>()
            )
        );
        _signingDelegationService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task AbortRuntimeDelegatedSigning_Revokes_Delegation_Before_Removing_SigningData()
    {
        // Arrange
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeStatesDataTypeId = "signeeStates",
            SignatureDataType = "signature",
        };

        var signeeStateDataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = signatureConfiguration.SigneeStatesDataTypeId,
        };

        var signatureDataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = signatureConfiguration.SignatureDataType,
        };

        const string taskId = "task1";
        var instance = new Instance
        {
            Id = new InstanceIdentifier(123, Guid.NewGuid()).ToString(),
            AppId = "ttd/app1",
            InstanceOwner = new InstanceOwner { PartyId = Guid.NewGuid().ToString(), OrganisationNumber = "ttd" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
            Data = [signeeStateDataElement, signatureDataElement],
        };

        // Strict, so that a call made out of turn relative to the `MockSequence` below
        // (i.e. cleanup running before revocation reads signee state) throws instead of silently no-oping.
        var cachedInstanceMutator = new Mock<IInstanceDataMutator>(MockBehavior.Strict);

        cachedInstanceMutator.Setup(x => x.Instance).Returns(instance);
        cachedInstanceMutator.Setup(x => x.TaskId).Returns(instance.Process.CurrentTask.ElementId);

        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                Signee = new PersonSignee
                {
                    SocialSecurityNumber = "12345678910",
                    FullName = "Name",
                    Party = new Party
                    {
                        PartyId = 1,
                        PartyUuid = Guid.Parse("00000000-0000-0000-0000-000000000586"),
                        Name = "Test Person",
                    },
                },
                SigneeState = new SigneeState { IsAccessDelegated = true },
            },
        };

        List<SignDocument> signDocuments =
        [
            new SignDocument { SigneeInfo = new StorageSignee { PersonNumber = "12345678910" } },
        ];

        var signeeContextsWithDocuments = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                Signee = new PersonSignee
                {
                    SocialSecurityNumber = "12345678910",
                    FullName = "Name",
                    Party = new Party
                    {
                        PartyId = 1,
                        PartyUuid = Guid.Parse("00000000-0000-0000-0000-000000000611"),
                        Name = "Test Person",
                    },
                },
                SigneeState = new SigneeState { IsAccessDelegated = true },
                SignDocument = signDocuments[0],
            },
        };

        _signeeContextsManager
            .Setup(x =>
                x.GetSigneeContexts(cachedInstanceMutator.Object, signatureConfiguration, CancellationToken.None)
            )
            .ReturnsAsync(signeeContexts);

        _signDocumentManager
            .Setup(x =>
                x.GetSignDocuments(cachedInstanceMutator.Object, signatureConfiguration, CancellationToken.None)
            )
            .ReturnsAsync(signDocuments);

        _signDocumentManager
            .Setup(x =>
                x.SynchronizeSigneeContextsWithSignDocuments(
                    taskId,
                    signeeContexts,
                    signDocuments,
                    CancellationToken.None
                )
            )
            .ReturnsAsync(signeeContextsWithDocuments);

        _altinnPartyClient
            .Setup(x => x.LookupParty(It.IsAny<PartyLookup>()))
            .ReturnsAsync(
                new Party
                {
                    PartyId = 1,
                    PartyUuid = Guid.Parse("00000000-0000-0000-0000-000000000649"),
                    Name = "Test Party",
                }
            );

        // Asserts call order across mocks: revocation must read signee state (position 0)
        // before the signee state / signature data elements are removed (positions 1 and 2).
        // Since `cachedInstanceMutator` is Strict, a call made before its turn has no matching
        // setup and throws, failing the test.
        var sequence = new MockSequence();

        _signingDelegationService
            .InSequence(sequence)
            .Setup(x =>
                x.RevokeSigneeRights(
                    taskId,
                    It.IsAny<string>(),
                    It.IsAny<Guid>(),
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<List<SigneeContext>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync((signeeContexts, true));

        cachedInstanceMutator.InSequence(sequence).Setup(x => x.RemoveDataElement(signeeStateDataElement));
        cachedInstanceMutator.InSequence(sequence).Setup(x => x.RemoveDataElement(signatureDataElement));

        // Act
        await _signingService.AbortRuntimeDelegatedSigning(
            cachedInstanceMutator.Object,
            signatureConfiguration,
            CancellationToken.None
        );

        // Assert
        _signingDelegationService.Verify(
            x =>
                x.RevokeSigneeRights(
                    taskId,
                    It.IsAny<string>(),
                    It.IsAny<Guid>(),
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<List<SigneeContext>>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );

        cachedInstanceMutator.Verify(x => x.RemoveDataElement(signeeStateDataElement), Times.Once);
        cachedInstanceMutator.Verify(x => x.RemoveDataElement(signatureDataElement), Times.Once);
    }

    [Fact]
    public async Task RevokeSigneeRightsOnTaskEnd_Revokes_Delegation_Without_Removing_SigningData()
    {
        // Arrange
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeStatesDataTypeId = "signeeStates",
            SignatureDataType = "signature",
        };

        var signeeStateDataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = signatureConfiguration.SigneeStatesDataTypeId,
        };

        var signatureDataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = signatureConfiguration.SignatureDataType,
        };

        const string taskId = "task1";
        var instance = new Instance
        {
            Id = new InstanceIdentifier(123, Guid.NewGuid()).ToString(),
            AppId = "ttd/app1",
            InstanceOwner = new InstanceOwner { PartyId = Guid.NewGuid().ToString(), OrganisationNumber = "ttd" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
            Data = [signeeStateDataElement, signatureDataElement],
        };

        var cachedInstanceMutator = new Mock<IInstanceDataMutator>();

        cachedInstanceMutator.Setup(x => x.Instance).Returns(instance);
        cachedInstanceMutator.Setup(x => x.TaskId).Returns(instance.Process.CurrentTask.ElementId);

        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                Signee = new PersonSignee
                {
                    SocialSecurityNumber = "12345678910",
                    FullName = "Name",
                    Party = new Party
                    {
                        PartyId = 1,
                        PartyUuid = Guid.Parse("00000000-0000-0000-0000-000000000751"),
                        Name = "Test Person",
                    },
                },
                SigneeState = new SigneeState { IsAccessDelegated = true },
            },
        };

        List<SignDocument> signDocuments =
        [
            new SignDocument { SigneeInfo = new StorageSignee { PersonNumber = "12345678910" } },
        ];

        var signeeContextsWithDocuments = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                Signee = new PersonSignee
                {
                    SocialSecurityNumber = "12345678910",
                    FullName = "Name",
                    Party = new Party
                    {
                        PartyId = 1,
                        PartyUuid = Guid.Parse("00000000-0000-0000-0000-000000000776"),
                        Name = "Test Person",
                    },
                },
                SigneeState = new SigneeState { IsAccessDelegated = true },
                SignDocument = signDocuments[0],
            },
        };

        _signeeContextsManager
            .Setup(x =>
                x.GetSigneeContexts(cachedInstanceMutator.Object, signatureConfiguration, CancellationToken.None)
            )
            .ReturnsAsync(signeeContexts);

        _signDocumentManager
            .Setup(x =>
                x.GetSignDocuments(cachedInstanceMutator.Object, signatureConfiguration, CancellationToken.None)
            )
            .ReturnsAsync(signDocuments);

        _signDocumentManager
            .Setup(x =>
                x.SynchronizeSigneeContextsWithSignDocuments(
                    taskId,
                    signeeContexts,
                    signDocuments,
                    CancellationToken.None
                )
            )
            .ReturnsAsync(signeeContextsWithDocuments);

        Guid instanceOwnerPartyUuid = Guid.Parse("00000000-0000-0000-0000-000000000808");

        _signingDelegationService
            .Setup(x =>
                x.RevokeSigneeRights(
                    taskId,
                    instance.Id,
                    instanceOwnerPartyUuid,
                    It.Is<AppIdentifier>(a => a.Org == "ttd" && a.App == "app1"),
                    signeeContextsWithDocuments,
                    CancellationToken.None
                )
            )
            .ReturnsAsync((signeeContextsWithDocuments, true));

        _altinnPartyClient
            .Setup(x => x.LookupParty(It.IsAny<PartyLookup>()))
            .ReturnsAsync(
                new Party
                {
                    PartyId = 1,
                    PartyUuid = instanceOwnerPartyUuid,
                    Name = "Test Party",
                }
            );

        // Act
        await _signingService.RevokeSigneeRightsOnTaskEnd(
            cachedInstanceMutator.Object,
            signatureConfiguration,
            CancellationToken.None
        );

        // Assert
        cachedInstanceMutator.Verify(x => x.Instance);
        cachedInstanceMutator.Verify(x => x.TaskId);

        // The signing data (signee state and signatures) must be left untouched - only the delegated rights are revoked
        cachedInstanceMutator.VerifyNoOtherCalls();

        _signingDelegationService.Verify(
            x =>
                x.RevokeSigneeRights(
                    taskId,
                    instance.Id,
                    instanceOwnerPartyUuid,
                    It.IsAny<AppIdentifier>(),
                    signeeContextsWithDocuments,
                    CancellationToken.None
                ),
            Times.Once
        );
        _signingDelegationService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task RevokeSigneeRightsOnTaskEnd_Revokes_Delegation_When_ProcessHasMovedPastTheTask()
    {
        // Arrange
        // Simulates the state of `instance` when SigningProcessTask.End runs as the last task in the process:
        // by the time the end-task event is handled, instance.Process.CurrentTask has already been
        // cleared (process moved to the end event), so the task ID can only be read from TaskId.
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeStatesDataTypeId = "signeeStates",
            SignatureDataType = "signature",
        };

        var signeeStateDataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = signatureConfiguration.SigneeStatesDataTypeId,
        };

        var signatureDataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = signatureConfiguration.SignatureDataType,
        };

        const string taskId = "task1";
        var instance = new Instance
        {
            Id = new InstanceIdentifier(123, Guid.NewGuid()).ToString(),
            AppId = "ttd/app1",
            InstanceOwner = new InstanceOwner { PartyId = Guid.NewGuid().ToString(), OrganisationNumber = "ttd" },
            Process = new ProcessState
            {
                CurrentTask = null,
                EndEvent = "EndEvent",
                Ended = DateTime.UtcNow,
            },
            Data = [signeeStateDataElement, signatureDataElement],
        };

        var cachedInstanceMutator = new Mock<IInstanceDataMutator>();

        cachedInstanceMutator.Setup(x => x.Instance).Returns(instance);
        cachedInstanceMutator.Setup(x => x.TaskId).Returns(taskId);

        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                Signee = new PersonSignee
                {
                    SocialSecurityNumber = "12345678910",
                    FullName = "Name",
                    Party = new Party
                    {
                        PartyId = 1,
                        PartyUuid = Guid.Parse("00000000-0000-0000-0000-000000000920"),
                        Name = "Test Person",
                    },
                },
                SigneeState = new SigneeState { IsAccessDelegated = true },
            },
        };

        List<SignDocument> signDocuments =
        [
            new SignDocument { SigneeInfo = new StorageSignee { PersonNumber = "12345678910" } },
        ];

        var signeeContextsWithDocuments = new List<SigneeContext>()
        {
            new()
            {
                TaskId = taskId,
                Signee = new PersonSignee
                {
                    SocialSecurityNumber = "12345678910",
                    FullName = "Name",
                    Party = new Party
                    {
                        PartyId = 1,
                        PartyUuid = Guid.Parse("00000000-0000-0000-0000-000000000945"),
                        Name = "Test Person",
                    },
                },
                SigneeState = new SigneeState { IsAccessDelegated = true },
                SignDocument = signDocuments[0],
            },
        };

        _signeeContextsManager
            .Setup(x =>
                x.GetSigneeContexts(cachedInstanceMutator.Object, signatureConfiguration, CancellationToken.None)
            )
            .ReturnsAsync(signeeContexts);

        _signDocumentManager
            .Setup(x =>
                x.GetSignDocuments(cachedInstanceMutator.Object, signatureConfiguration, CancellationToken.None)
            )
            .ReturnsAsync(signDocuments);

        _signDocumentManager
            .Setup(x =>
                x.SynchronizeSigneeContextsWithSignDocuments(
                    taskId,
                    signeeContexts,
                    signDocuments,
                    CancellationToken.None
                )
            )
            .ReturnsAsync(signeeContextsWithDocuments);

        Guid instanceOwnerPartyUuid = Guid.Parse("00000000-0000-0000-0000-000000000977");

        _signingDelegationService
            .Setup(x =>
                x.RevokeSigneeRights(
                    taskId,
                    instance.Id,
                    instanceOwnerPartyUuid,
                    It.Is<AppIdentifier>(a => a.Org == "ttd" && a.App == "app1"),
                    signeeContextsWithDocuments,
                    CancellationToken.None
                )
            )
            .ReturnsAsync((signeeContextsWithDocuments, true));

        _altinnPartyClient
            .Setup(x => x.LookupParty(It.IsAny<PartyLookup>()))
            .ReturnsAsync(
                new Party
                {
                    PartyId = 1,
                    PartyUuid = instanceOwnerPartyUuid,
                    Name = "Test Party",
                }
            );

        // Act
        await _signingService.RevokeSigneeRightsOnTaskEnd(
            cachedInstanceMutator.Object,
            signatureConfiguration,
            CancellationToken.None
        );

        // Assert
        cachedInstanceMutator.Verify(x => x.Instance);
        cachedInstanceMutator.Verify(x => x.TaskId);

        // The signing data (signee state and signatures) must be left untouched - only the delegated rights are revoked
        cachedInstanceMutator.VerifyNoOtherCalls();
        _signingDelegationService.Verify(
            x =>
                x.RevokeSigneeRights(
                    taskId,
                    instance.Id,
                    instanceOwnerPartyUuid,
                    It.IsAny<AppIdentifier>(),
                    signeeContextsWithDocuments,
                    CancellationToken.None
                ),
            Times.Once
        );
        _signingDelegationService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task RevokeSigneeRightsOnTaskEnd_Does_Nothing_If_No_Delegated_Access()
    {
        // Arrange
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeStatesDataTypeId = "signeeStates",
            SignatureDataType = "signature",
        };

        var cachedInstanceMutator = new Mock<IInstanceDataMutator>();
        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "task1" } },
            Data = [],
        };
        cachedInstanceMutator.Setup(x => x.Instance).Returns(instance);
        cachedInstanceMutator.Setup(x => x.TaskId).Returns(instance.Process.CurrentTask.ElementId);

        _signDocumentManager
            .Setup(x =>
                x.GetSignDocuments(cachedInstanceMutator.Object, signatureConfiguration, CancellationToken.None)
            )
            .ReturnsAsync([]);
        _signDocumentManager
            .Setup(x =>
                x.SynchronizeSigneeContextsWithSignDocuments(
                    instance.Process.CurrentTask.ElementId,
                    It.IsAny<List<SigneeContext>>(),
                    It.IsAny<List<SignDocument>>(),
                    CancellationToken.None
                )
            )
            .ReturnsAsync([]);

        _signeeContextsManager
            .Setup(x =>
                x.GetSigneeContexts(cachedInstanceMutator.Object, signatureConfiguration, CancellationToken.None)
            )
            .ReturnsAsync([]);

        // Act
        await _signingService.RevokeSigneeRightsOnTaskEnd(
            cachedInstanceMutator.Object,
            signatureConfiguration,
            CancellationToken.None
        );

        // Assert
        // TaskId alone is enough to determine the task ID, so Instance is never accessed.
        cachedInstanceMutator.Verify(x => x.TaskId, Times.AtLeastOnce);
        cachedInstanceMutator.VerifyNoOtherCalls();

        _signingDelegationService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task AbortRuntimeDelegatedSigning_Does_Nothing_If_No_Existing_Data()
    {
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeStatesDataTypeId = "signeeStates",
            SignatureDataType = "signature",
        };

        var cachedInstanceMutator = new Mock<IInstanceDataMutator>();
        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "task1" } },
            Data = [],
        };
        cachedInstanceMutator.Setup(x => x.Instance).Returns(instance);
        cachedInstanceMutator.Setup(x => x.TaskId).Returns(instance.Process.CurrentTask.ElementId);

        _signDocumentManager
            .Setup(x =>
                x.GetSignDocuments(cachedInstanceMutator.Object, signatureConfiguration, CancellationToken.None)
            )
            .ReturnsAsync([]);
        _signDocumentManager
            .Setup(x =>
                x.SynchronizeSigneeContextsWithSignDocuments(
                    instance.Process.CurrentTask.ElementId,
                    It.IsAny<List<SigneeContext>>(),
                    It.IsAny<List<SignDocument>>(),
                    CancellationToken.None
                )
            )
            .ReturnsAsync([]);

        _signeeContextsManager
            .Setup(x =>
                x.GetSigneeContexts(cachedInstanceMutator.Object, signatureConfiguration, CancellationToken.None)
            )
            .ReturnsAsync([]);

        await _signingService.AbortRuntimeDelegatedSigning(
            cachedInstanceMutator.Object,
            signatureConfiguration,
            CancellationToken.None
        );

        cachedInstanceMutator.Verify(x => x.Instance);
        cachedInstanceMutator.Verify(x => x.TaskId);
        cachedInstanceMutator.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task GetAuthorizedOrganizations_Returns_Organizations_With_Authorization()
    {
        // Arrange
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeStatesDataTypeId = "signeeStates",
            SignatureDataType = "signature",
        };

        var instance = new Instance
        {
            Id = new InstanceIdentifier(123, Guid.NewGuid()).ToString(),
            AppId = "ttd/app1",
            InstanceOwner = new InstanceOwner { PartyId = Guid.NewGuid().ToString(), OrganisationNumber = "ttd" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "taskId" } },
            Data = [new() { Id = Guid.NewGuid().ToString(), DataType = "signeeStates" }],
        };

        var cachedInstanceMutator = new Mock<IInstanceDataMutator>();
        cachedInstanceMutator.Setup(x => x.Instance).Returns(instance);

        var signeeContexts = new List<SigneeContext>()
        {
            new()
            {
                TaskId = "taskId",
                Signee = new OrganizationSignee
                {
                    OrgNumber = "123456789",
                    OrgName = "An org",
                    OrgParty = new Party
                    {
                        PartyId = 1,
                        PartyUuid = Guid.Parse("00000000-0000-0000-0000-000000001172"),
                        OrgNumber = "123456789",
                        Name = "An org",
                    },
                },
                SigneeState = new SigneeState { IsAccessDelegated = true },
            },
        };

        _signeeContextsManager
            .Setup(x =>
                x.GetSigneeContexts(cachedInstanceMutator.Object, signatureConfiguration, CancellationToken.None)
            )
            .ReturnsAsync(signeeContexts);

        List<string> orgNrs = ["123456789", "555555555"];

        _authorizationClient
            .Setup(x => x.GetKeyRoleOrganizationParties(123, It.IsAny<List<string>>()))
            .ReturnsAsync(orgNrs);

        // Act
        var result = await _signingService.GetAuthorizedOrganizationSignees(
            cachedInstanceMutator.Object,
            signatureConfiguration,
            123,
            CancellationToken.None
        );

        // Assert
        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal("123456789", result[0].OrgNumber);
        Assert.Equal("An org", result[0].OrgName);
    }

    [Fact]
    public async Task InitializeSignees_MissingSigneeStatesDataTypeId_ThrowsApplicationConfigException()
    {
        // Arrange
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeStatesDataTypeId = null, // Missing required configuration
            SignatureDataType = "signature",
        };

        var cachedInstanceMutator = new Mock<IInstanceDataMutator>();
        var instance = new Instance
        {
            Id = "123/abc",
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
            Data = [],
        };
        cachedInstanceMutator.Setup(x => x.Instance).Returns(instance);

        List<SigneeContext> signeeContexts = [];

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            _signingService.InitializeSignees(
                cachedInstanceMutator.Object,
                signeeContexts,
                signatureConfiguration,
                CancellationToken.None
            )
        );

        Assert.Contains("SigneeStatesDataTypeId is not set", exception.Message);
    }

    [Fact]
    public async Task InitializeSignees_StoresSigneeStatesTaggedWithGeneratedFromTask()
    {
        // Signee states are tagged with the signing task so re-entry cleanup owns their lifecycle.
        // Creating the tagged element during task START is safe: Storage's stale-data cleanup is
        // timestamp-guarded and spares elements created by the in-flight transition.
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeStatesDataTypeId = "signeeStates",
            SignatureDataType = "signature",
        };

        var cachedInstanceMutator = new Mock<IInstanceDataMutator>(MockBehavior.Strict);
        var instance = new Instance
        {
            Id = "123/abc",
            AppId = "ttd/app1",
            InstanceOwner = new InstanceOwner { PartyId = "123" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
            Data = [],
        };
        List<SigneeContext> signeeContexts = [];
        var applicationMetadata = new ApplicationMetadata("ttd/app")
        {
            DataTypes = [new DataType { Id = "signeeStates", ActionRequiredToRead = "restricted-read" }],
        };

        cachedInstanceMutator.Setup(x => x.Instance).Returns(instance);
        cachedInstanceMutator.Setup(x =>
            x.OverrideAuthenticationMethod(
                It.Is<DataType>(dataType => dataType.Id == "signeeStates"),
                It.IsAny<StorageAuthenticationMethod>()
            )
        );
        cachedInstanceMutator
            .Setup(x =>
                x.AddBinaryDataElement(
                    "signeeStates",
                    "application/json",
                    null,
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    "Task_1",
                    null
                )
            )
            .Returns(
                new BinaryDataChange(
                    ChangeType.Created,
                    new DataType { Id = "signeeStates" },
                    "application/json",
                    null,
                    null,
                    ReadOnlyMemory<byte>.Empty,
                    "Task_1"
                )
            );
        _appMetadata.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);
        _signingDelegationService
            .Setup(x =>
                x.DelegateSigneeRights(
                    "Task_1",
                    "123/abc",
                    It.IsAny<Guid?>(),
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<List<SigneeContext>>(),
                    CancellationToken.None
                )
            )
            .ReturnsAsync((signeeContexts, false));

        List<SigneeContext> result = await _signingService.InitializeSignees(
            cachedInstanceMutator.Object,
            signeeContexts,
            signatureConfiguration,
            CancellationToken.None
        );

        Assert.Same(signeeContexts, result);
        cachedInstanceMutator.VerifyAll();
        _appMetadata.VerifyAll();
    }

    [Fact]
    public async Task GetInstanceOwnerParty_WithTtdOrganization_UsesDigitaliseringsdirektoratetOrgNumber()
    {
        // Arrange
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeStatesDataTypeId = "signeeStates",
            SignatureDataType = "signature",
        };

        var cachedInstanceMutator = new Mock<IInstanceDataMutator>();
        var instance = new Instance
        {
            Id = "123/abc",
            AppId = "ttd/app1",
            InstanceOwner = new InstanceOwner { PartyId = "123", OrganisationNumber = "ttd" }, // ttd organization
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
            Data = [],
        };
        cachedInstanceMutator.Setup(x => x.Instance).Returns(instance);
        _signeeContextsManager
            .Setup(x =>
                x.GetSigneeContexts(cachedInstanceMutator.Object, signatureConfiguration, CancellationToken.None)
            )
            .ReturnsAsync([]);
        _signDocumentManager
            .Setup(x =>
                x.GetSignDocuments(cachedInstanceMutator.Object, signatureConfiguration, CancellationToken.None)
            )
            .ReturnsAsync([]);
        _signDocumentManager
            .Setup(x =>
                x.SynchronizeSigneeContextsWithSignDocuments(
                    instance.Process.CurrentTask.ElementId,
                    It.IsAny<List<SigneeContext>>(),
                    It.IsAny<List<SignDocument>>(),
                    CancellationToken.None
                )
            )
            .ReturnsAsync([]);

        // Act
        await _signingService.AbortRuntimeDelegatedSigning(
            cachedInstanceMutator.Object,
            signatureConfiguration,
            CancellationToken.None
        );

        // Assert
        _altinnPartyClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task GetServiceOwnerParty_OrgTtd_ReturnsDigdir()
    {
        // Arrange
        var orgDetails = new AltinnCdnOrgDetails
        {
            Name = new AltinnCdnOrgName
            {
                Nb = "Digitaliseringsdirektoratet",
                Nn = "Digitaliseringsdirektoratet",
                En = "Norwegian Digitalisation Agency",
            },
            Logo = "https://altinncdn.no/orgs/digdir/digdir.png",
            Orgnr = "991825827",
            Homepage = "https://www.digdir.no/",
            Environments = ["tt02", "production"],
        };

        _altinnCdnClient.Setup(x => x.GetOrgDetails(It.IsAny<CancellationToken>())).ReturnsAsync(orgDetails);

        _appMetadata
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("ttd/app") { Org = "ttd" });

        _altinnPartyClient
            .Setup(x =>
                x.LookupParty(It.Is<PartyLookup>(p => p.OrgNo == "991825827"), It.IsAny<StorageAuthenticationMethod?>())
            )
            .ReturnsAsync(
                new Party
                {
                    PartyId = 1,
                    PartyUuid = Guid.Parse("00000000-0000-0000-0000-000000001408"),
                    Name = "Digitaliseringsdirektoratet",
                    OrgNumber = "991825827",
                    PartyTypeName = PartyType.Organisation,
                }
            );

        // Act
        (var result, bool success) = await _signingService.GetServiceOwnerParty(CancellationToken.None);

        // Assert
        Assert.True(success);
        Assert.NotNull(result);
        Assert.Equal("Digitaliseringsdirektoratet", result.Name);
        Assert.Equal("991825827", result.OrgNumber);
    }

    [Fact]
    public async Task AbortRuntimeDelegatedSigning_WithExceptionInPartyLookup_LogsErrorAndContinues()
    {
        // Arrange
        var signatureConfiguration = new AltinnSignatureConfiguration
        {
            SigneeStatesDataTypeId = "signeeStates",
            SignatureDataType = "signature",
        };

        var signeeStateDataElement = new DataElement { Id = Guid.NewGuid().ToString(), DataType = "signeeStates" };

        var signatureDataElement = new DataElement { Id = Guid.NewGuid().ToString(), DataType = "signature" };

        var cachedInstanceMutator = new Mock<IInstanceDataMutator>();
        var instance = new Instance
        {
            Id = "123/abc",
            AppId = "ttd/app1",
            InstanceOwner = new InstanceOwner { PartyId = "123", OrganisationNumber = "org123" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
            Data = [signeeStateDataElement, signatureDataElement],
        };
        cachedInstanceMutator.Setup(x => x.Instance).Returns(instance);

        // We need to return an empty list to avoid the test trying to revoke delegation rights
        _signeeContextsManager
            .Setup(x =>
                x.GetSigneeContexts(cachedInstanceMutator.Object, signatureConfiguration, CancellationToken.None)
            )
            .ReturnsAsync([]);
        // Mock the GetBinaryData method to return valid JSON for the signature data element
        var signDocument = new SignDocument { SigneeInfo = new StorageSignee { PersonNumber = "12345678910" } };
        _signDocumentManager
            .Setup(x =>
                x.GetSignDocuments(cachedInstanceMutator.Object, signatureConfiguration, CancellationToken.None)
            )
            .ReturnsAsync([signDocument]);
        _signDocumentManager
            .Setup(x =>
                x.SynchronizeSigneeContextsWithSignDocuments(
                    instance.Process.CurrentTask.ElementId,
                    It.IsAny<List<SigneeContext>>(),
                    It.IsAny<List<SignDocument>>(),
                    CancellationToken.None
                )
            )
            .ReturnsAsync([
                new SigneeContext
                {
                    TaskId = "Task_1",
                    SignDocument = signDocument,
                    SigneeState = new SigneeState { IsAccessDelegated = true },
                    Signee = new PersonSignee
                    {
                        FullName = "Test Person",
                        Party = new Party
                        {
                            PartyId = 1,
                            PartyUuid = Guid.Parse("00000000-0000-0000-0000-000000001484"),
                            Name = "Test Person",
                        },
                        SocialSecurityNumber = "12345678910",
                    },
                },
            ]);

        // Setup to throw exception during party lookup
        _altinnPartyClient.Reset();
        _altinnPartyClient
            .Setup(x => x.LookupParty(It.IsAny<PartyLookup>(), It.IsAny<StorageAuthenticationMethod?>()))
            .ThrowsAsync(new Exception("Party lookup failed"));

        // Act
        // Revocation failure must not throw - it should be logged and the process should continue.
        await _signingService.AbortRuntimeDelegatedSigning(
            cachedInstanceMutator.Object,
            signatureConfiguration,
            CancellationToken.None
        );

        // Assert
        _logger.Verify(
            x =>
                x.Log(
                    LogLevel.Error,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => true),
                    It.IsAny<Exception>(),
                    It.Is<Func<It.IsAnyType, Exception?, string>>((v, t) => true)
                ),
            Times.AtLeastOnce
        );

        // Cleanup must still happen even though revocation failed.
        cachedInstanceMutator.Verify(x => x.RemoveDataElement(signeeStateDataElement), Times.Once);
        cachedInstanceMutator.Verify(x => x.RemoveDataElement(signatureDataElement), Times.Once);
    }
}
