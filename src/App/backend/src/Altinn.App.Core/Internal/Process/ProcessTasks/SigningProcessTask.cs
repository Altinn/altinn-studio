using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
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
    private readonly ISigneeContextsManager _signeeContextsManager;

    public SigningProcessTask(
        ISigningService signingService,
        IProcessReader processReader,
        IServiceProvider services,
        ILogger<SigningProcessTask> logger,
        IPdfService pdfService,
        ISigneeContextsManager signeeContextsManager
    )
    {
        _signingService = signingService;
        _processReader = processReader;
        // Startup has no request scope, so bind the factory fallback to this task's scope.
        _appImplementationFactory = new AppImplementationFactory(services);
        _logger = logger;
        _pdfService = pdfService;
        _signeeContextsManager = signeeContextsManager;
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
                    // The canonical configuration declares resources for staging and production only, and
                    // local development has no Correspondence service, so this is not a boot failure there.
                    _logger.LogWarning("Task {TaskId}: {Message}", taskId, message);
                }
            }
        }

        // The signature and signee-state data types should be app owned, so that the end user can't manipulate
        // the data. Tell the developer during development if this is not the case.
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

    /// <inheritdoc/>
    public async Task Start(ProcessTaskContext context)
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        CancellationToken cancellationToken = context.CancellationToken;
        string taskId = GetTaskId(dataMutator);
        AltinnSignatureConfiguration signingConfiguration = GetAltinnSignatureConfiguration(taskId);

        // Initialize delegated signing if configured
        if (
            signingConfiguration.SigneeProviderId is not null
            && signingConfiguration.SigneeStatesDataTypeId is not null
        )
        {
            await InitialiseRuntimeDelegatedSigning(dataMutator, signingConfiguration, cancellationToken);
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
        CancellationToken cancellationToken = context.CancellationToken;
        string taskId = GetTaskId(dataMutator);
        AltinnSignatureConfiguration? signatureConfiguration = _processReader
            .GetAltinnTaskExtension(taskId)
            ?.SignatureConfiguration;

        string? signingPdfDataType = signatureConfiguration?.SigningPdfDataType;

        if (signingPdfDataType is not null)
        {
            await using Stream pdfStream = await _pdfService.GeneratePdf(
                dataMutator,
                taskId,
                false,
                cancellationToken: cancellationToken
            );
            using var memoryStream = new MemoryStream();
            await pdfStream.CopyToAsync(memoryStream, cancellationToken);

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
            await _signingService.RevokeSigneeRightsOnTaskEnd(dataMutator, signatureConfiguration, cancellationToken);
        }
    }

    /// <inheritdoc/>
    public async Task Abandon(ProcessTaskContext context)
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        CancellationToken cancellationToken = context.CancellationToken;
        string taskId = GetTaskId(dataMutator);
        AltinnSignatureConfiguration signatureConfiguration = GetAltinnSignatureConfiguration(taskId);
        await _signingService.AbortRuntimeDelegatedSigning(dataMutator, signatureConfiguration, cancellationToken);
    }

    private async Task InitialiseRuntimeDelegatedSigning(
        IInstanceDataMutator cachedDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken cancellationToken
    )
    {
        List<SigneeContext> signeeContexts = await _signeeContextsManager.GenerateSigneeContexts(
            cachedDataMutator,
            signatureConfiguration,
            cancellationToken
        );

        await _signingService.InitializeSignees(
            cachedDataMutator,
            signeeContexts,
            signatureConfiguration,
            cancellationToken
        );
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
