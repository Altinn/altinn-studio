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
using Altinn.Platform.Register.Enums;
using Altinn.Platform.Register.Models;
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
            .Setup(x => x.LookupParty(It.IsAny<PartyLookup>()))
            .ReturnsAsync(
                (PartyLookup lookup) =>
                {
                    return lookup.Ssn is not null
                        ? new Party { SSN = lookup.Ssn }
                        : new Party { OrgNumber = lookup.OrgNo };
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
                    Party = new Party { SSN = person.SSN, Name = person.Name },
                    OnBehalfOfOrg = new OrganizationSignee
                    {
                        OrgName = org.Name,
                        OrgNumber = org.OrgNumber,
                        OrgParty = new Party { Name = org.Name, OrgNumber = org.OrgNumber },
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
                    Party = new Party { SSN = person.SSN, Name = person.Name },
                    OnBehalfOfOrg = new OrganizationSignee
                    {
                        OrgName = org.Name,
                        OrgNumber = org.OrgNumber,
                        OrgParty = new Party { Name = org.Name, OrgNumber = org.OrgNumber },
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
                    Party = new Party { SSN = person.SSN, Name = person.Name },
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
            .Setup(x => x.LookupParty(It.IsAny<PartyLookup>()))
            .ReturnsAsync(
                (PartyLookup lookup) =>
                {
                    return lookup.Ssn is not null
                        ? new Party { SSN = lookup.Ssn, Name = "A person" }
                        : new Party
                        {
                            OrgNumber = lookup.OrgNo,
                            Organization = new Organization { Name = "An organization", OrgNumber = lookup.OrgNo },
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
                    Party = new Party(),
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
                    Party = new Party(),
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
            .Setup(x => x.LookupParty(It.IsAny<PartyLookup>()))
            .ReturnsAsync(new Party { PartyUuid = Guid.NewGuid() });

        // Act
        await _signingService.AbortRuntimeDelegatedSigning(
            cachedInstanceMutator.Object,
            signatureConfiguration,
            CancellationToken.None
        );

        // Assert
        cachedInstanceMutator.Verify(x => x.Instance);

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
                    OrgParty = new Party { OrgNumber = "123456789", Name = "An org" },
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
        var orgs = new Dictionary<string, AltinnCdnOrgDetails>
        {
            {
                "ttd",
                new AltinnCdnOrgDetails
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
                }
            },
        };

        var altinnCdnOrgs = new AltinnCdnOrgs { Orgs = orgs };

        _altinnCdnClient.Setup(x => x.GetOrgs(It.IsAny<CancellationToken>())).Returns(Task.FromResult(altinnCdnOrgs));

        _appMetadata
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("ttd/app") { Org = "ttd" });

        _altinnPartyClient
            .Setup(x => x.LookupParty(It.Is<PartyLookup>(p => p.OrgNo == "991825827")))
            .ReturnsAsync(
                new Party
                {
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
    public async Task AbortRuntimeDelegatedSigning_WithExceptionInPartyLookup_LogsErrorAndThrowsException()
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
            .ReturnsAsync(
                [
                    new SigneeContext
                    {
                        TaskId = "Task_1",
                        SignDocument = signDocument,
                        SigneeState = new SigneeState { IsAccessDelegated = true },
                        Signee = new PersonSignee
                        {
                            FullName = "Test Person",
                            Party = new Party(),
                            SocialSecurityNumber = "12345678910",
                        },
                    },
                ]
            );

        // Setup to throw exception during party lookup
        _altinnPartyClient.Reset();
        _altinnPartyClient
            .Setup(x => x.LookupParty(It.IsAny<PartyLookup>()))
            .ThrowsAsync(new Exception("Party lookup failed"));

        // Act & Assert
        var exception = await Assert.ThrowsAsync<SigningException>(() =>
            _signingService.AbortRuntimeDelegatedSigning(
                cachedInstanceMutator.Object,
                signatureConfiguration,
                CancellationToken.None
            )
        );

        Assert.Contains("Failed to lookup party information for instance owner.", exception.Message);
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
    }
}
