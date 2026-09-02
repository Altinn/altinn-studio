using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing.Extensions;
using Altinn.App.Core.Features.Signing.Helpers;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Sign;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using StorageSignee = Altinn.Platform.Storage.Interface.Models.Signee;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// The signing task: a signing round that waits for signatures through a workflow-engine mailbox. The opening
/// stage publishes the mailbox in the signing-state data element; each forwarded sign message becomes a signature
/// document, and the round concludes once the required signatures are present.
/// </summary>
internal sealed class SigningServiceTask : IPipelineServiceTask
{
    private readonly ISigningService _signingService;
    private readonly IProcessReader _processReader;
    private readonly IAppMetadata _appMetadata;
    private readonly IHostEnvironment _hostEnvironment;
    private readonly IPdfService _pdfService;
    private readonly ISigneeContextsManager _signeeContextsManager;
    private readonly ISignDocumentManager _signDocumentManager;
    private readonly ISigningReceiptService _signingReceiptService;
    private readonly ILogger<SigningServiceTask> _logger;

    private static readonly JsonSerializerOptions _signDocumentSerializerOptions = new(JsonSerializerOptions.Web)
    {
        WriteIndented = true,
    };

    private static readonly JsonSerializerOptions _signMessageSerializerOptions = new()
    {
        RespectNullableAnnotations = true,
    };

    /// <summary>
    /// How long a signing round accepts signatures. Fourteen days sits inside the engine's <c>MaxMailboxTimeout</c>
    /// (21 days), which app startup cannot check. See <see cref="MailboxOptions.Timeout"/>.
    /// </summary>
    internal static readonly TimeSpan SigningRoundTimeout = TimeSpan.FromDays(14);

    public SigningServiceTask(
        ISigningService signingService,
        IProcessReader processReader,
        IAppMetadata appMetadata,
        IHostEnvironment hostEnvironment,
        IPdfService pdfService,
        ISigneeContextsManager signeeContextsManager,
        ISignDocumentManager signDocumentManager,
        ISigningReceiptService signingReceiptService,
        ILogger<SigningServiceTask> logger
    )
    {
        _signingService = signingService;
        _processReader = processReader;
        _appMetadata = appMetadata;
        _hostEnvironment = hostEnvironment;
        _pdfService = pdfService;
        _signeeContextsManager = signeeContextsManager;
        _signDocumentManager = signDocumentManager;
        _signingReceiptService = signingReceiptService;
        _logger = logger;
    }

    public string Type => "signing";

    private const string PdfContentType = "application/pdf";
    private const string JsonContentType = "application/json";

    /// <inheritdoc />
    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
        pipeline
            .Stage(OpenSigningRound, new MailboxOptions { Timeout = SigningRoundTimeout }, out MailboxHandle round)
            .ConcludeOnReplies(round, onMessage: HandleSignMessage, onClosed: HandleRoundClosed);

    /// <inheritdoc/>
    public async Task Start(ProcessTaskContext context)
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        CancellationToken ct = context.CancellationToken;
        string taskId = GetTaskId(dataMutator);
        AltinnSignatureConfiguration signingConfiguration = GetAltinnSignatureConfiguration(taskId);
        ApplicationMetadata appMetadata = await _appMetadata.GetApplicationMetadata();

        ValidateSigningConfiguration(appMetadata, signingConfiguration);

        // Initialize delegated signing if configured
        if (
            signingConfiguration.SigneeProviderId is not null
            && signingConfiguration.SigneeStatesDataTypeId is not null
        )
        {
            await InitialiseRuntimeDelegatedSigning(dataMutator, signingConfiguration, ct);
        }
    }

    /// <inheritdoc/>
    /// <remarks>
    /// Generates a PDF if the signature configuration specifies a signature data type, and revokes any
    /// signee access rights that were delegated for runtime delegated signing, so they don't outlive the task.
    /// </remarks>
    public async Task End(ProcessTaskContext context)
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        CancellationToken ct = context.CancellationToken;
        string taskId = GetTaskId(dataMutator);
        AltinnSignatureConfiguration? signatureConfiguration = _processReader
            .GetAltinnTaskExtension(taskId)
            ?.SignatureConfiguration;

        string? signingPdfDataType = signatureConfiguration?.SigningPdfDataType;

        if (signingPdfDataType is not null)
        {
            await using Stream pdfStream = await _pdfService.GeneratePdf(dataMutator, taskId, false, ct: ct);
            using var memoryStream = new MemoryStream();
            await pdfStream.CopyToAsync(memoryStream, ct);

            UpsertTaskGeneratedBinaryDataElement(
                dataMutator,
                signingPdfDataType,
                PdfContentType,
                signingPdfDataType + ".pdf",
                memoryStream.ToArray(),
                taskId
            );
        }

        // Revoke delegated signing if configured
        if (
            signatureConfiguration?.SigneeProviderId is not null
            && signatureConfiguration.SigneeStatesDataTypeId is not null
        )
        {
            await _signingService.RevokeSigneeRightsOnTaskEnd(dataMutator, signatureConfiguration, ct);
        }
    }

    /// <inheritdoc/>
    public async Task Abandon(ProcessTaskContext context)
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        CancellationToken ct = context.CancellationToken;
        string taskId = GetTaskId(dataMutator);
        AltinnSignatureConfiguration signatureConfiguration = GetAltinnSignatureConfiguration(taskId);
        await _signingService.AbortRuntimeDelegatedSigning(dataMutator, signatureConfiguration, ct);
    }

    /// <summary>
    /// Publishes the mailbox as the signing-state element. Replacing any existing element of that type first is
    /// what keeps a retried or deferred attempt, handed the same mailbox, from duplicating it.
    /// </summary>
    private async Task<ServiceTaskOpeningStageResult> OpenSigningRound(
        ServiceTaskContext context,
        ServiceTaskMailbox mailbox
    )
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        string taskId = GetTaskId(dataMutator);
        string? signingStateDataType = _processReader
            .GetAltinnTaskExtension(taskId)
            ?.SignatureConfiguration?.SigningStateDataType;

        if (signingStateDataType is null)
        {
            return ServiceTaskOpeningStageResult.FailedPermanent(
                $"The signature configuration of task '{taskId}' has no "
                    + $"{nameof(AltinnSignatureConfiguration.SigningStateDataType)} element, so the signing round has "
                    + "no data element to publish its mailbox in."
            );
        }

        ApplicationMetadata appMetadata = await _appMetadata.GetApplicationMetadata();
        dataMutator.OverrideAuthenticationMethodForRestrictedDataTypes(
            appMetadata,
            [signingStateDataType],
            StorageAuthenticationMethod.ServiceOwner()
        );

        foreach (DataElement existing in dataMutator.GetDataElementsForType(signingStateDataType).ToList())
        {
            dataMutator.RemoveDataElement(existing);
        }

        dataMutator.AddBinaryDataElement(
            signingStateDataType,
            JsonContentType,
            filename: null,
            bytes: JsonSerializer.SerializeToUtf8Bytes(new SigningRoundState(taskId, mailbox.Id, mailbox.Deadline)),
            generatedFromTask: taskId
        );

        return ServiceTaskOpeningStageResult.Completed();
    }

    /// <summary>
    /// The round ended without the required signatures. Both closure reasons are the same outcome for this task;
    /// only the wording differs.
    /// </summary>
    private Task<ServiceTaskResult> HandleRoundClosed(ServiceTaskContext context, MailboxClosedReason reason)
    {
        string cause =
            reason == MailboxClosedReason.Deadline
                ? $"the round stayed open for {SigningRoundTimeout.TotalDays:0} days without the required signatures arriving"
                : "the round was closed before the required signatures arrived";

        return Task.FromResult<ServiceTaskResult>(
            ServiceTaskResult.FailedPermanent(
                $"The signing round did not complete: {cause}. The signatures the round did receive are stored on "
                    + "the instance; manual follow-up is required."
            )
        );
    }

    /// <summary>
    /// Turns one sign message into a signature document. Every step is idempotent for a redelivered or retried
    /// message: the signed time is the message's accepted time, documents by the same signee are replaced, and the
    /// receipt is keyed on the message id.
    /// </summary>
    private async Task<ServiceTaskExchangeResult> HandleSignMessage(ServiceTaskContext context, ServiceTaskReply reply)
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        CancellationToken ct = context.CancellationToken;

        if (ReadSignMessage(reply, out string? problem) is not { } message)
        {
            return ServiceTaskResult.FailedPermanent(
                $"The message delivered under id '{reply.IdempotencyKey}' cannot be handled as a sign message: "
                    + $"{problem} Delivering it again produces the same result."
            );
        }

        Instance instance = dataMutator.Instance;
        string taskId = GetTaskId(dataMutator);
        AltinnSignatureConfiguration signatureConfiguration = GetAltinnSignatureConfiguration(taskId);
        string signatureDataType =
            signatureConfiguration.SignatureDataType
            ?? throw new ApplicationConfigException("SignatureDataType is not set in the signature configuration.");
        ApplicationMetadata appMetadata = await _appMetadata.GetApplicationMetadata();

        List<DataType> dataTypesToSign = SignatureRequestHelper.GetDataTypesToSign(appMetadata, signatureConfiguration);
        List<DataElementSignature> dataElementSignatures = SignatureRequestHelper.GetDataElementSignatures(
            instance.Data,
            dataTypesToSign
        );

        if (!dataElementSignatures.Select(x => x.DataElementId).ToHashSet().SetEquals(message.DataElementIds))
        {
            return ServiceTaskResult.FailedPermanent(
                $"The sign message delivered under id '{reply.IdempotencyKey}' was made for data elements "
                    + $"[{string.Join(", ", message.DataElementIds)}], but the task's dataTypesToSign now resolve to "
                    + $"[{string.Join(", ", dataElementSignatures.Select(x => x.DataElementId))}]. The signing "
                    + "configuration changed during the round; manual follow-up is required."
            );
        }

        // A receive step handles exactly one message, so the step id is unique per message and stable across its
        // attempts: a retry produces a byte-identical document.
        var signDocument = new SignDocument
        {
            Id = context.StepId.ToString(),
            InstanceGuid = new InstanceIdentifier(instance).InstanceGuid.ToString(),
            SignedTime = reply.AcceptedAt.UtcDateTime,
            SigneeInfo = message.Signee.ToStorageSignee(),
            DataElementSignatures =
            [
                .. await Task.WhenAll(
                    dataElementSignatures.Select(signature => HashDataElement(dataMutator, signature.DataElementId))
                ),
            ],
        };

        dataMutator.OverrideAuthenticationMethodForRestrictedDataTypes(
            appMetadata,
            [signatureDataType],
            StorageAuthenticationMethod.ServiceOwner()
        );

        DataElement[] signatureElements = dataMutator.GetDataElementsForType(signatureDataType).ToArray();
        SignDocument[] existingDocuments = await Task.WhenAll(
            signatureElements.Select(async element =>
                SignDocumentManager.Deserialize(await dataMutator.GetBinaryData(element))
            )
        );

        List<SignDocument> signDocuments = [];
        for (int i = 0; i < signatureElements.Length; i++)
        {
            if (SigneesAreEqual(existingDocuments[i].SigneeInfo, signDocument.SigneeInfo))
            {
                dataMutator.RemoveDataElement(signatureElements[i]);
            }
            else
            {
                signDocuments.Add(existingDocuments[i]);
            }
        }

        signDocuments.Add(signDocument);

        dataMutator.AddBinaryDataElement(
            signatureDataType,
            JsonContentType,
            $"{signatureDataType}.json",
            JsonSerializer.SerializeToUtf8Bytes(signDocument, _signDocumentSerializerOptions),
            generatedFromTask: taskId
        );

        if (signatureConfiguration.CorrespondenceResources is { Count: > 0 } correspondenceResources)
        {
            try
            {
                await _signingReceiptService.SendSignatureReceipt(
                    message.Signee.ToSignee(),
                    dataElementSignatures,
                    dataMutator,
                    message.Language,
                    reply.IdempotencyKey,
                    correspondenceResources,
                    ct
                );
            }
            catch (Exception e)
            {
                _logger.LogError(
                    e,
                    "Failed to send the signature receipt for sign message {IdempotencyKey}: {ErrorMessage}",
                    reply.IdempotencyKey,
                    e.Message
                );
            }
        }

        // The element added above is not visible through the accessor until the save, so the completion rule is
        // evaluated over the documents this execution knows: the ones kept, plus the one just built.
        List<SigneeContext> signeeContexts = await _signDocumentManager.SynchronizeSigneeContextsWithSignDocuments(
            taskId,
            await _signeeContextsManager.GetSigneeContexts(dataMutator, signatureConfiguration, ct),
            signDocuments,
            ct
        );

        DataType signatureDataTypeDefinition =
            appMetadata.DataTypes.FirstOrDefault(x => x.Id == signatureDataType)
            ?? throw new ApplicationConfigException("Didn't find signature data type in app metadata");

        int signedCount = signeeContexts.Count(signeeContext => signeeContext.SignDocument is not null);
        bool haveMinimumAmountOfSignatures = signedCount >= signatureDataTypeDefinition.MinCount;
        bool allSigneesHaveSigned = signeeContexts.All(signeeContext => signeeContext.SignDocument is not null);

        return haveMinimumAmountOfSignatures && allSigneesHaveSigned
            ? ServiceTaskResult.Success()
            : ServiceTaskExchangeResult.AwaitNextReply();
    }

    private SignMessage? ReadSignMessage(ServiceTaskReply reply, out string? problem)
    {
        SignMessage? message;
        try
        {
            message = JsonSerializer.Deserialize<SignMessage>(reply.Payload, _signMessageSerializerOptions);
        }
        catch (JsonException e)
        {
            _logger.LogError(
                e,
                "Error deserializing the sign message delivered under id {IdempotencyKey}: {ErrorMessage}",
                reply.IdempotencyKey,
                e.Message
            );
            problem = "the payload is not a well-formed sign message.";
            return null;
        }

        if (message is null)
        {
            problem = "the payload is empty.";
            return null;
        }

        if (message.Version != SignMessage.CurrentVersion)
        {
            problem = $"it is version {message.Version}, and this app handles version {SignMessage.CurrentVersion}.";
            return null;
        }

        problem = null;
        return message;
    }

    private static async Task<SignDocument.DataElementSignature> HashDataElement(
        IInstanceDataAccessor dataAccessor,
        string dataElementId
    )
    {
        ReadOnlyMemory<byte> bytes = await dataAccessor.GetBinaryData(new DataElementIdentifier(dataElementId));
        return new SignDocument.DataElementSignature
        {
            DataElementId = dataElementId,
            Sha256Hash = SignatureHashHelper.GenerateSha256Hash(bytes.Span),
            Signed = true,
        };
    }

    /// <summary>Storage's replace rule: a document is the same signee's when all four identity fields match.</summary>
    private static bool SigneesAreEqual(StorageSignee a, StorageSignee b) =>
        a.UserId == b.UserId
        && a.SystemUserId == b.SystemUserId
        && a.PersonNumber == b.PersonNumber
        && a.OrganisationNumber == b.OrganisationNumber;

    private async Task InitialiseRuntimeDelegatedSigning(
        IInstanceDataMutator cachedDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken ct
    )
    {
        List<SigneeContext> signeeContexts = await _signeeContextsManager.GenerateSigneeContexts(
            cachedDataMutator,
            signatureConfiguration,
            ct
        );

        await _signingService.InitializeSignees(cachedDataMutator, signeeContexts, signatureConfiguration, ct);
    }

    private AltinnSignatureConfiguration GetAltinnSignatureConfiguration(string taskId)
    {
        AltinnSignatureConfiguration? signatureConfiguration = _processReader
            .GetAltinnTaskExtension(taskId)
            ?.SignatureConfiguration;

        if (signatureConfiguration is null)
        {
            throw new ApplicationConfigException(
                "SignatureConfig is missing in the signature process task configuration."
            );
        }

        return signatureConfiguration;
    }

    private void ValidateSigningConfiguration(
        ApplicationMetadata appMetadata,
        AltinnSignatureConfiguration signatureConfiguration
    )
    {
        string? signaturesDataType = signatureConfiguration.SignatureDataType;
        string? signingStateDataType = signatureConfiguration.SigningStateDataType;
        string? signeeStatesDataTypeId = signatureConfiguration.SigneeStatesDataTypeId;
        string? signeeProviderId = signatureConfiguration.SigneeProviderId;

        if (signaturesDataType is null)
        {
            throw new ApplicationConfigException(
                $"The {nameof(signatureConfiguration.SignatureDataType)} property must be set in the signature configuration."
            );
        }

        if (signingStateDataType is null)
        {
            throw new ApplicationConfigException(
                $"The {nameof(signatureConfiguration.SigningStateDataType)} property must be set in the signature configuration."
            );
        }

        // The signatures and signing state data types should be app owned, so that the end user can't manipulate the data. Tell the developer during development if this is not the case.
        if (_hostEnvironment.IsDevelopment())
        {
            AllowedContributorsHelper.EnsureDataTypeIsAppOwned(appMetadata, signaturesDataType);
            AllowedContributorsHelper.EnsureDataTypeIsAppOwned(appMetadata, signingStateDataType);
        }

        if (signeeProviderId is null != signeeStatesDataTypeId is null)
        {
            throw new ApplicationConfigException(
                $"Both {nameof(signatureConfiguration.SigneeProviderId)} and {nameof(signatureConfiguration.SigneeStatesDataTypeId)} must either be set together, or left unset. These properties are required to enable delegation based signing."
            );
        }

        // The signee state data type should be app owned, so that the end user can't manipulate the data. Tell the developer during development if this is not the case.
        if (_hostEnvironment.IsDevelopment())
        {
            AllowedContributorsHelper.EnsureDataTypeIsAppOwned(appMetadata, signeeStatesDataTypeId);
        }
    }

    private static string GetTaskId(IInstanceDataAccessor dataAccessor) =>
        dataAccessor.TaskId
        ?? dataAccessor.Instance.Process?.CurrentTask?.ElementId
        ?? throw new InvalidOperationException("Process task requires a current task id.");

    /// <summary>
    /// Adds the element, or updates it if one tagged with this task already exists. The update branch
    /// is retry idempotency, not re-entry protection: a re-run of a partially completed transition
    /// (this command succeeded and committed the element, a later command in the transition failed)
    /// finds the earlier attempt's element and overwrites it instead of duplicating it. Stale elements
    /// from previous visits never reach this point - CleanupGeneratedFromTask removes them when the
    /// task is entered.
    /// </summary>
    private static void UpsertTaskGeneratedBinaryDataElement(
        IInstanceDataMutator dataMutator,
        string dataTypeId,
        string contentType,
        string fileName,
        ReadOnlyMemory<byte> bytes,
        string taskId
    )
    {
        DataElement? existingDataElement = dataMutator.Instance.Data.SingleOrDefault(de =>
            de.DataType == dataTypeId
            && de.References?.Exists(reference =>
                reference.Relation == RelationType.GeneratedFrom
                && reference.ValueType == ReferenceType.Task
                && reference.Value == taskId
            )
                is true
        );

        if (existingDataElement is not null)
        {
            dataMutator.UpdateBinaryDataElement(existingDataElement, contentType, bytes);
            return;
        }

        dataMutator.AddBinaryDataElement(dataTypeId, contentType, fileName, bytes, generatedFromTask: taskId);
    }
}
