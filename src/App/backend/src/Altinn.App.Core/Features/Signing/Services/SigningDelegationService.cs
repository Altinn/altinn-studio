using Altinn.App.Core.Features.AccessManagement;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Internal.AccessManagement.Models;
using Altinn.App.Core.Internal.AccessManagement.Models.Shared;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Logging;
using static Altinn.App.Core.Features.Telemetry.DelegationConst;

namespace Altinn.App.Core.Features.Signing.Services;

internal sealed class SigningDelegationService(
    IAccessManagementClient accessManagementClient,
    ILogger<SigningDelegationService> logger,
    Telemetry? telemetry = null
) : ISigningDelegationService
{
    public async Task<(List<SigneeContext>, bool success)> DelegateSigneeRights(
        string taskId,
        string instanceIdCombo,
        Guid? instanceOwnerPartyUuid,
        AppIdentifier appIdentifier,
        List<SigneeContext> signeeContexts,
        CancellationToken ct
    )
    {
        using var activity = telemetry?.StartDelegateSigneeRightsActivity(taskId);
        if (instanceOwnerPartyUuid is null)
        {
            signeeContexts.ForEach(signeeContext =>
            {
                signeeContext.SigneeState.DelegationFailedReason =
                    "Failed to delegate signee rights: Instance owner party UUID is null and cannot be used for delegating access.";
                signeeContext.SigneeState.IsAccessDelegated = false;
            });

            return (signeeContexts, false);
        }

        Guid instanceGuid = ParseInstanceGuid(instanceIdCombo);

        var appResourceId = AppResourceId.FromAppIdentifier(appIdentifier);
        bool success = true;

        foreach (SigneeContext signeeContext in signeeContexts)
        {
            SigneeContextState state = signeeContext.SigneeState;

            try
            {
                if (state.IsAccessDelegated is false)
                {
                    Guid? partyUuid = signeeContext.Signee.GetParty().PartyUuid;
                    logger.LogInformation(
                        "Delegating signee rights to {PartyUuid} from {InstanceOwnerPartyUuid} for {AppResourceIdValue}",
                        partyUuid,
                        instanceOwnerPartyUuid,
                        appResourceId.Value
                    );

                    DelegationRequest delegationRequest = new()
                    {
                        ResourceId = appResourceId.Value,
                        InstanceId = instanceGuid.ToString(),
                        From = new DelegationParty { Value = instanceOwnerPartyUuid.Value.ToString() },
                        To = new DelegationParty
                        {
                            Value =
                                partyUuid.ToString()
                                ?? throw new InvalidOperationException("Delegatee: PartyUuid is null"),
                        },
                        Rights = CreateRights(appIdentifier, taskId),
                    };
                    await accessManagementClient.DelegateRights(delegationRequest, ct);
                    state.IsAccessDelegated = true;
                    telemetry?.RecordDelegation(DelegationResult.Success);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to delegate signee rights");
                state.DelegationFailedReason = "Failed to delegate signee rights: " + ex.Message;
                telemetry?.RecordDelegation(DelegationResult.Error);
                success = false;
            }
        }

        return (signeeContexts, success);
    }

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
                    "Revoking signee rights from {PartyUuid} to {AppResourceId} by {InstanceOwnerPartyUuid}",
                    partyUuid,
                    appResourceId.Value,
                    instanceOwnerPartyUuid
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
                        Rights = CreateRights(appIdentifier, taskId),
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

    private static List<RightRequest> CreateRights(AppIdentifier appIdentifier, string taskId)
    {
        var resources = new List<Resource>
        {
            new AppResource { Value = appIdentifier.App },
            new OrgResource { Value = appIdentifier.Org },
            new TaskResource { Value = taskId },
        };

        return
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
    }
}
