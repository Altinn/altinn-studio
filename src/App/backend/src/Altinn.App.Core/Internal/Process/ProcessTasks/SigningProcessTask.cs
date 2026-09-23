using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks.Signing;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Represents the process task responsible for signing.
/// </summary>
/// <remarks>
/// Declares its work as commands. Runtime-delegated signing (a signee provider plus a signee-state data type
/// configured on the task) initializes its signees when the task is entered, revokes their access when it is
/// ended, and aborts with cleanup when it is abandoned; a task with a signing PDF data type generates that PDF
/// when it is ended. Configuration is validated once, at app startup.
/// </remarks>
internal sealed class SigningProcessTask : IPipelineProcessTask
{
    private readonly IProcessReader _processReader;
    private readonly IHostEnvironment _hostEnvironment;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly ILogger<SigningProcessTask> _logger;

    public SigningProcessTask(
        IProcessReader processReader,
        IHostEnvironment hostEnvironment,
        IServiceProvider services,
        ILogger<SigningProcessTask> logger
    )
    {
        _processReader = processReader;
        _hostEnvironment = hostEnvironment;
        // Startup has no HTTP request: bind the fallback to this scope instead of the root container.
        _appImplementationFactory = new AppImplementationFactory(services);
        _logger = logger;
    }

    public string Type => AltinnTaskTypes.Signing;

    /// <inheritdoc/>
    public IEnumerable<string> ValidateConfiguration(ProcessTaskValidationContext context)
    {
        string taskId = context.TaskId;
        AltinnSignatureConfiguration? configuration = _processReader
            .GetAltinnTaskExtension(taskId)
            ?.SignatureConfiguration;

        if (configuration is null)
        {
            yield return $"Task '{taskId}': SignatureConfig is missing in the signature process task configuration.";
            yield break;
        }

        string? signaturesDataType = configuration.SignatureDataType;
        string? signeeStatesDataTypeId = configuration.SigneeStatesDataTypeId;
        string? signeeProviderId = configuration.SigneeProviderId;

        if (signaturesDataType is null)
        {
            yield return $"Task '{taskId}': the {nameof(configuration.SignatureDataType)} property must be set in the signature configuration.";
        }

        if (signeeProviderId is null != signeeStatesDataTypeId is null)
        {
            yield return $"Task '{taskId}': both {nameof(configuration.SigneeProviderId)} and {nameof(configuration.SigneeStatesDataTypeId)} must either be set together, or left unset. These properties are required to enable delegation based signing.";
        }

        if (signeeProviderId is not null)
        {
            int providerCount = _appImplementationFactory
                .GetAll<ISigneeProvider>()
                .Count(provider => provider.Id == signeeProviderId);
            if (providerCount != 1)
            {
                yield return $"Task '{taskId}': expected exactly one {nameof(ISigneeProvider)} with id '{signeeProviderId}', found {providerCount}.";
            }

            string? correspondenceResource = AltinnTaskExtension
                .GetConfigForEnvironment(context.Environment, configuration.CorrespondenceResources)
                ?.Value;
            if (string.IsNullOrEmpty(correspondenceResource))
            {
                string message =
                    $"Task '{taskId}': no correspondence resource is configured for the {context.Environment} environment. "
                    + "Signees cannot be notified without one.";
                if (context.Environment is HostingEnvironment.Staging or HostingEnvironment.Production)
                {
                    yield return message;
                }
                else
                {
                    // The canonical configuration declares resources for staging and production only, and
                    // local development has no Correspondence service, so this is not a boot failure there.
                    _logger.LogWarning("{Message}", message);
                }
            }
        }

        // The signature and signee-state data types should be app owned, so that the end user can't manipulate
        // the data. Tell the developer during development if this is not the case.
        if (_hostEnvironment.IsDevelopment())
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
                    finding = $"Task '{taskId}': {e.Message}";
                }

                if (finding is not null)
                {
                    yield return finding;
                }
            }
        }
    }

    /// <inheritdoc/>
    /// <remarks>
    /// Three steps rather than one so that each commits its progress: a retry after the delegation step
    /// completed re-runs only the notification, and a resume after a terminal failure picks up at the failed step.
    /// </remarks>
    public ProcessPipeline DefineStartPipeline(string taskId, ProcessPipelineBuilder pipeline)
    {
        if (!SigningTaskConfiguration.IsRuntimeDelegated(GetConfiguration(taskId)))
        {
            return pipeline.Build();
        }

        string? payload = CommandPayloadSerializer.Serialize(new ProcessTaskPayload(taskId));
        return pipeline
            .Stage(new WorkflowCommandRef(ResolveSigneesCommand.Key, payload))
            .Stage(new WorkflowCommandRef(DelegateSigneeRightsCommand.Key, payload))
            .Stage(new WorkflowCommandRef(NotifySigneesCommand.Key, payload))
            .Build();
    }

    /// <inheritdoc/>
    public ProcessPipeline DefineEndPipeline(string taskId, ProcessPipelineBuilder pipeline)
    {
        AltinnSignatureConfiguration configuration = GetConfiguration(taskId);
        string? payload = CommandPayloadSerializer.Serialize(new ProcessTaskPayload(taskId));
        if (configuration.SigningPdfDataType is not null)
        {
            pipeline.Stage(new WorkflowCommandRef(GenerateSigningPdfCommand.Key, payload));
        }
        if (SigningTaskConfiguration.IsRuntimeDelegated(configuration))
        {
            pipeline.Stage(new WorkflowCommandRef(RevokeSigneeRightsCommand.Key, payload));
        }
        return pipeline.Build();
    }

    /// <inheritdoc/>
    /// <remarks>Every signing task can have signatures to remove, including tasks without delegation.</remarks>
    public ProcessPipeline DefineAbandonPipeline(string taskId, ProcessPipelineBuilder pipeline) =>
        pipeline
            .Stage(
                new WorkflowCommandRef(
                    AbortRuntimeDelegatedSigningCommand.Key,
                    CommandPayloadSerializer.Serialize(new ProcessTaskPayload(taskId))
                )
            )
            .Build();

    private AltinnSignatureConfiguration GetConfiguration(string taskId) =>
        SigningTaskConfiguration.Get(_processReader, taskId);
}
