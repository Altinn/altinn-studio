using System.Diagnostics;
using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Features.Signing.Exceptions;
using Altinn.App.Core.Features.Signing.Helpers;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Internal.AltinnCdn;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Features.Signing.Services;

internal sealed class SigneeInitializationService(
    ISigneeContextsManager signeeContextsManager,
    ISigningDelegationService signingDelegationService,
    ISigningCallToActionService signingCallToActionService,
    IAltinnPartyClient altinnPartyClient,
    IAltinnCdnClient altinnCdnClient,
    IHostEnvironment hostEnvironment,
    ILogger<SigneeInitializationService> logger,
    Telemetry? telemetry = null
) : ISigneeInitializationService
{
    /// <summary>
    /// Testdepartementet is often used in test environments; it has no organization number, so
    /// Digitaliseringsdirektoratet's is used instead.
    /// </summary>
    private const string TestDepartmentOrg = "ttd";
    private const string DigitaliseringsdirektoratetOrgNumber = "991825827";

    /// <inheritdoc />
    public async Task<SigneeInitializationOutcome> ResolveSignees(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        string taskId,
        CancellationToken ct
    )
    {
        using Activity? activity = telemetry?.StartAssignSigneesActivity();

        // Callback state carries the authoritative instance and versions. The controller owns aggregate
        // replay; replacing metadata here would separate it from those captured version preconditions.
        ct.ThrowIfCancellationRequested();
        DataElement? existing = signeeContextsManager.FindTaskSigneeStateElement(
            instanceDataMutator,
            signatureConfiguration,
            taskId
        );
        signeeContextsManager.RemoveOtherSigneeStateElements(instanceDataMutator, signatureConfiguration, taskId);
        if (existing is not null)
        {
            logger.LogInformation(
                "Signee state for task {TaskId} already exists (data element {DataElementId}); resuming from it.",
                taskId,
                existing.Id
            );
            return SigneeInitializationOutcome.Completed.Instance;
        }

        List<SigneeContext> signeeContexts;
        try
        {
            signeeContexts = await signeeContextsManager.GenerateSigneeContexts(
                instanceDataMutator,
                signatureConfiguration,
                ct
            );
        }
        catch (SigneeProviderNotFoundException e)
        {
            return new SigneeInitializationOutcome.ContractViolation(e.Message);
        }

        foreach (SigneeContext signeeContext in signeeContexts)
        {
            signeeContext.SigneeId = Guid.NewGuid();
        }

        await signeeContextsManager.PersistSigneeContexts(
            instanceDataMutator,
            signatureConfiguration,
            taskId,
            signeeContexts
        );

        return SigneeInitializationOutcome.Completed.Instance;
    }

    /// <inheritdoc />
    public async Task<SigneeInitializationPlan> GetResolvedSignees(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signatureConfiguration,
        string taskId,
        CancellationToken ct
    )
    {
        ct.ThrowIfCancellationRequested();
        DataElement element =
            signeeContextsManager.FindTaskSigneeStateElement(instanceDataAccessor, signatureConfiguration, taskId)
            ?? throw new SigneeInitializationPermanentException("The resolved signee state is missing.");
        List<SigneeContext> contexts = await signeeContextsManager.LoadSigneeContexts(
            instanceDataAccessor,
            signatureConfiguration,
            element
        );
        Guid[] signeeIds = contexts
            .Select(context =>
                context.SigneeId is { } id && id != Guid.Empty
                    ? id
                    : throw new SigneeInitializationPermanentException("A resolved signee has no frozen identity.")
            )
            .ToArray();
        if (signeeIds.Distinct().Count() != signeeIds.Length)
        {
            throw new SigneeInitializationPermanentException("The resolved signee identities are not unique.");
        }
        return new SigneeInitializationPlan(Guid.Parse(element.Id), signeeIds);
    }

    /// <inheritdoc />
    public async Task ExecuteDelegation(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        string taskId,
        Guid signeeStateElementId,
        Guid signeeId,
        Guid workflowId,
        CancellationToken ct
    )
    {
        var (signeeContexts, signeeContext) = await LoadRecipient(
            instanceDataMutator,
            signatureConfiguration,
            taskId,
            signeeStateElementId,
            signeeId,
            ct
        );
        if (signeeContext.SigneeState.IsAccessDelegated)
        {
            return;
        }

        Guid instanceOwnerPartyUuid = await ResolveInstanceOwnerPartyUuid(instanceDataMutator.Instance, ct);
        await signingDelegationService.DelegateRights(
            taskId,
            instanceDataMutator.Instance.Id,
            instanceOwnerPartyUuid,
            new AppIdentifier(instanceDataMutator.Instance.AppId),
            [signeeContext],
            workflowId,
            ct
        );
        // A permanent rejection of one recipient is recorded on their state rather than failing the step, so the
        // other signees can still sign and the reason reaches the signing state API. Transient failures are
        // rethrown by the delegation service for the engine to retry, and app-wide ones fail the step there.
        if (!signeeContext.SigneeState.IsAccessDelegated)
        {
            logger.LogWarning(
                "Rights could not be delegated to signee {SigneeId} on task {TaskId} (workflow {WorkflowId}): {Reason}",
                signeeId,
                taskId,
                workflowId,
                signeeContext.SigneeState.DelegationFailedReason
            );
        }

        await signeeContextsManager.PersistSigneeContexts(
            instanceDataMutator,
            signatureConfiguration,
            taskId,
            signeeContexts
        );
    }

    /// <inheritdoc />
    public async Task ExecuteNotification(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        string taskId,
        Guid signeeStateElementId,
        Guid signeeId,
        Guid workflowId,
        Guid stepId,
        CancellationToken ct
    )
    {
        // Recipient commands execute sequentially while the process is owned by this workflow. Each save
        // publishes the updated signee state and Storage versions to the next callback.
        var (signeeContexts, signeeContext) = await LoadRecipient(
            instanceDataMutator,
            signatureConfiguration,
            taskId,
            signeeStateElementId,
            signeeId,
            ct
        );
        if (signeeContext.SigneeState.HasBeenMessagedForCallToSign)
        {
            return;
        }
        if (!signeeContext.SigneeState.IsAccessDelegated)
        {
            // A recorded permanent rejection means this signee cannot sign, so there is nothing to call them to
            // action about. Skipping keeps the transition going for the signees whose delegation did succeed;
            // their failure is already persisted and reported on the signing state.
            if (signeeContext.SigneeState.DelegationFailure is not null)
            {
                logger.LogInformation(
                    "Skipping the call to action for signee {SigneeId} on task {TaskId}: rights were permanently refused ({Failure}).",
                    signeeId,
                    taskId,
                    signeeContext.SigneeState.DelegationFailure
                );
                return;
            }

            // No attempt was recorded at all, so the steps ran out of order and retrying cannot fix it.
            throw new SigneeInitializationPermanentException(
                "Rights must be delegated before notifying the signee.",
                "SigneeDelegationMissing"
            );
        }

        Instance instance = instanceDataMutator.Instance;
        Party? serviceOwnerParty = await ResolveServiceOwnerParty(ct);
        if (serviceOwnerParty is null)
        {
            RecordNotificationFailure(
                signeeContext,
                NotificationFailureCode.ServiceOwnerUnavailable,
                "The service owner's party could not be resolved."
            );
            await signeeContextsManager.PersistSigneeContexts(
                instanceDataMutator,
                signatureConfiguration,
                taskId,
                signeeContexts
            );
            return;
        }

        Party signingParty = signeeContext.Signee.GetParty();
        Guid idempotentKey = SigningIdempotencyKey.ForCallToAction(signeeStateElementId, signeeId);

        try
        {
            SendCorrespondenceResponse? response = await signingCallToActionService.SendSignCallToAction(
                signeeContext.CommunicationConfig,
                new AppIdentifier(instance.AppId),
                new InstanceIdentifier(instance),
                signingParty,
                serviceOwnerParty,
                signatureConfiguration.CorrespondenceResources,
                ct,
                idempotentKey
            );
            RecordNotified(signeeContext, response?.Correspondences.SingleOrDefault()?.CorrespondenceId);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception e) when (SigningFailureClassifier.IsAlreadySent(e))
        {
            logger.LogInformation(
                "Call to action for signee {SigneeId} on task {TaskId} was already sent (idempotency key {IdempotentKey}).",
                signeeId,
                taskId,
                idempotentKey
            );
            RecordNotified(signeeContext, correspondenceId: null);
        }
        catch (Exception e)
        {
            SigningFailureClassification classification = SigningFailureClassifier.ClassifyNotification(e, ct);
            telemetry?.RecordNotifySignees(Telemetry.NotifySigneesConst.NotifySigneesResult.Error);
            if (classification.IsTransient)
            {
                throw;
            }
            logger.LogError(
                e,
                "Call to action failed permanently for signee {SigneeId} on task {TaskId} of instance {InstanceId} (workflow {WorkflowId}, step {StepId}): {Reason}",
                signeeId,
                taskId,
                instance.Id,
                workflowId,
                stepId,
                classification.Reason
            );
            RecordNotificationFailure(
                signeeContext,
                SigningFailureClassifier.NotificationCode(classification),
                classification.Reason
            );
        }

        await signeeContextsManager.PersistSigneeContexts(
            instanceDataMutator,
            signatureConfiguration,
            taskId,
            signeeContexts
        );
    }

    private async Task<(List<SigneeContext> Contexts, SigneeContext Recipient)> LoadRecipient(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        string taskId,
        Guid signeeStateElementId,
        Guid signeeId,
        CancellationToken ct
    )
    {
        ct.ThrowIfCancellationRequested();
        if (instanceDataMutator.Instance.Process?.CurrentTask?.ElementId != taskId)
        {
            throw new SigneeInitializationPermanentException(
                "The signing task is no longer current; this recipient command is obsolete.",
                "SigneeTaskEntryObsolete"
            );
        }

        DataElement? stateElement = signeeContextsManager.FindTaskSigneeStateElement(
            instanceDataMutator,
            signatureConfiguration,
            taskId
        );
        if (stateElement is null || Guid.Parse(stateElement.Id) != signeeStateElementId)
        {
            throw new SigneeInitializationPermanentException(
                "The resolved signing task entry no longer exists; this recipient command is obsolete.",
                "SigneeTaskEntryObsolete"
            );
        }

        List<SigneeContext> signeeContexts = await signeeContextsManager.LoadSigneeContexts(
            instanceDataMutator,
            signatureConfiguration,
            stateElement
        );
        SigneeContext recipient =
            signeeContexts.SingleOrDefault(context => context.SigneeId == signeeId)
            ?? throw new SigneeInitializationPermanentException("The frozen signee identity was not found.");
        if (recipient.TaskId != taskId || signeeId == Guid.Empty)
        {
            throw new SigneeInitializationPermanentException("The frozen signee does not belong to this task.");
        }
        return (signeeContexts, recipient);
    }

    private async Task<Guid> ResolveInstanceOwnerPartyUuid(Instance instance, CancellationToken ct)
    {
        using Activity? activity = telemetry?.StartGetInstanceOwnerPartyActivity();
        InstanceOwner instanceOwner = instance.InstanceOwner;

        string? organisationNumber = instanceOwner.OrganisationNumber;
        if (organisationNumber == TestDepartmentOrg && !hostEnvironment.IsProduction())
        {
            organisationNumber = DigitaliseringsdirektoratetOrgNumber;
        }

        Party? party;
        try
        {
            party = await altinnPartyClient.LookupParty(
                !string.IsNullOrEmpty(organisationNumber)
                    ? new PartyLookup { OrgNo = organisationNumber }
                    : new PartyLookup { Ssn = instanceOwner.PersonNumber }
            );
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception e)
        {
            SigningFailureClassification classification = SigningFailureClassifier.ClassifyPartyLookup(e, ct);
            if (classification.IsTransient)
            {
                throw;
            }

            throw new SigneeInitializationPermanentException(
                $"The instance owner's party could not be resolved, so no rights can be delegated: {classification.Reason}"
            );
        }

        return party?.PartyUuid
            ?? throw new SigneeInitializationPermanentException(
                "The instance owner's party has no party uuid, so no rights can be delegated."
            );
    }

    /// <summary>
    /// The party the call to action is sent on behalf of, or <c>null</c> when it cannot be resolved for a reason
    /// no retry fixes. A transient failure is thrown.
    /// </summary>
    private async Task<Party?> ResolveServiceOwnerParty(CancellationToken ct)
    {
        using Activity? activity = telemetry?.StartGetServiceOwnerPartyActivity();
        try
        {
            AltinnCdnOrgDetails? serviceOwnerDetails = await altinnCdnClient.GetOrgDetails(ct);
            if (string.IsNullOrWhiteSpace(serviceOwnerDetails?.Orgnr))
            {
                logger.LogError(
                    "The service owner has no organization number in the Altinn CDN organization registry."
                );
                telemetry?.RecordGetServiceOwnerParty(Telemetry.ServiceOwnerPartyConst.ServiceOwnerPartyResult.Error);
                return null;
            }

            Party party = await altinnPartyClient.LookupParty(new PartyLookup { OrgNo = serviceOwnerDetails.Orgnr });
            telemetry?.RecordGetServiceOwnerParty(Telemetry.ServiceOwnerPartyConst.ServiceOwnerPartyResult.Success);
            return party;
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception e)
        {
            SigningFailureClassification classification = SigningFailureClassifier.ClassifyPartyLookup(e, ct);
            if (classification.IsTransient)
            {
                throw;
            }

            logger.LogError(e, "Failed to look up the service owner's party: {Reason}", classification.Reason);
            telemetry?.RecordGetServiceOwnerParty(Telemetry.ServiceOwnerPartyConst.ServiceOwnerPartyResult.Error);
            return null;
        }
    }

    private void RecordNotified(SigneeContext signeeContext, Guid? correspondenceId)
    {
        SigneeContextState state = signeeContext.SigneeState;
        state.HasBeenMessagedForCallToSign = true;
        state.CtaCorrespondenceId = correspondenceId;
        state.NotificationFailure = null;
        state.CallToSignFailedReason = null;
        telemetry?.RecordNotifySignees(Telemetry.NotifySigneesConst.NotifySigneesResult.Success);
    }

    /// <summary>
    /// Records why the call to action could not be sent to one signee. The notification is a courtesy: the signee
    /// can still sign without it, so the transition continues and the reason is shown with the signee's status
    /// instead of holding the whole task. Only a transient failure fails the step, for the engine to retry.
    /// </summary>
    private static void RecordNotificationFailure(
        SigneeContext signeeContext,
        NotificationFailureCode code,
        string reason
    )
    {
        SigneeContextState state = signeeContext.SigneeState;
        state.HasBeenMessagedForCallToSign = false;
        state.NotificationFailure = code;
        state.CallToSignFailedReason = reason;
    }
}
