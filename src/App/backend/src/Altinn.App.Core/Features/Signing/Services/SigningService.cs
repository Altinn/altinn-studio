using System.Diagnostics;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Exceptions;
using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Features.Signing.Exceptions;
using Altinn.App.Core.Features.Signing.Extensions;
using Altinn.App.Core.Features.Signing.Helpers;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Internal.AltinnCdn;
using Altinn.App.Core.Internal.App;
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
    public async Task InitializeSignees(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        Guid stepId,
        CancellationToken cancellationToken = default
    )
    {
        using Activity? activity = telemetry?.StartAssignSigneesActivity();

        string taskId = GetTaskId(instanceDataMutator);
        string signeeStateDataTypeId = GetSigneeStatesDataTypeId(signatureConfiguration);

        RemoveSigneeState(instanceDataMutator, signeeStateDataTypeId);
        List<SigneeContext> signeeContexts = await _signeeContextsManager.GenerateSigneeContexts(
            instanceDataMutator,
            signatureConfiguration,
            cancellationToken
        );
        await DelegateRights(instanceDataMutator.Instance, taskId, signeeContexts, cancellationToken);
        await SendCallsToSign(
            instanceDataMutator.Instance,
            signatureConfiguration,
            signeeContexts,
            stepId,
            cancellationToken
        );
        AddSigneeState(instanceDataMutator, signeeStateDataTypeId, taskId, signeeContexts);
    }

    /// <inheritdoc />
    public async Task ResolveSignees(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken cancellationToken = default
    )
    {
        using Activity? activity = telemetry?.StartAssignSigneesActivity();

        string taskId = GetTaskId(instanceDataMutator);
        string signeeStateDataTypeId = GetSigneeStatesDataTypeId(signatureConfiguration);

        RemoveSigneeState(instanceDataMutator, signeeStateDataTypeId);
        List<SigneeContext> signeeContexts = await _signeeContextsManager.GenerateSigneeContexts(
            instanceDataMutator,
            signatureConfiguration,
            cancellationToken
        );
        AddSigneeState(instanceDataMutator, signeeStateDataTypeId, taskId, signeeContexts);
    }

    /// <inheritdoc />
    public async Task DelegateSigneeRights(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken cancellationToken = default
    )
    {
        (DataElement? signeeStateElement, List<SigneeContext> signeeContexts) = await ReadSigneeState(
            instanceDataMutator,
            signatureConfiguration,
            cancellationToken
        );
        if (signeeStateElement is null || signeeContexts.All(context => context.SigneeState.IsAccessDelegated))
        {
            return;
        }

        await DelegateRights(
            instanceDataMutator.Instance,
            GetTaskId(instanceDataMutator),
            signeeContexts,
            cancellationToken
        );
        WriteSigneeState(instanceDataMutator, signeeStateElement, signeeContexts);
    }

    /// <inheritdoc />
    public async Task NotifySignees(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        Guid stepId,
        CancellationToken cancellationToken = default
    )
    {
        (DataElement? signeeStateElement, List<SigneeContext> signeeContexts) = await ReadSigneeState(
            instanceDataMutator,
            signatureConfiguration,
            cancellationToken
        );
        if (signeeStateElement is null || !signeeContexts.Any(IsAwaitingCallToSign))
        {
            return;
        }

        await SendCallsToSign(
            instanceDataMutator.Instance,
            signatureConfiguration,
            signeeContexts,
            stepId,
            cancellationToken
        );
        WriteSigneeState(instanceDataMutator, signeeStateElement, signeeContexts);
    }

    private async Task DelegateRights(
        Instance instance,
        string taskId,
        List<SigneeContext> signeeContexts,
        CancellationToken cancellationToken
    )
    {
        if (signeeContexts.All(context => context.SigneeState.IsAccessDelegated))
        {
            return;
        }

        Party instanceOwnerParty =
            await GetInstanceOwnerParty(instance.InstanceOwner, cancellationToken)
            ?? throw new SigningException("Failed to lookup instance owner party. Unable to delegate signing rights.");
        Guid instanceOwnerPartyUuid =
            instanceOwnerParty.PartyUuid
            ?? throw new SigningException(
                "PartyUuid was missing on instance owner party. Unable to delegate signing rights."
            );

        await signingDelegationService.DelegateSigneeRights(
            taskId,
            instance.Id,
            instanceOwnerPartyUuid,
            new AppIdentifier(instance.AppId),
            signeeContexts,
            cancellationToken
        );
    }

    /// <summary>
    /// A signee whose delegation failed cannot sign, so there is nothing to call them to action about.
    /// </summary>
    private static bool IsAwaitingCallToSign(SigneeContext signeeContext) =>
        signeeContext.SigneeState is { IsAccessDelegated: true, HasBeenMessagedForCallToSign: false };

    private async Task SendCallsToSign(
        Instance instance,
        AltinnSignatureConfiguration signatureConfiguration,
        List<SigneeContext> signeeContexts,
        Guid stepId,
        CancellationToken cancellationToken
    )
    {
        List<SigneeContext> pending = [.. signeeContexts.Where(IsAwaitingCallToSign)];
        if (pending.Count == 0)
        {
            return;
        }

        Party serviceOwnerParty;
        try
        {
            serviceOwnerParty = await GetServiceOwnerParty(cancellationToken);
        }
        catch (Exception e) when (!SigningFailures.IsTransient(e))
        {
            // Retrying will not make the sender resolvable. The signees can still sign without the message.
            _logger.LogError(e, "Failed to look up party for service owner. No signee will be notified.");
            foreach (SigneeContext signeeContext in pending)
            {
                RecordCallToSignFailure(signeeContext, "The service owner's party could not be resolved.");
            }
            return;
        }

        AppIdentifier appIdentifier = new(instance.AppId);
        InstanceIdentifier instanceIdentifier = new(instance);
        foreach (SigneeContext signeeContext in pending)
        {
            Party signingParty = signeeContext.Signee.GetParty();
            try
            {
                SendCorrespondenceResponse? response = await _signingCallToActionService.SendSignCallToAction(
                    signeeContext.CommunicationConfig,
                    appIdentifier,
                    instanceIdentifier,
                    signingParty,
                    serviceOwnerParty,
                    signatureConfiguration.CorrespondenceResources,
                    CreateCallToActionIdempotentKey(stepId, signingParty),
                    cancellationToken
                );
                signeeContext.SigneeState.CtaCorrespondenceId = response?.Correspondences.Single().CorrespondenceId;
                signeeContext.SigneeState.HasBeenMessagedForCallToSign = true;
                signeeContext.SigneeState.CallToSignFailedReason = null;
                telemetry?.RecordNotifySignees(Telemetry.NotifySigneesConst.NotifySigneesResult.Success);
            }
            catch (Exception e) when (SigningFailures.IsAlreadySent(e))
            {
                // An earlier attempt of this step sent the message before it failed on a later signee.
                signeeContext.SigneeState.HasBeenMessagedForCallToSign = true;
                signeeContext.SigneeState.CallToSignFailedReason = null;
            }
            catch (Exception e) when (!SigningFailures.IsTransient(e))
            {
                // Retrying will not change the answer, and the signee can still sign without the message. A
                // transient failure fails the step instead, so the workflow engine retries it with the same keys.
                _logger.LogError(e, "Correspondence send failed: {Exception}", e.Message);
                RecordCallToSignFailure(
                    signeeContext,
                    e is ConfigurationException ? "Correspondence configuration error." : "Correspondence send failed."
                );
            }
        }
    }

    /// <summary>
    /// The idempotency key for one signee's call to action, stable across retries of the step that sends it and
    /// different for every other step, so a new visit to the task notifies everyone again.
    /// </summary>
    internal static Guid CreateCallToActionIdempotentKey(Guid stepId, Party signingParty)
    {
        string signee =
            signingParty.PartyUuid?.ToString("D")
            ?? $"partyId:{signingParty.PartyId.ToString(CultureInfo.InvariantCulture)}";
        Span<byte> hash = stackalloc byte[SHA256.HashSizeInBytes];
        SHA256.HashData(Encoding.UTF8.GetBytes($"signing-call-to-action:{stepId:D}:{signee}"), hash);
        return new Guid(hash[..16]);
    }

    private void RecordCallToSignFailure(SigneeContext signeeContext, string reason)
    {
        signeeContext.SigneeState.HasBeenMessagedForCallToSign = false;
        signeeContext.SigneeState.CallToSignFailedReason = reason;
        telemetry?.RecordNotifySignees(Telemetry.NotifySigneesConst.NotifySigneesResult.Error);
    }

    /// <summary>
    /// The task's signee-state element and the signee contexts in it, or no element when the task has none.
    /// </summary>
    private async Task<(DataElement? Element, List<SigneeContext> SigneeContexts)> ReadSigneeState(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken cancellationToken
    )
    {
        DataElement? element = instanceDataMutator
            .GetDataElementsForType(GetSigneeStatesDataTypeId(signatureConfiguration))
            .SingleOrDefault();
        if (element is null)
        {
            return (null, []);
        }

        List<SigneeContext> signeeContexts = await _signeeContextsManager.GetSigneeContexts(
            instanceDataMutator,
            signatureConfiguration,
            cancellationToken
        );
        return (element, signeeContexts);
    }

    private void AddSigneeState(
        IInstanceDataMutator instanceDataMutator,
        string signeeStateDataTypeId,
        string taskId,
        List<SigneeContext> signeeContexts
    )
    {
        ApplicationMetadata applicationMetadata = _appMetadata.ApplicationMetadata;
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
    }

    private static void WriteSigneeState(
        IInstanceDataMutator instanceDataMutator,
        DataElement signeeStateElement,
        List<SigneeContext> signeeContexts
    ) =>
        instanceDataMutator.UpdateBinaryDataElement(
            signeeStateElement,
            signeeStateElement.ContentType ?? ApplicationJsonContentType,
            JsonSerializer.SerializeToUtf8Bytes(signeeContexts, _jsonSerializerOptions)
        );

    private static string GetSigneeStatesDataTypeId(AltinnSignatureConfiguration signatureConfiguration) =>
        signatureConfiguration.SigneeStatesDataTypeId
        ?? throw new ApplicationConfigException("SigneeStatesDataTypeId is not set in the signature configuration.");

    /// <inheritdoc />
    public async Task<List<SigneeContext>> GetSigneeContexts(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken cancellationToken = default
    )
    {
        using Activity? activity = telemetry?.StartReadSigneesActivity();
        List<SigneeContext> signeeContexts = await _signeeContextsManager.GetSigneeContexts(
            instanceDataAccessor,
            signatureConfiguration,
            cancellationToken
        );

        List<SignDocument> signDocuments = await _signDocumentManager.GetSignDocuments(
            instanceDataAccessor,
            signatureConfiguration,
            cancellationToken
        );

        signeeContexts = await _signDocumentManager.SynchronizeSigneeContextsWithSignDocuments(
            instanceDataAccessor.TaskId ?? instanceDataAccessor.Instance.Process.CurrentTask.ElementId,
            signeeContexts,
            signDocuments,
            cancellationToken
        );

        return signeeContexts;
    }

    /// <inheritdoc />
    public async Task<List<OrganizationSignee>> GetAuthorizedOrganizationSignees(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signatureConfiguration,
        int userId,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = telemetry?.StartReadAuthorizedSigneesActivity();
        List<SigneeContext> signeeContexts = await _signeeContextsManager.GetSigneeContexts(
            instanceDataAccessor,
            signatureConfiguration,
            cancellationToken
        );

        List<OrganizationSignee> orgSignees = [.. signeeContexts.Select(x => x.Signee).OfType<OrganizationSignee>()];
        List<string> orgNumbers = [.. orgSignees.Select(x => x.OrgNumber)];

        List<string> keyRoleOrganizations = await authorizationClient.GetKeyRoleOrganizationParties(
            userId,
            orgNumbers,
            cancellationToken
        );

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
        CancellationToken cancellationToken = default
    )
    {
        string taskId = GetTaskId(instanceDataMutator);

        using var activity = telemetry?.StartAbortRuntimeDelegatedSigningActivity(taskId);

        // Revoke must run before cleanup, since it reads signee state that cleanup removes.
        await RevokeDelegatedSigneeRights(instanceDataMutator, signatureConfiguration, taskId, cancellationToken);

        // cleanup
        RemoveSigneeState(instanceDataMutator, signatureConfiguration.SigneeStatesDataTypeId);
        RemoveAllSignatures(instanceDataMutator, signatureConfiguration.SignatureDataType);
    }

    /// <inheritdoc />
    public async Task RevokeSigneeRightsOnTaskEnd(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken cancellationToken = default
    )
    {
        string taskId = GetTaskId(instanceDataMutator);

        using var activity = telemetry?.StartRevokeSigneeRightsOnTaskEndActivity(taskId);

        await RevokeDelegatedSigneeRights(instanceDataMutator, signatureConfiguration, taskId, cancellationToken);
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
        CancellationToken cancellationToken
    )
    {
        try
        {
            List<SigneeContext> signeeContexts = await GetSigneeContexts(
                instanceDataMutator,
                signatureConfiguration,
                cancellationToken: cancellationToken
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
                await GetInstanceOwnerParty(instanceOwner, cancellationToken)
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
                cancellationToken
            );
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
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

    private async Task<Party?> GetInstanceOwnerParty(InstanceOwner instanceOwner, CancellationToken cancellationToken)
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
                    : new PartyLookup { Ssn = instanceOwner.PersonNumber },
                cancellationToken: cancellationToken
            );
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Failed to look up party for instance owner.");
            throw new SigningException("Failed to lookup party information for instance owner.", e);
        }
    }

    internal async Task<Party> GetServiceOwnerParty(CancellationToken cancellationToken)
    {
        using var activity = telemetry?.StartGetServiceOwnerPartyActivity();
        try
        {
            AltinnCdnOrgDetails? serviceOwnerDetails = await _altinnCdnClient.GetOrgDetails(cancellationToken);
            PartyLookup partyLookup = new() { OrgNo = serviceOwnerDetails?.Orgnr };
            Party serviceOwnerParty = await altinnPartyClient.LookupParty(
                partyLookup,
                cancellationToken: cancellationToken
            );

            telemetry?.RecordGetServiceOwnerParty(Telemetry.ServiceOwnerPartyConst.ServiceOwnerPartyResult.Success);
            return serviceOwnerParty;
        }
        catch (Exception)
        {
            telemetry?.RecordGetServiceOwnerParty(Telemetry.ServiceOwnerPartyConst.ServiceOwnerPartyResult.Error);
            throw;
        }
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
