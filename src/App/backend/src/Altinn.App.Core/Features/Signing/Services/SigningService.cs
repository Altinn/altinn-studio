using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Exceptions;
using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Features.Signing.Exceptions;
using Altinn.App.Core.Features.Signing.Extensions;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Internal.AltinnCdn;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using static Altinn.App.Core.Features.Signing.Models.Signee;

namespace Altinn.App.Core.Features.Signing.Services;

internal sealed class SigningService(
    IHostEnvironment hostEnvironment,
    IAltinnPartyClient altinnPartyClient,
    IAltinnCdnClient altinnCdnClient,
    ISigningDelegationService signingDelegationService,
    IAppMetadata appMetadata,
    ISigningCallToActionService signingCallToActionService,
    IAuthorizationClient authorizationClient,
    ILogger<SigningService> logger,
    ISigneeContextsManager signeeContextsManager,
    ISignDocumentManager signDocumentManager,
    Telemetry? telemetry = null
) : ISigningService
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(
        new JsonSerializerOptions
        {
            Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
            PropertyNameCaseInsensitive = true,
            WriteIndented = true,
            ReferenceHandler = ReferenceHandler.Preserve,
            MaxDepth = 16,
        }
    );
    private readonly ILogger<SigningService> _logger = logger;
    private readonly ISigneeContextsManager _signeeContextsManager = signeeContextsManager;
    private readonly ISignDocumentManager _signDocumentManager = signDocumentManager;
    private readonly IHostEnvironment _hostEnvironment = hostEnvironment;
    private readonly IAltinnCdnClient _altinnCdnClient = altinnCdnClient;
    private readonly IAppMetadata _appMetadata = appMetadata;
    private readonly ISigningCallToActionService _signingCallToActionService = signingCallToActionService;
    private const string ApplicationJsonContentType = "application/json";

    /// <inheritdoc />
    public async Task<List<SigneeContext>> InitializeSignees(
        IInstanceDataMutator instanceDataMutator,
        List<SigneeContext> signeeContexts,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken ct = default
    )
    {
        using Activity? activity = telemetry?.StartAssignSigneesActivity();

        string taskId = instanceDataMutator.Instance.Process.CurrentTask.ElementId;

        string signeeStateDataTypeId =
            signatureConfiguration.SigneeStatesDataTypeId
            ?? throw new ApplicationConfigException(
                "SigneeStatesDataTypeId is not set in the signature configuration."
            );

        RemoveSigneeState(instanceDataMutator, signeeStateDataTypeId);

        string instanceIdCombo = instanceDataMutator.Instance.Id;
        InstanceOwner instanceOwner = instanceDataMutator.Instance.InstanceOwner;
        Party? instanceOwnerParty = await GetInstanceOwnerParty(instanceOwner);
        Guid? instanceOwnerPartyUuid = instanceOwnerParty?.PartyUuid;
        AppIdentifier appIdentifier = new(instanceDataMutator.Instance.AppId);

        (signeeContexts, bool delegateSuccess) = await signingDelegationService.DelegateSigneeRights(
            taskId,
            instanceIdCombo,
            instanceOwnerPartyUuid,
            appIdentifier,
            signeeContexts,
            ct
        );

        Party? serviceOwnerParty = null;
        bool getServiceOwnerSuccess = false;

        if (delegateSuccess)
        {
            (serviceOwnerParty, getServiceOwnerSuccess) = await GetServiceOwnerParty(ct);
        }

        if (getServiceOwnerSuccess && serviceOwnerParty is not null)
        {
            foreach (SigneeContext signeeContext in signeeContexts)
            {
                if (signeeContext.SigneeState.HasBeenMessagedForCallToSign)
                {
                    continue;
                }

                try
                {
                    Party signingParty = signeeContext.Signee.GetParty();

                    SendCorrespondenceResponse? response = await _signingCallToActionService.SendSignCallToAction(
                        signeeContext.CommunicationConfig,
                        appIdentifier,
                        new InstanceIdentifier(instanceDataMutator.Instance),
                        signingParty,
                        serviceOwnerParty,
                        signatureConfiguration.CorrespondenceResources,
                        ct
                    );
                    signeeContext.SigneeState.CtaCorrespondenceId = response?.Correspondences.Single().CorrespondenceId;
                    signeeContext.SigneeState.HasBeenMessagedForCallToSign = true;
                    telemetry?.RecordNotifySignees(Telemetry.NotifySigneesConst.NotifySigneesResult.Success);
                }
                catch (ConfigurationException e)
                {
                    _logger.LogError(e, "Correspondence configuration error: {Exception}", e.Message);
                    signeeContext.SigneeState.HasBeenMessagedForCallToSign = false;
                    signeeContext.SigneeState.CallToSignFailedReason = $"Correspondence configuration error.";
                    telemetry?.RecordNotifySignees(Telemetry.NotifySigneesConst.NotifySigneesResult.Error);
                }
                catch (Exception e)
                {
                    _logger.LogError(e, "Correspondence send failed: {Exception}", e.Message);
                    signeeContext.SigneeState.HasBeenMessagedForCallToSign = false;
                    signeeContext.SigneeState.CallToSignFailedReason = $"Correspondence configuration error.";
                    telemetry?.RecordNotifySignees(Telemetry.NotifySigneesConst.NotifySigneesResult.Error);
                }
            }
        }

        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();
        instanceDataMutator.OverrideAuthenticationMethodForRestrictedDataTypes(
            applicationMetadata,
            [signeeStateDataTypeId],
            StorageAuthenticationMethod.ServiceOwner()
        );

        instanceDataMutator.AddBinaryDataElement(
            dataTypeId: signeeStateDataTypeId,
            contentType: ApplicationJsonContentType,
            filename: null,
            bytes: JsonSerializer.SerializeToUtf8Bytes(signeeContexts, _jsonSerializerOptions),
            generatedFromTask: taskId
        );

        return signeeContexts;
    }

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

            Guid instanceOwnerPartyUuid = instanceOwnerParty.PartyUuid;

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

    internal async Task<(Party? serviceOwnerParty, bool success)> GetServiceOwnerParty(CancellationToken ct)
    {
        using var activity = telemetry?.StartGetServiceOwnerPartyActivity();
        Party serviceOwnerParty;
        try
        {
            AltinnCdnOrgDetails? serviceOwnerDetails = await _altinnCdnClient.GetOrgDetails(ct);
            PartyLookup partyLookup = new() { OrgNo = serviceOwnerDetails?.Orgnr };
            serviceOwnerParty = await altinnPartyClient.LookupParty(partyLookup);

            telemetry?.RecordGetServiceOwnerParty(Telemetry.ServiceOwnerPartyConst.ServiceOwnerPartyResult.Success);
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Failed to look up party for service owner.");
            telemetry?.RecordGetServiceOwnerParty(Telemetry.ServiceOwnerPartyConst.ServiceOwnerPartyResult.Error);
            return (null, false);
        }

        return (serviceOwnerParty, true);
    }

    /// <summary>
    /// Stale signee states are normally already gone (via CleanupGeneratedFromTask callback),
    /// but initialization must be able to start from a clean slate regardless of how it was reached.
    /// </summary>
    private void RemoveSigneeState(IInstanceDataMutator instanceDataMutator, string? signeeStatesDataTypeId)
    {
        using Activity? activity = telemetry?.StartRemoveSigneeStateActivity();

        if (string.IsNullOrEmpty(signeeStatesDataTypeId))
        {
            return;
        }

        IEnumerable<DataElement> signeeStateDataElements = instanceDataMutator.GetDataElementsForType(
            signeeStatesDataTypeId
        );

        DataElement? signeeStateDataElement = signeeStateDataElements.SingleOrDefault();
        if (signeeStateDataElement is not null)
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
