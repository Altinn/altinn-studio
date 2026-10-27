using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Represents the process task responsible for signing.
/// </summary>
internal sealed class SigningProcessTask : IProcessTask
{
    private readonly ISigningService _signingService;
    private readonly IProcessReader _processReader;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly ILogger<SigningProcessTask> _logger;
    private readonly IPdfService _pdfService;

    public SigningProcessTask(
        ISigningService signingService,
        IProcessReader processReader,
        IServiceProvider services,
        ILogger<SigningProcessTask> logger,
        IPdfService pdfService
    )
    {
        _signingService = signingService;
        _processReader = processReader;
        // Use this task's scope when no HTTP request scope is available during startup.
        _appImplementationFactory = new AppImplementationFactory(services);
        _logger = logger;
        _pdfService = pdfService;
    }

    public string Type => "signing";

    private const string PdfContentType = "application/pdf";

    /// <inheritdoc/>
    public IEnumerable<string> ValidateConfiguration(ProcessTaskValidationContext context)
    {
        string taskId = context.TaskId;
        AltinnSignatureConfiguration? configuration = _processReader
            .GetAltinnTaskExtension(taskId)
            ?.SignatureConfiguration;

        if (configuration is null)
        {
            yield return "SignatureConfig is missing in the signature process task configuration.";
            yield break;
        }

        string? signaturesDataType = configuration.SignatureDataType;
        string? signeeStatesDataTypeId = configuration.SigneeStatesDataTypeId;
        string? signeeProviderId = configuration.SigneeProviderId;

        if (signaturesDataType is null)
        {
            yield return $"The {nameof(configuration.SignatureDataType)} property must be set in the signature configuration.";
        }

        if (signeeProviderId is null != signeeStatesDataTypeId is null)
        {
            yield return $"Both {nameof(configuration.SigneeProviderId)} and {nameof(configuration.SigneeStatesDataTypeId)} must either be set together, or left unset. These properties are required to enable delegation based signing.";
        }

        if (signeeProviderId is not null)
        {
            int providerCount = _appImplementationFactory
                .GetAll<ISigneeProvider>()
                .Count(provider => provider.Id == signeeProviderId);
            if (providerCount != 1)
            {
                yield return $"Expected exactly one {nameof(ISigneeProvider)} with id '{signeeProviderId}', found {providerCount}.";
            }

            string? correspondenceResource = AltinnTaskExtension
                .GetConfigForEnvironment(context.Environment, configuration.CorrespondenceResources)
                ?.Value;
            if (string.IsNullOrEmpty(correspondenceResource))
            {
                string message =
                    $"No correspondence resource is configured for the {context.Environment} environment. "
                    + "Signees cannot be notified without one.";
                if (context.Environment is HostingEnvironment.Staging or HostingEnvironment.Production)
                {
                    yield return message;
                }
                else
                {
                    // Local development has no Correspondence service. Require a resource only in staging
                    // and production.
                    _logger.LogWarning("Task {TaskId}: {Message}", taskId, message);
                }
            }
        }

        // Require app-owned signing data types during development to prevent users from changing signing
        // data.
        if (context.Environment == HostingEnvironment.Development)
        {
            foreach (string? dataType in new[] { signaturesDataType, signeeStatesDataTypeId })
            {
                string? finding = null;
                try
                {
                    AllowedContributorsHelper.EnsureDataTypeIsAppOwned(context.ApplicationMetadata, dataType);
                }
                catch (ApplicationConfigException e)
                {
                    finding = e.Message;
                }

                if (finding is not null)
                {
                    yield return finding;
                }
            }
        }
    }

    /// <summary>
    /// Initializing runtime delegated signing takes three steps, each saved on its own so a failure retries only
    /// the step that failed: resolving the signees, delegating them the right to sign, and notifying them. A task
    /// without runtime delegated signing has the same steps, which do nothing; the stages must not depend on the
    /// task's configuration, since a step is dispatched by its position.
    /// </summary>
    public ProcessTaskPipeline DefineStart(PipelineBuilder pipeline) =>
        pipeline
            .Stage(ResolveSignees, _perSigneeCallsStepOptions)
            .Stage(DelegateSigneeRights, _perSigneeCallsStepOptions)
            .Stage(NotifySignees, _perSigneeCallsStepOptions)
            .Build();

    /// <summary>
    /// A stage that makes one platform call per signee gets more time than the engine's default.
    /// </summary>
    private static readonly ProcessStepOptions _perSigneeCallsStepOptions = new()
    {
        MaxExecutionTime = TimeSpan.FromMinutes(5),
    };

    private async Task<StageResult> ResolveSignees(StageContext context)
    {
        if (GetRuntimeDelegatedSigningConfiguration(context) is { } configuration)
        {
            await _signingService.ResolveSignees(context.InstanceDataMutator, configuration, context.CancellationToken);
        }

        return StageResult.Completed();
    }

    private async Task<StageResult> DelegateSigneeRights(StageContext context)
    {
        if (GetRuntimeDelegatedSigningConfiguration(context) is { } configuration)
        {
            await _signingService.DelegateSigneeRights(
                context.InstanceDataMutator,
                configuration,
                context.CancellationToken
            );
        }

        return StageResult.Completed();
    }

    private async Task<StageResult> NotifySignees(StageContext context)
    {
        if (GetRuntimeDelegatedSigningConfiguration(context) is { } configuration)
        {
            await _signingService.NotifySignees(
                context.InstanceDataMutator,
                configuration,
                context.StepId,
                context.CancellationToken
            );
        }

        return StageResult.Completed();
    }

    private AltinnSignatureConfiguration? GetRuntimeDelegatedSigningConfiguration(StageContext context)
    {
        AltinnSignatureConfiguration configuration = GetAltinnSignatureConfiguration(
            GetTaskId(context.InstanceDataMutator)
        );
        return configuration is { SigneeProviderId: not null, SigneeStatesDataTypeId: not null } ? configuration : null;
    }

    /// <summary>
    /// Ending the task stores the signing PDF, when the configuration names a data type for it, and then revokes the
    /// rights runtime delegated signing gave the signees, so they do not outlive the task. Two stages, so the PDF is
    /// saved before the revocation's platform calls begin and a retry of those does not render it again.
    /// </summary>
    public ProcessTaskPipeline DefineEnd(PipelineBuilder pipeline) =>
        pipeline.Stage(StoreSigningPdf).Stage(RevokeSigneeRights, _perSigneeCallsStepOptions).Build();

    /// <summary>
    /// Abandoning the task revokes the rights runtime delegated signing gave the signees and removes the signee state
    /// and the signatures. One stage: the revocation reads the signee state the removal takes away, and a retry does
    /// both again without harm.
    /// </summary>
    public ProcessTaskPipeline DefineAbandon(PipelineBuilder pipeline) =>
        pipeline.Stage(AbortRuntimeDelegatedSigning, _perSigneeCallsStepOptions).Build();

    private async Task<StageResult> StoreSigningPdf(StageContext context)
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        string taskId = GetTaskId(dataMutator);
        string? signingPdfDataType = _processReader
            .GetAltinnTaskExtension(taskId)
            ?.SignatureConfiguration?.SigningPdfDataType;
        if (signingPdfDataType is null)
        {
            return StageResult.Completed();
        }

        // The actor's language, the one the user chose for the transition, or nb if it has none
        byte[] pdf = await _pdfService.GeneratePdf(
            dataMutator.Instance,
            taskId,
            language: dataMutator.Language ?? LanguageConst.Nb,
            cancellationToken: context.CancellationToken
        );
        UpsertTaskGeneratedBinaryDataElement(
            dataMutator,
            signingPdfDataType,
            PdfContentType,
            signingPdfDataType + ".pdf",
            pdf,
            taskId
        );
        return StageResult.Completed();
    }

    private async Task<StageResult> RevokeSigneeRights(StageContext context)
    {
        if (GetRuntimeDelegatedSigningConfiguration(context) is { } configuration)
        {
            await _signingService.RevokeSigneeRightsOnTaskEnd(
                context.InstanceDataMutator,
                configuration,
                context.CancellationToken
            );
        }

        return StageResult.Completed();
    }

    private async Task<StageResult> AbortRuntimeDelegatedSigning(StageContext context)
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        AltinnSignatureConfiguration configuration = GetAltinnSignatureConfiguration(GetTaskId(dataMutator));
        await _signingService.AbortRuntimeDelegatedSigning(dataMutator, configuration, context.CancellationToken);
        return StageResult.Completed();
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
