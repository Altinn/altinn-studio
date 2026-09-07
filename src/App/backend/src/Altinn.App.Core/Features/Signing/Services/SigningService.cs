using System.Diagnostics;
using Altinn.App.Core.Features.Signing.Exceptions;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using static Altinn.App.Core.Features.Signing.Models.Signee;

namespace Altinn.App.Core.Features.Signing.Services;

/// <summary>
/// Reads signee state and revokes or aborts runtime-delegated signing. Signee initialization lives in
/// <see cref="ISigneeInitializationService"/>, run as the signing task's start commands.
/// </summary>
internal sealed class SigningService(
    IHostEnvironment hostEnvironment,
    IAltinnPartyClient altinnPartyClient,
    ISigningDelegationService signingDelegationService,
    IAuthorizationClient authorizationClient,
    ILogger<SigningService> logger,
    ISigneeContextsManager signeeContextsManager,
    ISignDocumentManager signDocumentManager,
    Telemetry? telemetry = null
) : ISigningService
{
    private readonly ILogger<SigningService> _logger = logger;
    private readonly ISigneeContextsManager _signeeContextsManager = signeeContextsManager;
    private readonly ISignDocumentManager _signDocumentManager = signDocumentManager;
    private readonly IHostEnvironment _hostEnvironment = hostEnvironment;

    /// <inheritdoc />
    public async Task<List<SigneeContext>> GetSigneeContexts(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken ct = default
    )
    {
        using Activity? activity = telemetry?.StartReadSigneesActivity();
        List<SigneeContext> signeeContexts = await _signeeContextsManager.GetSigneeContexts(
            instanceDataAccessor,
            signatureConfiguration,
            ct
        );

        List<SignDocument> signDocuments = await _signDocumentManager.GetSignDocuments(
            instanceDataAccessor,
            signatureConfiguration,
            ct
        );

        signeeContexts = await _signDocumentManager.SynchronizeSigneeContextsWithSignDocuments(
            instanceDataAccessor.TaskId ?? instanceDataAccessor.Instance.Process.CurrentTask.ElementId,
            signeeContexts,
            signDocuments,
            ct
        );

        return signeeContexts;
    }

    /// <inheritdoc />
    public async Task<List<OrganizationSignee>> GetAuthorizedOrganizationSignees(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signatureConfiguration,
        int userId,
        CancellationToken ct = default
    )
    {
        using var activity = telemetry?.StartReadAuthorizedSigneesActivity();
        List<SigneeContext> signeeContexts = await _signeeContextsManager.GetSigneeContexts(
            instanceDataAccessor,
            signatureConfiguration,
            ct
        );

        List<OrganizationSignee> orgSignees = [.. signeeContexts.Select(x => x.Signee).OfType<OrganizationSignee>()];
        List<string> orgNumbers = [.. orgSignees.Select(x => x.OrgNumber)];

        List<string> keyRoleOrganizations = await authorizationClient.GetKeyRoleOrganizationParties(userId, orgNumbers);

        List<OrganizationSignee> authorizedOrganizations =
        [
            .. orgSignees.Where(organizationSignee => keyRoleOrganizations.Contains(organizationSignee.OrgNumber)),
        ];

        return authorizedOrganizations;
    }

    /// <inheritdoc />
    public async Task AbortRuntimeDelegatedSigning(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken ct = default
    )
    {
        string taskId = GetTaskId(instanceDataMutator);

        using var activity = telemetry?.StartAbortRuntimeDelegatedSigningActivity(taskId);

        // Revoke must run before cleanup, since it reads signee state that cleanup removes.
        await RevokeDelegatedSigneeRights(instanceDataMutator, signatureConfiguration, taskId, ct);

        // cleanup
        RemoveSigneeState(instanceDataMutator, signatureConfiguration.SigneeStatesDataTypeId);
        RemoveAllSignatures(instanceDataMutator, signatureConfiguration.SignatureDataType);
    }

    /// <inheritdoc />
    public async Task RevokeSigneeRightsOnTaskEnd(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken ct = default
    )
    {
        string taskId = GetTaskId(instanceDataMutator);

        using var activity = telemetry?.StartRevokeSigneeRightsOnTaskEndActivity(taskId);

        await RevokeDelegatedSigneeRights(instanceDataMutator, signatureConfiguration, taskId, ct);
    }

    /// <summary>
    /// Gets the id of the task currently being processed.
    /// </summary>
    /// <remarks>
    /// <see cref="IInstanceDataAccessor.TaskId"/> is used instead of <c>Instance.Process.CurrentTask</c>,
    /// because the latter may already have been moved to the next task (or cleared if the process ended)
    /// by the time task end/abandon handlers run.
    /// </remarks>
    private static string GetTaskId(IInstanceDataAccessor instanceDataAccessor) =>
        instanceDataAccessor.TaskId
        ?? instanceDataAccessor.Instance.Process.CurrentTask?.ElementId
        ?? throw new SigningException("Unable to determine the task ID for signee rights revocation.");

    private async Task RevokeDelegatedSigneeRights(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        string taskId,
        CancellationToken ct
    )
    {
        try
        {
            List<SigneeContext> signeeContexts = await GetSigneeContexts(
                instanceDataMutator,
                signatureConfiguration,
                ct: ct
            );
            List<SigneeContext> signeeContextsWithDelegation =
            [
                .. signeeContexts.Where(x => x.SigneeState.IsAccessDelegated),
            ];

            if (signeeContextsWithDelegation.IsNullOrEmpty())
            {
                _logger.LogInformation(
                    "Didn't find any signee contexts with delegated access rights. Nothing to revoke."
                );
                return;
            }

            string instanceIdCombo = instanceDataMutator.Instance.Id;
            InstanceOwner instanceOwner = instanceDataMutator.Instance.InstanceOwner;
            Party instanceOwnerParty =
                await GetInstanceOwnerParty(instanceOwner)
                ?? throw new SigningException(
                    "Failed to lookup instance owner party. Unable to revoke signing rights."
                );

            Guid instanceOwnerPartyUuid =
                instanceOwnerParty.PartyUuid
                ?? throw new SigningException(
                    "PartyUuid was missing on instance owner party. Unable to revoke signing rights."
                );

            AppIdentifier appIdentifier = new(instanceDataMutator.Instance.AppId);

            await signingDelegationService.RevokeSigneeRights(
                taskId,
                instanceIdCombo,
                instanceOwnerPartyUuid,
                appIdentifier,
                signeeContextsWithDelegation,
                ct
            );
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            // Revocation failure shouldn't block the process from progressing past task end/abandon.
            // Any remaining delegated rights can be cleaned up by a later run or out-of-band.
            _logger.LogError(ex, "Failed to revoke delegated signee rights for task {TaskId}.", taskId);
        }
    }

    private async Task<Party?> GetInstanceOwnerParty(InstanceOwner instanceOwner)
    {
        using var activity = telemetry?.StartGetInstanceOwnerPartyActivity();
        if (instanceOwner.OrganisationNumber == "ttd" && _hostEnvironment.IsProduction() is false)
        {
            // Testdepartementet is often used in test environments, it does not have an organization number, so we use Digitaliseringsdirektoratet's orgnr instead.
            instanceOwner.OrganisationNumber = "991825827";
        }

        try
        {
            return await altinnPartyClient.LookupParty(
                !string.IsNullOrEmpty(instanceOwner.OrganisationNumber)
                    ? new PartyLookup { OrgNo = instanceOwner.OrganisationNumber }
                    : new PartyLookup { Ssn = instanceOwner.PersonNumber }
            );
        }
        catch (Exception)
        {
            _logger.LogError("Failed to look up party for instance owner.");
            throw new SigningException("Failed to lookup party information for instance owner.");
        }
    }

    /// <summary>
    /// Removes the signee state when runtime-delegated signing is aborted. Initialization never calls this:
    /// <see cref="ISigneeInitializationService"/> resumes from an existing element instead.
    /// </summary>
    private void RemoveSigneeState(IInstanceDataMutator instanceDataMutator, string? signeeStatesDataTypeId)
    {
        using Activity? activity = telemetry?.StartRemoveSigneeStateActivity();

        if (string.IsNullOrEmpty(signeeStatesDataTypeId))
        {
            return;
        }

        List<DataElement> signeeStateDataElements = instanceDataMutator
            .GetDataElementsForType(signeeStatesDataTypeId)
            .ToList();

        foreach (DataElement signeeStateDataElement in signeeStateDataElements)
        {
            instanceDataMutator.RemoveDataElement(signeeStateDataElement);
        }
    }

    private void RemoveAllSignatures(IInstanceDataMutator instanceDataMutator, string signatureDataType)
    {
        using Activity? activity = telemetry?.StartRemoveAllSignaturesActivity(signatureDataType);

        if (string.IsNullOrEmpty(signatureDataType))
        {
            return;
        }

        IEnumerable<DataElement> signatures = instanceDataMutator.GetDataElementsForType(signatureDataType);

        foreach (DataElement signature in signatures)
        {
            instanceDataMutator.RemoveDataElement(signature);
        }
    }
}
