using Altinn.App.Core.Features.AccessManagement;
using Altinn.App.Core.Features.Signing.Helpers;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Internal.AccessManagement.Models;
using Altinn.App.Core.Internal.AccessManagement.Models.Shared;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
using Microsoft.Extensions.Logging;
using static Altinn.App.Core.Features.Telemetry.DelegationConst;

namespace Altinn.App.Core.Features.Signing.Services;

internal sealed class SigningDelegationService(
    IAccessManagementClient accessManagementClient,
    ILogger<SigningDelegationService> logger,
    Telemetry? telemetry = null
) : ISigningDelegationService
{
    /// <inheritdoc />
    public async Task DelegateRights(
        string taskId,
        string instanceIdCombo,
        Guid instanceOwnerPartyUuid,
        AppIdentifier appIdentifier,
        List<SigneeContext> signeeContexts,
        Guid workflowId,
        CancellationToken ct
    )
    {
        using var activity = telemetry?.StartDelegateSigneeRightsActivity(taskId);
        Guid instanceGuid = ParseInstanceGuid(instanceIdCombo);
        var appResourceId = AppResourceId.FromAppIdentifier(appIdentifier);

        foreach (SigneeContext signeeContext in signeeContexts)
        {
            SigneeContextState state = signeeContext.SigneeState;
            if (state.IsAccessDelegated)
            {
                continue;
            }

            Party party = signeeContext.Signee.GetParty();
            Guid? partyUuid = party.PartyUuid;
            if (partyUuid is null)
            {
                RecordPermanentFailure(
                    state,
                    DelegationFailureCode.InvalidParty,
                    "The signee's party has no party uuid, so rights cannot be delegated to it.",
                    partyUuid,
                    instanceIdCombo,
                    taskId,
                    workflowId,
                    null
                );
                continue;
            }

            // Every grant is logged with what an out-of-band revoke needs, since a transition written off after a
            // failure leaves no other record of the rights it granted.
            logger.LogInformation(
                "Delegating signee rights to {PartyUuid} from {InstanceOwnerPartyUuid} for {AppResourceIdValue} on instance {InstanceId}, task {TaskId} (workflow {WorkflowId})",
                partyUuid,
                instanceOwnerPartyUuid,
                appResourceId.Value,
                instanceIdCombo,
                taskId,
                workflowId
            );

            DelegationRequest delegationRequest = new()
            {
                ResourceId = appResourceId.Value,
                InstanceId = instanceGuid.ToString(),
                From = new DelegationParty { Value = instanceOwnerPartyUuid.ToString() },
                To = new DelegationParty { Value = partyUuid.Value.ToString() },
                Rights = CreateRights(appIdentifier, taskId, signeeContext.AdditionalActionsToDelegate),
            };

            try
            {
                await accessManagementClient.DelegateRights(delegationRequest, ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                SigningFailureClassification classification = SigningFailureClassifier.ClassifyDelegation(ex, ct);
                if (classification.IsTransient)
                {
                    telemetry?.RecordDelegation(DelegationResult.Error);
                    throw;
                }

                RecordPermanentFailure(
                    state,
                    SigningFailureClassifier.DelegationCode(classification),
                    classification.Reason,
                    partyUuid,
                    instanceIdCombo,
                    taskId,
                    workflowId,
                    ex
                );
                continue;
            }

            state.IsAccessDelegated = true;
            state.DelegationFailure = null;
            state.DelegationFailedReason = null;
            telemetry?.RecordDelegation(DelegationResult.Success);
        }
    }

    /// <inheritdoc />
    public async Task<(List<SigneeContext>, bool success)> RevokeSigneeRights(
        string taskId,
        string instanceIdCombo,
        Guid instanceOwnerPartyUuid,
        AppIdentifier appIdentifier,
        List<SigneeContext> signeeContexts,
        CancellationToken ct
    )
    {
        using var activity = telemetry?.StartRevokeSigneeRightsActivity(taskId);
        Guid instanceGuid = ParseInstanceGuid(instanceIdCombo);

        var appResourceId = AppResourceId.FromAppIdentifier(appIdentifier);
        bool success = true;
        foreach (SigneeContext signeeContext in signeeContexts)
        {
            if (signeeContext.SigneeState.IsAccessDelegated is true)
            {
                Guid? partyUuid = signeeContext.Signee.GetParty().PartyUuid;
                logger.LogInformation(
                    "Revoking signee rights from {PartyUuid} to {AppResourceId} by {InstanceOwnerPartyUuid} on instance {InstanceId}, task {TaskId}",
                    partyUuid,
                    appResourceId.Value,
                    instanceOwnerPartyUuid,
                    instanceIdCombo,
                    taskId
                );
                try
                {
                    DelegationRequest delegationRequest = new()
                    {
                        ResourceId = appResourceId.Value,
                        InstanceId = instanceGuid.ToString(),
                        From = new DelegationParty { Value = instanceOwnerPartyUuid.ToString() },
                        To = new DelegationParty
                        {
                            Value =
                                partyUuid.ToString()
                                ?? throw new InvalidOperationException("Delegatee: PartyUuid is null"),
                        },
                        Rights = CreateRights(appIdentifier, taskId, signeeContext.AdditionalActionsToDelegate),
                    };
                    await accessManagementClient.RevokeRights(delegationRequest, ct);
                    signeeContext.SigneeState.IsAccessDelegated = false;
                    telemetry?.RecordDelegationRevoke(DelegationResult.Success);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Failed to revoke signee rights");
                    signeeContext.SigneeState.DelegationFailedReason = "Failed to revoke signee rights: " + ex.Message;
                    telemetry?.RecordDelegationRevoke(DelegationResult.Error);
                    success = false;
                }
            }
        }
        return (signeeContexts, success);
    }

    private void RecordPermanentFailure(
        SigneeContextState state,
        DelegationFailureCode code,
        string reason,
        Guid? partyUuid,
        string instanceIdCombo,
        string taskId,
        Guid workflowId,
        Exception? exception
    )
    {
        // A permanent per-signee failure never fails the step, so it never appears as an engine error: the log is
        // where ops sees it.
        logger.LogError(
            exception,
            "Delegation failed permanently for signee {PartyUuid} on instance {InstanceId}, task {TaskId} (workflow {WorkflowId}): {Reason}",
            partyUuid,
            instanceIdCombo,
            taskId,
            workflowId,
            reason
        );
        state.IsAccessDelegated = false;
        state.DelegationFailure = code;
        state.DelegationFailedReason = reason;
        telemetry?.RecordDelegation(DelegationResult.Error);
    }

    private static Guid ParseInstanceGuid(string instanceIdCombo)
    {
        try
        {
            return Guid.Parse(instanceIdCombo.Split("/")[1]);
        }
        catch
        {
            throw new ArgumentException("Invalid instanceId format", nameof(instanceIdCombo));
        }
    }

    private static List<RightRequest> CreateRights(
        AppIdentifier appIdentifier,
        string taskId,
        List<string>? additionalActions
    )
    {
        var resources = new List<Resource>
        {
            new AppResource { Value = appIdentifier.App },
            new OrgResource { Value = appIdentifier.Org },
            new TaskResource { Value = taskId },
        };

        List<RightRequest> rights =
        [
            new RightRequest
            {
                Resource = resources,
                Action = new AltinnAction { Value = ActionType.Read },
            },
            new RightRequest
            {
                Resource = resources,
                Action = new AltinnAction { Value = ActionType.Sign },
            },
        ];

        if (additionalActions is not null)
        {
            foreach (string action in additionalActions)
            {
                rights.Add(
                    new RightRequest
                    {
                        Resource = resources,
                        Action = new AltinnAction { Value = action },
                    }
                );
            }
        }

        return rights;
    }
}
