using System.Diagnostics;
using System.Globalization;
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
    public async Task ExecuteDelegation(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        string taskId,
        Guid workflowId,
        CancellationToken ct
    )
    {
        List<SigneeContext> signeeContexts = await LoadSigneeState(instanceDataMutator, signatureConfiguration, taskId);

        if (signeeContexts.All(context => context.SigneeState.IsAccessDelegated))
        {
            return;
        }

        Guid instanceOwnerPartyUuid = await ResolveInstanceOwnerPartyUuid(instanceDataMutator.Instance, ct);

        // A permanent rejection of one signee is recorded on their state by the delegation service rather than
        // failing the step, so the other signees can still sign and the reason reaches the signing state API.
        // Transient failures are rethrown there for the engine to retry, and app-wide ones fail the step.
        await signingDelegationService.DelegateRights(
            taskId,
            instanceDataMutator.Instance.Id,
            instanceOwnerPartyUuid,
            new AppIdentifier(instanceDataMutator.Instance.AppId),
            signeeContexts,
            workflowId,
            ct
        );

        foreach (SigneeContext signeeContext in signeeContexts.Where(c => !c.SigneeState.IsAccessDelegated))
        {
            logger.LogWarning(
                "Rights could not be delegated to signee {SigneeId} on task {TaskId} (workflow {WorkflowId}): {Reason}",
                signeeContext.SigneeId,
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
        Guid workflowId,
        Guid stepId,
        CancellationToken ct
    )
    {
        List<SigneeContext> signeeContexts = await LoadSigneeState(instanceDataMutator, signatureConfiguration, taskId);

        // A signee whose delegation was permanently refused cannot sign, so there is nothing to call them to
        // action about; their failure is already persisted and reported on the signing state.
        List<SigneeContext> targets = signeeContexts
            .Where(context =>
                context.SigneeState.IsAccessDelegated && !context.SigneeState.HasBeenMessagedForCallToSign
            )
            .ToList();
        if (targets.Count == 0)
        {
            return;
        }

        Instance instance = instanceDataMutator.Instance;
        AppIdentifier appIdentifier = new(instance.AppId);
        InstanceIdentifier instanceIdentifier = new(instance);

        Party? serviceOwnerParty = await ResolveServiceOwnerParty(ct);
        if (serviceOwnerParty is null)
        {
            RecordAppWideNotificationFailure(
                targets,
                NotificationFailureCode.ServiceOwnerUnavailable,
                "The service owner's party could not be resolved.",
                instance,
                taskId,
                workflowId,
                stepId
            );
            await signeeContextsManager.PersistSigneeContexts(
                instanceDataMutator,
                signatureConfiguration,
                taskId,
                signeeContexts
            );
            return;
        }

        for (int index = 0; index < targets.Count; index++)
        {
            SigneeContext signeeContext = targets[index];
            Party signingParty = signeeContext.Signee.GetParty();
            string signeeIdentity =
                signingParty.PartyUuid?.ToString("D")
                ?? $"partyId:{signingParty.PartyId.ToString(CultureInfo.InvariantCulture)}";
            Guid idempotentKey = SigningIdempotencyKey.ForCallToAction(workflowId, stepId, signeeIdentity);

            try
            {
                SendCorrespondenceResponse? response = await signingCallToActionService.SendSignCallToAction(
                    signeeContext.CommunicationConfig,
                    appIdentifier,
                    instanceIdentifier,
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
                // A retried attempt re-sending what an earlier attempt sent before it failed. The message exists;
                // Correspondence does not replay its id.
                logger.LogInformation(
                    "Call to action for signee {PartyUuid} on task {TaskId} was already sent (idempotency key {IdempotentKey}).",
                    signingParty.PartyUuid,
                    taskId,
                    idempotentKey
                );
                RecordNotified(signeeContext, correspondenceId: null);
            }
            catch (Exception e)
            {
                SigningFailureClassification classification = SigningFailureClassifier.ClassifyNotification(e, ct);
                if (classification.IsTransient)
                {
                    // Nothing from this attempt is persisted; the retry re-sends with the same keys.
                    throw;
                }

                NotificationFailureCode code = SigningFailureClassifier.NotificationCode(classification);
                if (classification.Kind == SigningFailureKind.PermanentAppWide)
                {
                    logger.LogError(
                        e,
                        "Call to action cannot be sent for any signee of task {TaskId} on instance {InstanceId} (workflow {WorkflowId}, step {StepId}): {Reason}",
                        taskId,
                        instance.Id,
                        workflowId,
                        stepId,
                        classification.Reason
                    );
                    RecordAppWideNotificationFailure(
                        targets.Skip(index).ToList(),
                        code,
                        classification.Reason,
                        instance,
                        taskId,
                        workflowId,
                        stepId,
                        logOnce: false
                    );
                    break;
                }

                logger.LogError(
                    e,
                    "Call to action failed permanently for signee {PartyUuid} on task {TaskId} of instance {InstanceId} (workflow {WorkflowId}, step {StepId}): {Reason}",
                    signingParty.PartyUuid,
                    taskId,
                    instance.Id,
                    workflowId,
                    stepId,
                    classification.Reason
                );
                RecordNotificationFailure(signeeContext, code, classification.Reason);
            }
        }

        await signeeContextsManager.PersistSigneeContexts(
            instanceDataMutator,
            signatureConfiguration,
            taskId,
            signeeContexts
        );
    }

    /// <summary>
    /// Loads the task's signee state for the delegation and notification steps. Unlike
    /// <see cref="ResolveSignees"/>, a missing element is a permanent failure rather than a reason to resolve
    /// again: the resolve step publishes its state only after the element was saved, so a later step, retried or
    /// resumed, always receives a state that lists it.
    /// </summary>
    private async Task<List<SigneeContext>> LoadSigneeState(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        string taskId
    )
    {
        DataElement element =
            signeeContextsManager.FindTaskSigneeStateElement(instanceDataMutator, signatureConfiguration, taskId)
            ?? throw new SigneeInitializationPermanentException(
                $"No signee state element tagged with task '{taskId}' exists. The resolve step must complete before delegation and notification.",
                "SigneeStateMissing"
            );

        return await signeeContextsManager.LoadSigneeContexts(instanceDataMutator, signatureConfiguration, element);
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
    private void RecordNotificationFailure(SigneeContext signeeContext, NotificationFailureCode code, string reason)
    {
        SigneeContextState state = signeeContext.SigneeState;
        state.HasBeenMessagedForCallToSign = false;
        state.NotificationFailure = code;
        state.CallToSignFailedReason = reason;
        telemetry?.RecordNotifySignees(Telemetry.NotifySigneesConst.NotifySigneesResult.Error);
    }

    /// <summary>
    /// Records the same permanent reason on every signee the failure concerns: the app's configuration or
    /// credentials, or a dependency every signee needs. The transition still continues, since notification never
    /// blocks signing.
    /// </summary>
    private void RecordAppWideNotificationFailure(
        IReadOnlyList<SigneeContext> targets,
        NotificationFailureCode code,
        string reason,
        Instance instance,
        string taskId,
        Guid workflowId,
        Guid stepId,
        bool logOnce = true
    )
    {
        if (logOnce)
        {
            logger.LogError(
                "Call to action cannot be sent for any signee of task {TaskId} on instance {InstanceId} (workflow {WorkflowId}, step {StepId}): {Reason}",
                taskId,
                instance.Id,
                workflowId,
                stepId,
                reason
            );
        }

        foreach (SigneeContext target in targets)
        {
            RecordNotificationFailure(target, code, reason);
        }
    }
}
