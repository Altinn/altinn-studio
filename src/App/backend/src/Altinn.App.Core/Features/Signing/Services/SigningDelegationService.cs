using Altinn.App.Core.Features.AccessManagement;
using Altinn.App.Core.Features.Signing.Helpers;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Internal.AccessManagement.Models;
using Altinn.App.Core.Internal.AccessManagement.Models.Shared;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Logging;
using static Altinn.App.Core.Features.Signing.Models.Signee;
using static Altinn.App.Core.Features.Telemetry.DelegationConst;

namespace Altinn.App.Core.Features.Signing.Services;

internal sealed class SigningDelegationService(
    IAccessManagementClient accessManagementClient,
    ILogger<SigningDelegationService> logger,
    Telemetry? telemetry = null
) : ISigningDelegationService
{
    public async Task DelegateSigneeRights(
        string taskId,
        string instanceIdCombo,
        Guid instanceOwnerPartyUuid,
        AppIdentifier appIdentifier,
        List<SigneeContext> signeeContexts,
        CancellationToken cancellationToken
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

            Guid? partyUuid = signeeContext.Signee.GetParty().PartyUuid;
            if (partyUuid is null)
            {
                state.DelegationFailedReason =
                    "Failed to delegate signee rights: the signee's party has no party UUID.";
                telemetry?.RecordDelegation(DelegationResult.Error);
                continue;
            }

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
                From = new DelegationParty { Value = instanceOwnerPartyUuid.ToString() },
                To = new DelegationParty { Value = partyUuid.Value.ToString() },
                Rights = CreateRights(appIdentifier, taskId, signeeContext.AdditionalActionsToDelegate),
            };

            try
            {
                // Access Management accepts a repeated grant, so a retry may delegate again to signees an
                // earlier attempt already reached.
                await accessManagementClient.DelegateRights(delegationRequest, cancellationToken);
                state.IsAccessDelegated = true;
                state.DelegatedToPartyUuid = partyUuid;
                state.DelegationFailedReason = null;
                telemetry?.RecordDelegation(DelegationResult.Success);
            }
            catch (Exception ex) when (SigningFailures.ConcernsOnlyTheSignee(ex))
            {
                // Retrying will not change Access Management's answer about this signee, and the others can still
                // sign. Anything else fails the step, so the workflow engine retries it.
                logger.LogError(ex, "Failed to delegate signee rights to {PartyUuid}", partyUuid);
                state.DelegationFailedReason = "Failed to delegate signee rights: " + ex.Message;
                telemetry?.RecordDelegation(DelegationResult.Error);
            }
            catch (Exception)
            {
                telemetry?.RecordDelegation(DelegationResult.Error);
                throw;
            }
        }
    }

    public async Task<(List<SigneeContext>, bool success)> RevokeSigneeRights(
        string taskId,
        string instanceIdCombo,
        Guid instanceOwnerPartyUuid,
        AppIdentifier appIdentifier,
        List<SigneeContext> signeeContexts,
        CancellationToken cancellationToken
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
                Guid? partyUuid = GetDelegatedPartyUuid(signeeContext);
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
                                partyUuid?.ToString()
                                ?? throw new InvalidOperationException("Delegatee: PartyUuid is null"),
                        },
                        Rights = CreateRights(appIdentifier, taskId, signeeContext.AdditionalActionsToDelegate),
                    };
                    await accessManagementClient.RevokeRights(delegationRequest, cancellationToken);
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

    /// <summary>
    /// Signee states saved before <see cref="SigneeContextState.DelegatedToPartyUuid"/> existed lack it, so the party is
    /// then derived from the signee. Rights for an organization signee went to the organization, also when a person
    /// later signed on its behalf.
    /// </summary>
    private static Guid? GetDelegatedPartyUuid(SigneeContext signeeContext) =>
        signeeContext.SigneeState.DelegatedToPartyUuid
        ?? signeeContext.Signee switch
        {
            PersonOnBehalfOfOrgSignee personOnBehalfOfOrgSignee => personOnBehalfOfOrgSignee
                .OnBehalfOfOrg
                .OrgParty
                .PartyUuid,
            _ => signeeContext.Signee.GetParty().PartyUuid,
        };

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
