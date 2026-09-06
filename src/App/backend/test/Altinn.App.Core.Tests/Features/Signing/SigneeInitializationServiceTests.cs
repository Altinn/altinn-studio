using System.Net;
using Altinn.App.Core.Exceptions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Correspondence.Exceptions;
using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Features.Signing.Exceptions;
using Altinn.App.Core.Features.Signing.Helpers;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.AltinnCdn;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;
using static Altinn.App.Core.Features.Signing.Models.Signee;
using SigneeState = Altinn.App.Core.Features.Signing.Models.SigneeContextState;

namespace Altinn.App.Core.Tests.Features.Signing;

public sealed class SigneeInitializationServiceTests
{
    private const string TaskId = "Task_1";

    private readonly Mock<ISigneeContextsManager> _signeeContextsManager = new(MockBehavior.Strict);
    private readonly Mock<ISigningDelegationService> _signingDelegationService = new(MockBehavior.Strict);
    private readonly Mock<ISigningCallToActionService> _signingCallToActionService = new(MockBehavior.Strict);
    private readonly Mock<IAltinnPartyClient> _altinnPartyClient = new(MockBehavior.Strict);
    private readonly Mock<IAltinnCdnClient> _altinnCdnClient = new(MockBehavior.Strict);
    private readonly Mock<IHostEnvironment> _hostEnvironment = new(MockBehavior.Strict);
    private readonly Mock<ILogger<SigneeInitializationService>> _logger = new();

    private static OrganizationNumber GetOrgNumber(int index) =>
        IdentificationNumberProvider.OrganizationNumbers.GetValidNumber(index);

    private SigneeInitializationService CreateService() =>
        new(
            _signeeContextsManager.Object,
            _signingDelegationService.Object,
            _signingCallToActionService.Object,
            _altinnPartyClient.Object,
            _altinnCdnClient.Object,
            _hostEnvironment.Object,
            _logger.Object
        );

    private static AltinnSignatureConfiguration CreateSignatureConfiguration() =>
        new() { SigneeStatesDataTypeId = "signeeStates", SignatureDataType = "signature" };

    private static Instance CreateInstance(
        string taskId = TaskId,
        string? orgNumber = "123456789",
        string? personNumber = null,
        string instanceId = "1000/11111111-1111-1111-1111-111111111111",
        string appId = "ttd/app1"
    ) =>
        new()
        {
            Id = instanceId,
            AppId = appId,
            InstanceOwner = new InstanceOwner
            {
                PartyId = "500",
                OrganisationNumber = orgNumber,
                PersonNumber = personNumber,
            },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
            Data = [],
        };

    private static Mock<IInstanceDataMutator> CreateInstanceDataMutator(Instance instance)
    {
        Mock<IInstanceDataMutator> mutator = new();
        mutator.Setup(x => x.Instance).Returns(instance);
        return mutator;
    }

    private static DataElement CreateSigneeStateElement(AltinnSignatureConfiguration config) =>
        new() { Id = Guid.NewGuid().ToString(), DataType = config.SigneeStatesDataTypeId };

    private static SigneeContext CreateSigneeContext(
        Guid partyUuid,
        string taskId = TaskId,
        bool isAccessDelegated = false,
        bool hasBeenMessaged = false
    ) =>
        new()
        {
            TaskId = taskId,
            Signee = new PersonSignee
            {
                SocialSecurityNumber = "12345678910",
                FullName = "A Person",
                Party = new Party
                {
                    PartyUuid = partyUuid,
                    PartyId = Random.Shared.Next(1, int.MaxValue),
                    SSN = "12345678910",
                    Name = "A Person",
                },
            },
            SigneeState = new SigneeState
            {
                IsAccessDelegated = isAccessDelegated,
                HasBeenMessagedForCallToSign = hasBeenMessaged,
            },
        };

    #region ResolveSignees

    [Fact]
    public async Task ResolveSignees_ExistingTaggedElementFound_ReturnsCompletedWithoutGeneratingOrPersisting()
    {
        AltinnSignatureConfiguration config = CreateSignatureConfiguration();
        Mock<IInstanceDataMutator> mutator = CreateInstanceDataMutator(CreateInstance());
        DataElement existing = CreateSigneeStateElement(config);

        _signeeContextsManager
            .Setup(x => x.FindTaskSigneeStateElement(mutator.Object, config, TaskId))
            .Returns(existing);

        SigneeInitializationService service = CreateService();

        SigneeInitializationOutcome outcome = await service.ResolveSignees(
            mutator.Object,
            config,
            TaskId,
            CancellationToken.None
        );

        Assert.IsType<SigneeInitializationOutcome.Completed>(outcome);
        _signeeContextsManager.Verify(x => x.FindTaskSigneeStateElement(mutator.Object, config, TaskId), Times.Once);
        _signeeContextsManager.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ResolveSignees_NoneLocallyButAdoptedFromStorage_ReturnsCompletedWithoutGenerating()
    {
        AltinnSignatureConfiguration config = CreateSignatureConfiguration();
        Mock<IInstanceDataMutator> mutator = CreateInstanceDataMutator(CreateInstance());
        DataElement adopted = CreateSigneeStateElement(config);

        _signeeContextsManager
            .Setup(x => x.FindTaskSigneeStateElement(mutator.Object, config, TaskId))
            .Returns((DataElement?)null);
        _signeeContextsManager
            .Setup(x =>
                x.AdoptTaskSigneeStateElementFromStorage(mutator.Object, config, TaskId, CancellationToken.None)
            )
            .ReturnsAsync(adopted);

        SigneeInitializationService service = CreateService();

        SigneeInitializationOutcome outcome = await service.ResolveSignees(
            mutator.Object,
            config,
            TaskId,
            CancellationToken.None
        );

        Assert.IsType<SigneeInitializationOutcome.Completed>(outcome);
        _signeeContextsManager.VerifyAll();
        _signeeContextsManager.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ResolveSignees_NoneAnywhere_GeneratesAndPersistsNewContexts()
    {
        AltinnSignatureConfiguration config = CreateSignatureConfiguration();
        Mock<IInstanceDataMutator> mutator = CreateInstanceDataMutator(CreateInstance());
        List<SigneeContext> generated = [CreateSigneeContext(Guid.NewGuid())];

        _signeeContextsManager
            .Setup(x => x.FindTaskSigneeStateElement(mutator.Object, config, TaskId))
            .Returns((DataElement?)null);
        _signeeContextsManager
            .Setup(x =>
                x.AdoptTaskSigneeStateElementFromStorage(mutator.Object, config, TaskId, CancellationToken.None)
            )
            .ReturnsAsync((DataElement?)null);
        _signeeContextsManager.Setup(x => x.RemoveOtherSigneeStateElements(mutator.Object, config, TaskId));
        _signeeContextsManager
            .Setup(x => x.GenerateSigneeContexts(mutator.Object, config, CancellationToken.None))
            .ReturnsAsync(generated);
        _signeeContextsManager
            .Setup(x => x.PersistSigneeContexts(mutator.Object, config, TaskId, generated))
            .Returns(Task.CompletedTask);

        SigneeInitializationService service = CreateService();

        SigneeInitializationOutcome outcome = await service.ResolveSignees(
            mutator.Object,
            config,
            TaskId,
            CancellationToken.None
        );

        Assert.IsType<SigneeInitializationOutcome.Completed>(outcome);
        _signeeContextsManager.VerifyAll();
        _signeeContextsManager.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ResolveSignees_GenerateThrowsSigneeProviderNotFound_ReturnsContractViolationWithoutPersisting()
    {
        AltinnSignatureConfiguration config = CreateSignatureConfiguration();
        Mock<IInstanceDataMutator> mutator = CreateInstanceDataMutator(CreateInstance());
        const string message = "No signee provider registered with id 'missing'.";

        _signeeContextsManager
            .Setup(x => x.FindTaskSigneeStateElement(mutator.Object, config, TaskId))
            .Returns((DataElement?)null);
        _signeeContextsManager
            .Setup(x =>
                x.AdoptTaskSigneeStateElementFromStorage(mutator.Object, config, TaskId, CancellationToken.None)
            )
            .ReturnsAsync((DataElement?)null);
        _signeeContextsManager.Setup(x => x.RemoveOtherSigneeStateElements(mutator.Object, config, TaskId));
        _signeeContextsManager
            .Setup(x => x.GenerateSigneeContexts(mutator.Object, config, CancellationToken.None))
            .ThrowsAsync(new SigneeProviderNotFoundException(message));

        SigneeInitializationService service = CreateService();

        SigneeInitializationOutcome outcome = await service.ResolveSignees(
            mutator.Object,
            config,
            TaskId,
            CancellationToken.None
        );

        SigneeInitializationOutcome.ContractViolation violation =
            Assert.IsType<SigneeInitializationOutcome.ContractViolation>(outcome);
        Assert.Equal(message, violation.Message);
        // PersistSigneeContexts was never set up: the strict mock would throw if the code called it anyway.
        _signeeContextsManager.VerifyAll();
        _signeeContextsManager.VerifyNoOtherCalls();
    }

    #endregion

    #region ExecuteDelegation

    [Fact]
    public async Task ExecuteDelegation_AllSigneesAlreadyDelegated_ReturnsWithoutPartyLookupOrDelegation()
    {
        AltinnSignatureConfiguration config = CreateSignatureConfiguration();
        Mock<IInstanceDataMutator> mutator = CreateInstanceDataMutator(CreateInstance());
        DataElement element = CreateSigneeStateElement(config);
        List<SigneeContext> contexts = [CreateSigneeContext(Guid.NewGuid(), isAccessDelegated: true)];

        _signeeContextsManager
            .Setup(x => x.FindTaskSigneeStateElement(mutator.Object, config, TaskId))
            .Returns(element);
        _signeeContextsManager.Setup(x => x.LoadSigneeContexts(mutator.Object, config, element)).ReturnsAsync(contexts);

        SigneeInitializationService service = CreateService();

        await service.ExecuteDelegation(mutator.Object, config, TaskId, Guid.NewGuid(), CancellationToken.None);

        _signeeContextsManager.VerifyAll();
        _signeeContextsManager.VerifyNoOtherCalls();
        _altinnPartyClient.VerifyNoOtherCalls();
        _signingDelegationService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ExecuteDelegation_MissingTaggedElement_ThrowsPermanentException()
    {
        AltinnSignatureConfiguration config = CreateSignatureConfiguration();
        Mock<IInstanceDataMutator> mutator = CreateInstanceDataMutator(CreateInstance());

        _signeeContextsManager
            .Setup(x => x.FindTaskSigneeStateElement(mutator.Object, config, TaskId))
            .Returns((DataElement?)null);

        SigneeInitializationService service = CreateService();

        await Assert.ThrowsAsync<SigneeInitializationPermanentException>(() =>
            service.ExecuteDelegation(mutator.Object, config, TaskId, Guid.NewGuid(), CancellationToken.None)
        );

        _signeeContextsManager.VerifyAll();
        _signeeContextsManager.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ExecuteDelegation_InstanceOwnerIsTtdOutsideProduction_SubstitutesDigdirOrgNumber()
    {
        AltinnSignatureConfiguration config = CreateSignatureConfiguration();
        Instance instance = CreateInstance(orgNumber: "ttd");
        Mock<IInstanceDataMutator> mutator = CreateInstanceDataMutator(instance);
        DataElement element = CreateSigneeStateElement(config);
        List<SigneeContext> contexts = [CreateSigneeContext(Guid.NewGuid())];
        Guid workflowId = Guid.NewGuid();
        Guid instanceOwnerPartyUuid = Guid.NewGuid();

        _signeeContextsManager
            .Setup(x => x.FindTaskSigneeStateElement(mutator.Object, config, TaskId))
            .Returns(element);
        _signeeContextsManager.Setup(x => x.LoadSigneeContexts(mutator.Object, config, element)).ReturnsAsync(contexts);
        _hostEnvironment.Setup(x => x.EnvironmentName).Returns("Development");
        _altinnPartyClient
            .Setup(x =>
                x.LookupParty(It.Is<PartyLookup>(p => p.OrgNo == "991825827"), It.IsAny<StorageAuthenticationMethod?>())
            )
            .ReturnsAsync(new Party { PartyUuid = instanceOwnerPartyUuid, OrgNumber = "991825827" });
        _signingDelegationService
            .Setup(x =>
                x.DelegateRights(
                    TaskId,
                    instance.Id,
                    instanceOwnerPartyUuid,
                    It.Is<AppIdentifier>(a => a.Equals(new AppIdentifier(instance.AppId))),
                    contexts,
                    workflowId,
                    CancellationToken.None
                )
            )
            .Returns(Task.CompletedTask);
        _signeeContextsManager
            .Setup(x => x.PersistSigneeContexts(mutator.Object, config, TaskId, contexts))
            .Returns(Task.CompletedTask);

        SigneeInitializationService service = CreateService();

        await service.ExecuteDelegation(mutator.Object, config, TaskId, workflowId, CancellationToken.None);

        _altinnPartyClient.VerifyAll();
        _signingDelegationService.VerifyAll();
        _signeeContextsManager.VerifyAll();
    }

    [Fact]
    public async Task ExecuteDelegation_InstanceOwnerIsTtdInProduction_DoesNotSubstitute()
    {
        AltinnSignatureConfiguration config = CreateSignatureConfiguration();
        Instance instance = CreateInstance(orgNumber: "ttd");
        Mock<IInstanceDataMutator> mutator = CreateInstanceDataMutator(instance);
        DataElement element = CreateSigneeStateElement(config);
        List<SigneeContext> contexts = [CreateSigneeContext(Guid.NewGuid())];
        Guid workflowId = Guid.NewGuid();
        Guid instanceOwnerPartyUuid = Guid.NewGuid();

        _signeeContextsManager
            .Setup(x => x.FindTaskSigneeStateElement(mutator.Object, config, TaskId))
            .Returns(element);
        _signeeContextsManager.Setup(x => x.LoadSigneeContexts(mutator.Object, config, element)).ReturnsAsync(contexts);
        _hostEnvironment.Setup(x => x.EnvironmentName).Returns("Production");
        _altinnPartyClient
            .Setup(x =>
                x.LookupParty(It.Is<PartyLookup>(p => p.OrgNo == "ttd"), It.IsAny<StorageAuthenticationMethod?>())
            )
            .ReturnsAsync(new Party { PartyUuid = instanceOwnerPartyUuid, OrgNumber = "ttd" });
        _signingDelegationService
            .Setup(x =>
                x.DelegateRights(
                    TaskId,
                    instance.Id,
                    instanceOwnerPartyUuid,
                    It.IsAny<AppIdentifier>(),
                    contexts,
                    workflowId,
                    CancellationToken.None
                )
            )
            .Returns(Task.CompletedTask);
        _signeeContextsManager
            .Setup(x => x.PersistSigneeContexts(mutator.Object, config, TaskId, contexts))
            .Returns(Task.CompletedTask);

        SigneeInitializationService service = CreateService();

        await service.ExecuteDelegation(mutator.Object, config, TaskId, workflowId, CancellationToken.None);

        _altinnPartyClient.VerifyAll();
        _signingDelegationService.VerifyAll();
        _signeeContextsManager.VerifyAll();
    }

    [Fact]
    public async Task ExecuteDelegation_PartyLookupTransientFailure_Rethrows()
    {
        AltinnSignatureConfiguration config = CreateSignatureConfiguration();
        Mock<IInstanceDataMutator> mutator = CreateInstanceDataMutator(CreateInstance());
        DataElement element = CreateSigneeStateElement(config);
        List<SigneeContext> contexts = [CreateSigneeContext(Guid.NewGuid())];

        _signeeContextsManager
            .Setup(x => x.FindTaskSigneeStateElement(mutator.Object, config, TaskId))
            .Returns(element);
        _signeeContextsManager.Setup(x => x.LoadSigneeContexts(mutator.Object, config, element)).ReturnsAsync(contexts);
        _hostEnvironment.Setup(x => x.EnvironmentName).Returns("Development");
        _altinnPartyClient
            .Setup(x => x.LookupParty(It.IsAny<PartyLookup>(), It.IsAny<StorageAuthenticationMethod?>()))
            .ThrowsAsync(new PlatformHttpException(HttpStatusCode.ServiceUnavailable, "boom"));

        SigneeInitializationService service = CreateService();

        await Assert.ThrowsAsync<PlatformHttpException>(() =>
            service.ExecuteDelegation(mutator.Object, config, TaskId, Guid.NewGuid(), CancellationToken.None)
        );

        // DelegateRights and PersistSigneeContexts were never set up: strict mocks would throw if called anyway.
        _signingDelegationService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ExecuteDelegation_PartyLookupPermanentFailure_ThrowsPermanentException()
    {
        AltinnSignatureConfiguration config = CreateSignatureConfiguration();
        Mock<IInstanceDataMutator> mutator = CreateInstanceDataMutator(CreateInstance());
        DataElement element = CreateSigneeStateElement(config);
        List<SigneeContext> contexts = [CreateSigneeContext(Guid.NewGuid())];

        _signeeContextsManager
            .Setup(x => x.FindTaskSigneeStateElement(mutator.Object, config, TaskId))
            .Returns(element);
        _signeeContextsManager.Setup(x => x.LoadSigneeContexts(mutator.Object, config, element)).ReturnsAsync(contexts);
        _hostEnvironment.Setup(x => x.EnvironmentName).Returns("Development");
        _altinnPartyClient
            .Setup(x => x.LookupParty(It.IsAny<PartyLookup>(), It.IsAny<StorageAuthenticationMethod?>()))
            .ThrowsAsync(new PlatformHttpException(HttpStatusCode.BadRequest, "boom"));

        SigneeInitializationService service = CreateService();

        await Assert.ThrowsAsync<SigneeInitializationPermanentException>(() =>
            service.ExecuteDelegation(mutator.Object, config, TaskId, Guid.NewGuid(), CancellationToken.None)
        );

        _signingDelegationService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ExecuteDelegation_InstanceOwnerPartyHasNoPartyUuid_ThrowsPermanentException()
    {
        AltinnSignatureConfiguration config = CreateSignatureConfiguration();
        Mock<IInstanceDataMutator> mutator = CreateInstanceDataMutator(CreateInstance());
        DataElement element = CreateSigneeStateElement(config);
        List<SigneeContext> contexts = [CreateSigneeContext(Guid.NewGuid())];

        _signeeContextsManager
            .Setup(x => x.FindTaskSigneeStateElement(mutator.Object, config, TaskId))
            .Returns(element);
        _signeeContextsManager.Setup(x => x.LoadSigneeContexts(mutator.Object, config, element)).ReturnsAsync(contexts);
        _hostEnvironment.Setup(x => x.EnvironmentName).Returns("Development");
        _altinnPartyClient
            .Setup(x => x.LookupParty(It.IsAny<PartyLookup>(), It.IsAny<StorageAuthenticationMethod?>()))
            .ReturnsAsync(new Party { PartyUuid = null, OrgNumber = "123456789" });

        SigneeInitializationService service = CreateService();

        await Assert.ThrowsAsync<SigneeInitializationPermanentException>(() =>
            service.ExecuteDelegation(mutator.Object, config, TaskId, Guid.NewGuid(), CancellationToken.None)
        );

        _signingDelegationService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ExecuteDelegation_HappyPath_DelegatesThenPersists()
    {
        AltinnSignatureConfiguration config = CreateSignatureConfiguration();
        Instance instance = CreateInstance();
        Mock<IInstanceDataMutator> mutator = CreateInstanceDataMutator(instance);
        DataElement element = CreateSigneeStateElement(config);
        List<SigneeContext> contexts = [CreateSigneeContext(Guid.NewGuid()), CreateSigneeContext(Guid.NewGuid())];
        Guid workflowId = Guid.NewGuid();
        Guid instanceOwnerPartyUuid = Guid.NewGuid();
        List<string> callOrder = [];

        _signeeContextsManager
            .Setup(x => x.FindTaskSigneeStateElement(mutator.Object, config, TaskId))
            .Returns(element);
        _signeeContextsManager.Setup(x => x.LoadSigneeContexts(mutator.Object, config, element)).ReturnsAsync(contexts);
        _hostEnvironment.Setup(x => x.EnvironmentName).Returns("Development");
        _altinnPartyClient
            .Setup(x =>
                x.LookupParty(It.Is<PartyLookup>(p => p.OrgNo == "123456789"), It.IsAny<StorageAuthenticationMethod?>())
            )
            .ReturnsAsync(new Party { PartyUuid = instanceOwnerPartyUuid, OrgNumber = "123456789" });
        _signingDelegationService
            .Setup(x =>
                x.DelegateRights(
                    TaskId,
                    instance.Id,
                    instanceOwnerPartyUuid,
                    It.Is<AppIdentifier>(a => a.Equals(new AppIdentifier(instance.AppId))),
                    contexts,
                    workflowId,
                    CancellationToken.None
                )
            )
            .Callback(() => callOrder.Add("delegate"))
            .Returns(Task.CompletedTask);
        _signeeContextsManager
            .Setup(x => x.PersistSigneeContexts(mutator.Object, config, TaskId, contexts))
            .Callback(() => callOrder.Add("persist"))
            .Returns(Task.CompletedTask);

        SigneeInitializationService service = CreateService();

        await service.ExecuteDelegation(mutator.Object, config, TaskId, workflowId, CancellationToken.None);

        Assert.Equal(["delegate", "persist"], callOrder);
        _altinnPartyClient.VerifyAll();
        _signingDelegationService.VerifyAll();
        _signeeContextsManager.VerifyAll();
    }

    #endregion

    #region ExecuteNotification

    private void SetupServiceOwnerPartyResolution(Party serviceOwnerParty, string orgNr = "987654321")
    {
        _altinnCdnClient
            .Setup(x => x.GetOrgDetails(It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new AltinnCdnOrgDetails
                {
                    Name = new AltinnCdnOrgName
                    {
                        Nb = "Testdepartementet",
                        Nn = "Testdepartementet",
                        En = "Test",
                    },
                    Environments = [],
                    Orgnr = orgNr,
                }
            );
        _altinnPartyClient
            .Setup(x =>
                x.LookupParty(It.Is<PartyLookup>(p => p.OrgNo == orgNr), It.IsAny<StorageAuthenticationMethod?>())
            )
            .ReturnsAsync(serviceOwnerParty);
    }

    [Fact]
    public async Task ExecuteNotification_NoDelegatedAndUnmessagedTargets_ReturnsWithoutServiceOwnerLookup()
    {
        AltinnSignatureConfiguration config = CreateSignatureConfiguration();
        Mock<IInstanceDataMutator> mutator = CreateInstanceDataMutator(CreateInstance());
        DataElement element = CreateSigneeStateElement(config);
        List<SigneeContext> contexts =
        [
            CreateSigneeContext(Guid.NewGuid(), isAccessDelegated: false, hasBeenMessaged: false),
            CreateSigneeContext(Guid.NewGuid(), isAccessDelegated: true, hasBeenMessaged: true),
        ];

        _signeeContextsManager
            .Setup(x => x.FindTaskSigneeStateElement(mutator.Object, config, TaskId))
            .Returns(element);
        _signeeContextsManager.Setup(x => x.LoadSigneeContexts(mutator.Object, config, element)).ReturnsAsync(contexts);

        SigneeInitializationService service = CreateService();

        await service.ExecuteNotification(
            mutator.Object,
            config,
            TaskId,
            Guid.NewGuid(),
            Guid.NewGuid(),
            CancellationToken.None
        );

        _signeeContextsManager.VerifyAll();
        _signeeContextsManager.VerifyNoOtherCalls();
        _altinnCdnClient.VerifyNoOtherCalls();
        _altinnPartyClient.VerifyNoOtherCalls();
        _signingCallToActionService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ExecuteNotification_ServiceOwnerUnresolvable_RecordsFailureOnEveryTargetAndPersists()
    {
        AltinnSignatureConfiguration config = CreateSignatureConfiguration();
        Instance instance = CreateInstance();
        Mock<IInstanceDataMutator> mutator = CreateInstanceDataMutator(instance);
        DataElement element = CreateSigneeStateElement(config);
        List<SigneeContext> contexts =
        [
            CreateSigneeContext(Guid.NewGuid(), isAccessDelegated: true),
            CreateSigneeContext(Guid.NewGuid(), isAccessDelegated: true),
        ];

        _signeeContextsManager
            .Setup(x => x.FindTaskSigneeStateElement(mutator.Object, config, TaskId))
            .Returns(element);
        _signeeContextsManager.Setup(x => x.LoadSigneeContexts(mutator.Object, config, element)).ReturnsAsync(contexts);
        _altinnCdnClient
            .Setup(x => x.GetOrgDetails(It.IsAny<CancellationToken>()))
            .ReturnsAsync((AltinnCdnOrgDetails?)null);
        _signeeContextsManager
            .Setup(x => x.PersistSigneeContexts(mutator.Object, config, TaskId, contexts))
            .Returns(Task.CompletedTask);

        SigneeInitializationService service = CreateService();

        await service.ExecuteNotification(
            mutator.Object,
            config,
            TaskId,
            Guid.NewGuid(),
            Guid.NewGuid(),
            CancellationToken.None
        );

        foreach (SigneeContext context in contexts)
        {
            Assert.Equal(NotificationFailureCode.ServiceOwnerUnavailable, context.SigneeState.NotificationFailure);
            Assert.Equal(
                "The service owner's party could not be resolved.",
                context.SigneeState.CallToSignFailedReason
            );
            Assert.False(context.SigneeState.HasBeenMessagedForCallToSign);
        }

        _altinnPartyClient.VerifyNoOtherCalls();
        _signingCallToActionService.VerifyNoOtherCalls();
        _signeeContextsManager.VerifyAll();
    }

    [Fact]
    public async Task ExecuteNotification_Success_MarksMessagedAndStoresCorrespondenceIdWithExpectedKey()
    {
        AltinnSignatureConfiguration config = CreateSignatureConfiguration();
        Instance instance = CreateInstance();
        Mock<IInstanceDataMutator> mutator = CreateInstanceDataMutator(instance);
        DataElement element = CreateSigneeStateElement(config);
        Guid workflowId = Guid.NewGuid();
        Guid stepId = Guid.NewGuid();
        Guid partyUuid = Guid.NewGuid();
        SigneeContext context = CreateSigneeContext(partyUuid, isAccessDelegated: true);
        List<SigneeContext> contexts = [context];
        Party serviceOwnerParty = new() { Name = "Service owner", OrgNumber = GetOrgNumber(1) };
        Guid correspondenceId = Guid.NewGuid();
        Guid expectedKey = SigningIdempotencyKey.ForCallToAction(workflowId, stepId, partyUuid.ToString("D"));

        _signeeContextsManager
            .Setup(x => x.FindTaskSigneeStateElement(mutator.Object, config, TaskId))
            .Returns(element);
        _signeeContextsManager.Setup(x => x.LoadSigneeContexts(mutator.Object, config, element)).ReturnsAsync(contexts);
        SetupServiceOwnerPartyResolution(serviceOwnerParty);
        _signingCallToActionService
            .Setup(x =>
                x.SendSignCallToAction(
                    context.CommunicationConfig,
                    It.Is<AppIdentifier>(a => a.Equals(new AppIdentifier(instance.AppId))),
                    It.IsAny<InstanceIdentifier>(),
                    context.Signee.GetParty(),
                    serviceOwnerParty,
                    config.CorrespondenceResources,
                    CancellationToken.None,
                    expectedKey
                )
            )
            .ReturnsAsync(
                new SendCorrespondenceResponse
                {
                    Correspondences =
                    [
                        new CorrespondenceDetailsResponse
                        {
                            CorrespondenceId = correspondenceId,
                            Recipient = OrganizationOrPersonIdentifier.Parse(GetOrgNumber(2)),
                        },
                    ],
                }
            );
        _signeeContextsManager
            .Setup(x => x.PersistSigneeContexts(mutator.Object, config, TaskId, contexts))
            .Returns(Task.CompletedTask);

        SigneeInitializationService service = CreateService();

        await service.ExecuteNotification(mutator.Object, config, TaskId, workflowId, stepId, CancellationToken.None);

        Assert.True(context.SigneeState.HasBeenMessagedForCallToSign);
        Assert.Equal(correspondenceId, context.SigneeState.CtaCorrespondenceId);
        Assert.Null(context.SigneeState.NotificationFailure);
        Assert.Null(context.SigneeState.CallToSignFailedReason);
        _signeeContextsManager.VerifyAll();
        _signingCallToActionService.VerifyAll();
    }

    [Fact]
    public async Task ExecuteNotification_SameSigneeSameWorkflowAndStep_ProducesTheSameIdempotencyKeyOnARetry()
    {
        // Simulates a retried attempt (the first attempt's response was lost before the state could be
        // persisted): two independent loads for the same signee identity, workflow and step must derive the same
        // idempotency key, so Correspondence recognises the retry as a duplicate of the earlier send.
        AltinnSignatureConfiguration config = CreateSignatureConfiguration();
        Guid workflowId = Guid.NewGuid();
        Guid stepId = Guid.NewGuid();
        Guid partyUuid = Guid.NewGuid();
        Party serviceOwnerParty = new() { Name = "Service owner", OrgNumber = GetOrgNumber(3) };
        List<Guid?> capturedKeys = [];

        _signingCallToActionService
            .Setup(x =>
                x.SendSignCallToAction(
                    It.IsAny<CommunicationConfig?>(),
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<Party>(),
                    serviceOwnerParty,
                    It.IsAny<List<AltinnEnvironmentConfig>?>(),
                    CancellationToken.None,
                    It.IsAny<Guid?>()
                )
            )
            .Callback<
                CommunicationConfig?,
                AppIdentifier,
                InstanceIdentifier,
                Party,
                Party,
                List<AltinnEnvironmentConfig>?,
                CancellationToken,
                Guid?
            >((_, _, _, _, _, _, _, key) => capturedKeys.Add(key))
            .ReturnsAsync(new SendCorrespondenceResponse { Correspondences = [] });

        SigneeInitializationService service = CreateService();

        // First attempt.
        Instance instance1 = CreateInstance();
        Mock<IInstanceDataMutator> mutator1 = CreateInstanceDataMutator(instance1);
        DataElement element1 = CreateSigneeStateElement(config);
        List<SigneeContext> contexts1 = [CreateSigneeContext(partyUuid, isAccessDelegated: true)];
        _signeeContextsManager
            .Setup(x => x.FindTaskSigneeStateElement(mutator1.Object, config, TaskId))
            .Returns(element1);
        _signeeContextsManager
            .Setup(x => x.LoadSigneeContexts(mutator1.Object, config, element1))
            .ReturnsAsync(contexts1);
        _signeeContextsManager
            .Setup(x => x.PersistSigneeContexts(mutator1.Object, config, TaskId, contexts1))
            .Returns(Task.CompletedTask);
        SetupServiceOwnerPartyResolution(serviceOwnerParty, "555555555");

        await service.ExecuteNotification(mutator1.Object, config, TaskId, workflowId, stepId, CancellationToken.None);

        // Second attempt: a fresh, not-yet-messaged context for the same signee, workflow and step.
        Instance instance2 = CreateInstance();
        Mock<IInstanceDataMutator> mutator2 = CreateInstanceDataMutator(instance2);
        DataElement element2 = CreateSigneeStateElement(config);
        List<SigneeContext> contexts2 = [CreateSigneeContext(partyUuid, isAccessDelegated: true)];
        _signeeContextsManager
            .Setup(x => x.FindTaskSigneeStateElement(mutator2.Object, config, TaskId))
            .Returns(element2);
        _signeeContextsManager
            .Setup(x => x.LoadSigneeContexts(mutator2.Object, config, element2))
            .ReturnsAsync(contexts2);
        _signeeContextsManager
            .Setup(x => x.PersistSigneeContexts(mutator2.Object, config, TaskId, contexts2))
            .Returns(Task.CompletedTask);

        await service.ExecuteNotification(mutator2.Object, config, TaskId, workflowId, stepId, CancellationToken.None);

        Assert.Equal(2, capturedKeys.Count);
        Assert.NotNull(capturedKeys[0]);
        Assert.Equal(capturedKeys[0], capturedKeys[1]);
    }

    [Fact]
    public async Task ExecuteNotification_AlreadySent409_IsTreatedAsSentWithNoCorrespondenceId()
    {
        AltinnSignatureConfiguration config = CreateSignatureConfiguration();
        Instance instance = CreateInstance();
        Mock<IInstanceDataMutator> mutator = CreateInstanceDataMutator(instance);
        DataElement element = CreateSigneeStateElement(config);
        SigneeContext context = CreateSigneeContext(Guid.NewGuid(), isAccessDelegated: true);
        List<SigneeContext> contexts = [context];
        Party serviceOwnerParty = new() { Name = "Service owner", OrgNumber = GetOrgNumber(4) };

        _signeeContextsManager
            .Setup(x => x.FindTaskSigneeStateElement(mutator.Object, config, TaskId))
            .Returns(element);
        _signeeContextsManager.Setup(x => x.LoadSigneeContexts(mutator.Object, config, element)).ReturnsAsync(contexts);
        SetupServiceOwnerPartyResolution(serviceOwnerParty, "555555556");
        _signingCallToActionService
            .Setup(x =>
                x.SendSignCallToAction(
                    It.IsAny<CommunicationConfig?>(),
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<Party>(),
                    serviceOwnerParty,
                    It.IsAny<List<AltinnEnvironmentConfig>?>(),
                    CancellationToken.None,
                    It.IsAny<Guid?>()
                )
            )
            .ThrowsAsync(new CorrespondenceRequestException("duplicate", null, HttpStatusCode.Conflict, null));
        _signeeContextsManager
            .Setup(x => x.PersistSigneeContexts(mutator.Object, config, TaskId, contexts))
            .Returns(Task.CompletedTask);

        SigneeInitializationService service = CreateService();

        await service.ExecuteNotification(
            mutator.Object,
            config,
            TaskId,
            Guid.NewGuid(),
            Guid.NewGuid(),
            CancellationToken.None
        );

        Assert.True(context.SigneeState.HasBeenMessagedForCallToSign);
        Assert.Null(context.SigneeState.CtaCorrespondenceId);
        Assert.Null(context.SigneeState.NotificationFailure);
        _signeeContextsManager.VerifyAll();
    }

    [Fact]
    public async Task ExecuteNotification_TransientFailure_RethrowsAndDoesNotPersist()
    {
        AltinnSignatureConfiguration config = CreateSignatureConfiguration();
        Instance instance = CreateInstance();
        Mock<IInstanceDataMutator> mutator = CreateInstanceDataMutator(instance);
        DataElement element = CreateSigneeStateElement(config);
        SigneeContext context = CreateSigneeContext(Guid.NewGuid(), isAccessDelegated: true);
        List<SigneeContext> contexts = [context];
        Party serviceOwnerParty = new() { Name = "Service owner", OrgNumber = GetOrgNumber(5) };

        _signeeContextsManager
            .Setup(x => x.FindTaskSigneeStateElement(mutator.Object, config, TaskId))
            .Returns(element);
        _signeeContextsManager.Setup(x => x.LoadSigneeContexts(mutator.Object, config, element)).ReturnsAsync(contexts);
        SetupServiceOwnerPartyResolution(serviceOwnerParty, "555555557");
        _signingCallToActionService
            .Setup(x =>
                x.SendSignCallToAction(
                    It.IsAny<CommunicationConfig?>(),
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<Party>(),
                    serviceOwnerParty,
                    It.IsAny<List<AltinnEnvironmentConfig>?>(),
                    CancellationToken.None,
                    It.IsAny<Guid?>()
                )
            )
            .ThrowsAsync(new CorrespondenceRequestException("boom", null, HttpStatusCode.ServiceUnavailable, null));

        SigneeInitializationService service = CreateService();

        await Assert.ThrowsAsync<CorrespondenceRequestException>(() =>
            service.ExecuteNotification(
                mutator.Object,
                config,
                TaskId,
                Guid.NewGuid(),
                Guid.NewGuid(),
                CancellationToken.None
            )
        );

        // PersistSigneeContexts was never set up: the strict mock would throw if the code called it anyway.
        _signeeContextsManager.VerifyAll();
    }

    [Fact]
    public async Task ExecuteNotification_AppWidePermanentFailureOnFirstTarget_RecordsOnBothAndNeverSendsSecond()
    {
        AltinnSignatureConfiguration config = CreateSignatureConfiguration();
        Instance instance = CreateInstance();
        Mock<IInstanceDataMutator> mutator = CreateInstanceDataMutator(instance);
        DataElement element = CreateSigneeStateElement(config);
        SigneeContext context1 = CreateSigneeContext(Guid.NewGuid(), isAccessDelegated: true);
        SigneeContext context2 = CreateSigneeContext(Guid.NewGuid(), isAccessDelegated: true);
        List<SigneeContext> contexts = [context1, context2];
        Party serviceOwnerParty = new() { Name = "Service owner", OrgNumber = GetOrgNumber(6) };
        ConfigurationException configurationException = new("no correspondence resource configured");

        _signeeContextsManager
            .Setup(x => x.FindTaskSigneeStateElement(mutator.Object, config, TaskId))
            .Returns(element);
        _signeeContextsManager.Setup(x => x.LoadSigneeContexts(mutator.Object, config, element)).ReturnsAsync(contexts);
        SetupServiceOwnerPartyResolution(serviceOwnerParty, "555555558");
        _signingCallToActionService
            .Setup(x =>
                x.SendSignCallToAction(
                    It.IsAny<CommunicationConfig?>(),
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    context1.Signee.GetParty(),
                    serviceOwnerParty,
                    It.IsAny<List<AltinnEnvironmentConfig>?>(),
                    CancellationToken.None,
                    It.IsAny<Guid?>()
                )
            )
            .ThrowsAsync(configurationException);
        // context2's SendSignCallToAction is deliberately not set up: the strict mock would throw if it were sent.
        _signeeContextsManager
            .Setup(x => x.PersistSigneeContexts(mutator.Object, config, TaskId, contexts))
            .Returns(Task.CompletedTask);

        SigneeInitializationService service = CreateService();

        await service.ExecuteNotification(
            mutator.Object,
            config,
            TaskId,
            Guid.NewGuid(),
            Guid.NewGuid(),
            CancellationToken.None
        );

        string expectedReason = SigningFailureClassifier.ShortReason(configurationException);
        foreach (SigneeContext context in contexts)
        {
            Assert.Equal(NotificationFailureCode.Configuration, context.SigneeState.NotificationFailure);
            Assert.Equal(expectedReason, context.SigneeState.CallToSignFailedReason);
            Assert.False(context.SigneeState.HasBeenMessagedForCallToSign);
        }

        _signingCallToActionService.VerifyAll();
        _signeeContextsManager.VerifyAll();
    }

    [Fact]
    public async Task ExecuteNotification_PerSigneePermanentFailureOnFirstTarget_SecondIsStillSent()
    {
        AltinnSignatureConfiguration config = CreateSignatureConfiguration();
        Instance instance = CreateInstance();
        Mock<IInstanceDataMutator> mutator = CreateInstanceDataMutator(instance);
        DataElement element = CreateSigneeStateElement(config);
        SigneeContext context1 = CreateSigneeContext(Guid.NewGuid(), isAccessDelegated: true);
        SigneeContext context2 = CreateSigneeContext(Guid.NewGuid(), isAccessDelegated: true);
        List<SigneeContext> contexts = [context1, context2];
        Party serviceOwnerParty = new() { Name = "Service owner", OrgNumber = GetOrgNumber(7) };

        _signeeContextsManager
            .Setup(x => x.FindTaskSigneeStateElement(mutator.Object, config, TaskId))
            .Returns(element);
        _signeeContextsManager.Setup(x => x.LoadSigneeContexts(mutator.Object, config, element)).ReturnsAsync(contexts);
        SetupServiceOwnerPartyResolution(serviceOwnerParty, "555555559");
        _signingCallToActionService
            .Setup(x =>
                x.SendSignCallToAction(
                    It.IsAny<CommunicationConfig?>(),
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    context1.Signee.GetParty(),
                    serviceOwnerParty,
                    It.IsAny<List<AltinnEnvironmentConfig>?>(),
                    CancellationToken.None,
                    It.IsAny<Guid?>()
                )
            )
            .ThrowsAsync(new CorrespondenceRequestException("rejected", null, HttpStatusCode.BadRequest, null));
        _signingCallToActionService
            .Setup(x =>
                x.SendSignCallToAction(
                    It.IsAny<CommunicationConfig?>(),
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    context2.Signee.GetParty(),
                    serviceOwnerParty,
                    It.IsAny<List<AltinnEnvironmentConfig>?>(),
                    CancellationToken.None,
                    It.IsAny<Guid?>()
                )
            )
            .ReturnsAsync(new SendCorrespondenceResponse { Correspondences = [] });
        _signeeContextsManager
            .Setup(x => x.PersistSigneeContexts(mutator.Object, config, TaskId, contexts))
            .Returns(Task.CompletedTask);

        SigneeInitializationService service = CreateService();

        await service.ExecuteNotification(
            mutator.Object,
            config,
            TaskId,
            Guid.NewGuid(),
            Guid.NewGuid(),
            CancellationToken.None
        );

        Assert.Equal(NotificationFailureCode.Rejected, context1.SigneeState.NotificationFailure);
        Assert.False(context1.SigneeState.HasBeenMessagedForCallToSign);
        Assert.True(context2.SigneeState.HasBeenMessagedForCallToSign);
        Assert.Null(context2.SigneeState.NotificationFailure);

        _signingCallToActionService.VerifyAll();
        _signeeContextsManager.VerifyAll();
    }

    #endregion
}
