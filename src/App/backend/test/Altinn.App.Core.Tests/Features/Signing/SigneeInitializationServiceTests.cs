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
using Altinn.App.Core.Internal.Instances;
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
    private readonly Mock<IInstanceClient> _instanceClient = new(MockBehavior.Strict);
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
            _instanceClient.Object,
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
            SigneeId = Guid.NewGuid(),
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
    public async Task ResolveSignees_ExistingTaggedElement_RefreshesStorageAndFinishesCleanup()
    {
        AltinnSignatureConfiguration config = CreateSignatureConfiguration();
        Mock<IInstanceDataMutator> mutator = CreateInstanceDataMutator(CreateInstance());
        DataElement existing = CreateSigneeStateElement(config);
        mutator.Object.Instance.Data.Add(existing);

        _signeeContextsManager
            .Setup(x =>
                x.RefreshTaskSigneeStateElementFromStorage(mutator.Object, config, TaskId, CancellationToken.None)
            )
            .ReturnsAsync(existing);
        _signeeContextsManager.Setup(x => x.RemoveOtherSigneeStateElements(mutator.Object, config, TaskId));

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
    public async Task ResolveSignees_NoneLocallyButAdoptedFromStorage_ReturnsCompletedWithoutGenerating()
    {
        AltinnSignatureConfiguration config = CreateSignatureConfiguration();
        Mock<IInstanceDataMutator> mutator = CreateInstanceDataMutator(CreateInstance());
        DataElement adopted = CreateSigneeStateElement(config);

        _signeeContextsManager
            .Setup(x =>
                x.RefreshTaskSigneeStateElementFromStorage(mutator.Object, config, TaskId, CancellationToken.None)
            )
            .ReturnsAsync(adopted);
        _signeeContextsManager.Setup(x => x.RemoveOtherSigneeStateElements(mutator.Object, config, TaskId));

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
            .Setup(x =>
                x.RefreshTaskSigneeStateElementFromStorage(mutator.Object, config, TaskId, CancellationToken.None)
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
        Assert.NotNull(Assert.Single(generated).SigneeId);
        Assert.NotEqual(Guid.Empty, generated[0].SigneeId);
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
            .Setup(x =>
                x.RefreshTaskSigneeStateElementFromStorage(mutator.Object, config, TaskId, CancellationToken.None)
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

    [Fact]
    public async Task GetResolvedSignees_ReturnsFrozenOrderAndStateElementIdentity()
    {
        var setup = PrepareRecipients();
        SigneeInitializationPlan plan = await CreateService()
            .GetResolvedSignees(setup.Mutator.Object, setup.Config, TaskId, CancellationToken.None);
        Assert.Equal(Guid.Parse(setup.Element.Id), plan.SigneeStateElementId);
        Assert.Equal(setup.Contexts.Select(x => x.SigneeId!.Value), plan.SigneeIds);
        _instanceClient.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task GetResolvedSignees_InvalidFrozenIdentities_FailsPermanently(bool duplicate)
    {
        var setup = PrepareRecipients();
        setup.Contexts[1].SigneeId = duplicate ? setup.Contexts[0].SigneeId : null;
        await Assert.ThrowsAsync<SigneeInitializationPermanentException>(() =>
            CreateService().GetResolvedSignees(setup.Mutator.Object, setup.Config, TaskId, CancellationToken.None)
        );
    }

    [Fact]
    public async Task Delegate_OnlySelectedRecipientIsGrantedAndSaved()
    {
        var setup = PrepareRecipients();
        SetupOwnerParty();
        List<SigneeContext>? granted = null;
        _signingDelegationService
            .Setup(x =>
                x.DelegateRights(
                    TaskId,
                    setup.Mutator.Object.Instance.Id,
                    It.IsAny<Guid>(),
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<List<SigneeContext>>(),
                    It.IsAny<Guid>(),
                    CancellationToken.None
                )
            )
            .Callback<string, string, Guid, AppIdentifier, List<SigneeContext>, Guid, CancellationToken>(
                (_, _, _, _, recipients, _, _) =>
                {
                    granted = recipients;
                    Assert.Single(recipients).SigneeState.IsAccessDelegated = true;
                }
            )
            .Returns(Task.CompletedTask);
        SetupPersistence(setup);

        await Delegate(setup, recipient: 1);

        Assert.Same(setup.Contexts[1], Assert.Single(granted!));
        Assert.False(setup.Contexts[0].SigneeState.IsAccessDelegated);
        Assert.True(setup.Contexts[1].SigneeState.IsAccessDelegated);
        _signeeContextsManager.Verify(
            x => x.PersistSigneeContexts(setup.Mutator.Object, setup.Config, TaskId, setup.Contexts),
            Times.Once
        );
    }

    [Fact]
    public async Task Delegate_AlreadyGranted_SkipsExternalCallAndWrite()
    {
        var setup = PrepareRecipients(delegated: true);
        await Delegate(setup);
        _altinnPartyClient.VerifyNoOtherCalls();
        _signingDelegationService.VerifyNoOtherCalls();
        VerifyNoPersistence();
    }

    [Fact]
    public async Task Delegate_PermanentRecipientRejection_FailsWithoutSaving()
    {
        var setup = PrepareRecipients();
        SetupOwnerParty();
        _signingDelegationService
            .Setup(x =>
                x.DelegateRights(
                    TaskId,
                    setup.Mutator.Object.Instance.Id,
                    It.IsAny<Guid>(),
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<List<SigneeContext>>(),
                    It.IsAny<Guid>(),
                    CancellationToken.None
                )
            )
            .Callback<string, string, Guid, AppIdentifier, List<SigneeContext>, Guid, CancellationToken>(
                (_, _, _, _, recipients, _, _) =>
                    Assert.Single(recipients).SigneeState.DelegationFailedReason = "Recipient rejected"
            )
            .Returns(Task.CompletedTask);

        var failure = await Assert.ThrowsAsync<SigneeInitializationPermanentException>(() => Delegate(setup));

        Assert.Equal("SigneeDelegationFailed", failure.ErrorCode);
        VerifyNoPersistence();
    }

    [Theory]
    [InlineData(HttpStatusCode.BadRequest, false)]
    [InlineData(HttpStatusCode.TooManyRequests, true)]
    [InlineData(HttpStatusCode.ServiceUnavailable, true)]
    public async Task Delegate_OwnerLookupFailure_PreservesClassification(HttpStatusCode status, bool retryable)
    {
        var setup = PrepareRecipients();
        var error = new HttpRequestException("Lookup failed", null, status);
        _altinnPartyClient.Setup(x => x.LookupParty(It.IsAny<PartyLookup>())).ThrowsAsync(error);
        if (retryable)
            Assert.Same(error, await Assert.ThrowsAsync<HttpRequestException>(() => Delegate(setup)));
        else
            await Assert.ThrowsAsync<SigneeInitializationPermanentException>(() => Delegate(setup));
        _signingDelegationService.VerifyNoOtherCalls();
        VerifyNoPersistence();
    }

    [Fact]
    public async Task Delegate_OwnerWithoutUuid_FailsPermanently()
    {
        var setup = PrepareRecipients();
        _altinnPartyClient.Setup(x => x.LookupParty(It.IsAny<PartyLookup>())).ReturnsAsync(new Party());
        await Assert.ThrowsAsync<SigneeInitializationPermanentException>(() => Delegate(setup));
        VerifyNoPersistence();
    }

    [Fact]
    public async Task Notify_SelectedRecipient_MergesSiblingStateAndPersistsCorrespondenceId()
    {
        var setup = PrepareRecipients(delegated: true);
        Guid siblingCorrespondence = Guid.NewGuid();
        setup.Contexts[0].SigneeState.HasBeenMessagedForCallToSign = true;
        setup.Contexts[0].SigneeState.CtaCorrespondenceId = siblingCorrespondence;
        Guid correspondenceId = Guid.NewGuid();
        SetupNotificationResponse(correspondenceId);
        SetupPersistence(setup);
        Instance carried = setup.Mutator.Object.Instance;
        ProcessState virtualProcess = carried.Process;
        DataElement unrelated = new() { Id = Guid.NewGuid().ToString(), DataType = "unrelated" };
        carried.Data.Add(unrelated);
        setup.Stored.Data.Add(new DataElement { Id = Guid.NewGuid().ToString(), DataType = "unrelated-stored" });

        await Notify(setup, recipient: 1);

        Assert.Same(virtualProcess, carried.Process);
        Assert.Contains(unrelated, carried.Data);
        Assert.DoesNotContain(carried.Data, x => x.DataType == "unrelated-stored");
        Assert.Equal(siblingCorrespondence, setup.Contexts[0].SigneeState.CtaCorrespondenceId);
        Assert.True(setup.Contexts[1].SigneeState.HasBeenMessagedForCallToSign);
        Assert.Equal(correspondenceId, setup.Contexts[1].SigneeState.CtaCorrespondenceId);
        _signingCallToActionService.Verify(
            x =>
                x.SendSignCallToAction(
                    setup.Contexts[1].CommunicationConfig,
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    setup.Contexts[1].Signee.GetParty(),
                    It.IsAny<Party>(),
                    setup.Config.CorrespondenceResources,
                    CancellationToken.None,
                    SigningIdempotencyKey.ForCallToAction(
                        Guid.Parse(setup.Element.Id),
                        setup.Contexts[1].SigneeId!.Value
                    )
                ),
            Times.Once
        );
        _signeeContextsManager.Verify(
            x => x.PersistSigneeContexts(setup.Mutator.Object, setup.Config, TaskId, setup.Contexts),
            Times.Once
        );
    }

    [Fact]
    public async Task Notify_SavedSuccess_SkipsSendAndWrite()
    {
        var setup = PrepareRecipients(delegated: true);
        setup.Contexts[0].SigneeState.HasBeenMessagedForCallToSign = true;
        await Notify(setup);
        _altinnCdnClient.VerifyNoOtherCalls();
        _signingCallToActionService.VerifyNoOtherCalls();
        VerifyNoPersistence();
    }

    [Fact]
    public async Task Notify_WithoutGrant_FailsPermanentlyWithoutSending()
    {
        var setup = PrepareRecipients();
        var failure = await Assert.ThrowsAsync<SigneeInitializationPermanentException>(() => Notify(setup));
        Assert.Equal("SigneeDelegationMissing", failure.ErrorCode);
        _signingCallToActionService.VerifyNoOtherCalls();
        VerifyNoPersistence();
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Notify_EndedOrReenteredTask_FailsObsoleteWithoutSending(bool reentered)
    {
        var setup = PrepareRecipients(delegated: true);
        if (reentered)
            setup.Stored.Data[0] = new DataElement
            {
                Id = Guid.NewGuid().ToString(),
                DataType = setup.Config.SigneeStatesDataTypeId,
            };
        else
            setup.Stored.Process.CurrentTask.ElementId = "Task_AfterSigning";
        var failure = await Assert.ThrowsAsync<SigneeInitializationPermanentException>(() => Notify(setup));
        Assert.Equal("SigneeTaskEntryObsolete", failure.ErrorCode);
        _signingCallToActionService.VerifyNoOtherCalls();
        VerifyNoPersistence();
    }

    [Theory]
    [InlineData(HttpStatusCode.BadRequest, false)]
    [InlineData(HttpStatusCode.Forbidden, false)]
    [InlineData(HttpStatusCode.TooManyRequests, true)]
    [InlineData(HttpStatusCode.ServiceUnavailable, true)]
    public async Task Notify_DependencyFailure_PreservesClassificationAndDoesNotSave(
        HttpStatusCode status,
        bool retryable
    )
    {
        var setup = PrepareRecipients(delegated: true);
        SetupServiceOwnerParty();
        var error = new CorrespondenceRequestException("Send failed", null, status, null);
        SetupSendFailure(error);
        if (retryable)
            Assert.Same(error, await Assert.ThrowsAsync<CorrespondenceRequestException>(() => Notify(setup)));
        else
            await Assert.ThrowsAsync<SigneeInitializationPermanentException>(() => Notify(setup));
        VerifyNoPersistence();
    }

    [Fact]
    public async Task Notify_Conflict_RecordsPreviouslyAcceptedSend()
    {
        var setup = PrepareRecipients(delegated: true);
        SetupServiceOwnerParty();
        SetupSendFailure(new CorrespondenceRequestException("Already sent", null, HttpStatusCode.Conflict, null));
        SetupPersistence(setup);
        await Notify(setup);
        Assert.True(setup.Contexts[0].SigneeState.HasBeenMessagedForCallToSign);
        Assert.Null(setup.Contexts[0].SigneeState.CtaCorrespondenceId);
        _signeeContextsManager.Verify(
            x => x.PersistSigneeContexts(setup.Mutator.Object, setup.Config, TaskId, setup.Contexts),
            Times.Once
        );
    }

    [Fact]
    public async Task Notify_MissingServiceOwner_FailsWithoutSaving()
    {
        var setup = PrepareRecipients(delegated: true);
        _altinnCdnClient.Setup(x => x.GetOrgDetails(CancellationToken.None)).ReturnsAsync((AltinnCdnOrgDetails?)null);
        await Assert.ThrowsAsync<SigneeInitializationPermanentException>(() => Notify(setup));
        _signingCallToActionService.VerifyNoOtherCalls();
        VerifyNoPersistence();
    }

    [Fact]
    public async Task Notify_RequestedCancellation_PropagatesWithoutSaving()
    {
        var setup = PrepareRecipients(delegated: true);
        SetupServiceOwnerParty();
        using var cts = new CancellationTokenSource();
        var error = new OperationCanceledException(cts.Token);
        _signingCallToActionService
            .Setup(x =>
                x.SendSignCallToAction(
                    It.IsAny<CommunicationConfig?>(),
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<Party>(),
                    It.IsAny<Party>(),
                    It.IsAny<List<AltinnEnvironmentConfig>?>(),
                    It.IsAny<CancellationToken>(),
                    It.IsAny<Guid?>()
                )
            )
            .Callback(() => cts.Cancel())
            .ThrowsAsync(error);
        Assert.Same(error, await Assert.ThrowsAsync<OperationCanceledException>(() => Notify(setup, ct: cts.Token)));
        VerifyNoPersistence();
    }

    private sealed record RecipientSetup(
        AltinnSignatureConfiguration Config,
        Mock<IInstanceDataMutator> Mutator,
        Instance Stored,
        DataElement Element,
        List<SigneeContext> Contexts
    );

    private RecipientSetup PrepareRecipients(bool delegated = false)
    {
        AltinnSignatureConfiguration config = CreateSignatureConfiguration();
        DataElement element = CreateSigneeStateElement(config);
        Instance carried = CreateInstance();
        carried.Data.Add(element);
        Instance stored = CreateInstance();
        stored.Data.Add(element);
        Mock<IInstanceDataMutator> mutator = CreateInstanceDataMutator(carried);
        List<SigneeContext> contexts =
        [
            CreateSigneeContext(Guid.NewGuid(), isAccessDelegated: delegated),
            CreateSigneeContext(Guid.NewGuid(), isAccessDelegated: delegated),
        ];
        _instanceClient
            .Setup(x =>
                x.GetInstance(
                    carried,
                    It.Is<StorageAuthenticationMethod?>(auth => auth == StorageAuthenticationMethod.ServiceOwner()),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(stored);
        _signeeContextsManager
            .Setup(x => x.FindTaskSigneeStateElement(mutator.Object, config, TaskId))
            .Returns(() => carried.Data.SingleOrDefault(x => x.DataType == config.SigneeStatesDataTypeId));
        _signeeContextsManager.Setup(x => x.LoadSigneeContexts(mutator.Object, config, element)).ReturnsAsync(contexts);
        return new RecipientSetup(config, mutator, stored, element, contexts);
    }

    private Task Delegate(RecipientSetup setup, int recipient = 0) =>
        CreateService()
            .ExecuteDelegation(
                setup.Mutator.Object,
                setup.Config,
                TaskId,
                Guid.Parse(setup.Element.Id),
                setup.Contexts[recipient].SigneeId!.Value,
                Guid.NewGuid(),
                CancellationToken.None
            );

    private Task Notify(RecipientSetup setup, int recipient = 0, CancellationToken ct = default) =>
        CreateService()
            .ExecuteNotification(
                setup.Mutator.Object,
                setup.Config,
                TaskId,
                Guid.Parse(setup.Element.Id),
                setup.Contexts[recipient].SigneeId!.Value,
                Guid.NewGuid(),
                Guid.NewGuid(),
                ct
            );

    private void SetupPersistence(RecipientSetup setup) =>
        _signeeContextsManager
            .Setup(x => x.PersistSigneeContexts(setup.Mutator.Object, setup.Config, TaskId, setup.Contexts))
            .Returns(Task.CompletedTask);

    private void VerifyNoPersistence() =>
        _signeeContextsManager.Verify(
            x =>
                x.PersistSigneeContexts(
                    It.IsAny<IInstanceDataMutator>(),
                    It.IsAny<AltinnSignatureConfiguration>(),
                    It.IsAny<string>(),
                    It.IsAny<List<SigneeContext>>()
                ),
            Times.Never
        );

    private void SetupOwnerParty() =>
        _altinnPartyClient
            .Setup(x => x.LookupParty(It.IsAny<PartyLookup>()))
            .ReturnsAsync(new Party { PartyUuid = Guid.NewGuid() });

    private void SetupServiceOwnerParty()
    {
        _altinnCdnClient
            .Setup(x => x.GetOrgDetails(It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new AltinnCdnOrgDetails
                {
                    Orgnr = "123456789",
                    Name = new AltinnCdnOrgName
                    {
                        Nb = "Service owner",
                        Nn = "Service owner",
                        En = "Service owner",
                    },
                    Environments = [],
                }
            );
        SetupOwnerParty();
    }

    private void SetupNotificationResponse(Guid correspondenceId)
    {
        SetupServiceOwnerParty();
        _signingCallToActionService
            .Setup(x =>
                x.SendSignCallToAction(
                    It.IsAny<CommunicationConfig?>(),
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<Party>(),
                    It.IsAny<Party>(),
                    It.IsAny<List<AltinnEnvironmentConfig>?>(),
                    It.IsAny<CancellationToken>(),
                    It.IsAny<Guid?>()
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
                            Recipient = GetOrgNumber(0),
                        },
                    ],
                }
            );
    }

    private void SetupSendFailure(Exception error) =>
        _signingCallToActionService
            .Setup(x =>
                x.SendSignCallToAction(
                    It.IsAny<CommunicationConfig?>(),
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<Party>(),
                    It.IsAny<Party>(),
                    It.IsAny<List<AltinnEnvironmentConfig>?>(),
                    It.IsAny<CancellationToken>(),
                    It.IsAny<Guid?>()
                )
            )
            .ThrowsAsync(error);
}
