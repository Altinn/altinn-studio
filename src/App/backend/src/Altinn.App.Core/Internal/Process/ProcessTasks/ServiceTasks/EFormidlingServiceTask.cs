using Altinn.App.Core.Constants;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;

internal interface IEFormidlingServiceTask : IServiceTask { }

/// <summary>
/// Service task that sends eFormidling shipment, if EFormidling is enabled in config.
/// </summary>
internal sealed class EFormidlingServiceTask : IEFormidlingServiceTask
{
    private readonly ILogger<EFormidlingServiceTask> _logger;
    private readonly IProcessReader _processReader;
    private readonly IHostEnvironment _hostEnvironment;
    private readonly IEFormidlingService? _eFormidlingService;

    /// <summary>
    /// Initializes a new instance of the <see cref="EFormidlingServiceTask"/> class.
    /// </summary>
    public EFormidlingServiceTask(
        ILogger<EFormidlingServiceTask> logger,
        IProcessReader processReader,
        IHostEnvironment hostEnvironment,
        IEFormidlingService? eFormidlingService = null
    )
    {
        _logger = logger;
        _processReader = processReader;
        _hostEnvironment = hostEnvironment;
        _eFormidlingService = eFormidlingService;
    }

    /// <inheritdoc />
    public string Type => "eFormidling";

    /// <inheritdoc/>
    public async Task<ServiceTaskResult> Execute(ServiceTaskContext context)
    {
        if (_eFormidlingService is null)
        {
            throw new ProcessException(
                $"No implementation of {nameof(IEFormidlingService)} has been added to the DI container. Remember to add eFormidling services. Use AddEFormidlingServices2<TM,TR> to register eFormidling services."
            );
        }

        string taskId = context.InstanceDataMutator.Instance.Process.CurrentTask.ElementId;
        Instance instance = context.InstanceDataMutator.Instance;
        ValidAltinnEFormidlingConfiguration configuration = await GetValidAltinnEFormidlingConfiguration(taskId);

        if (configuration.Disabled)
        {
            _logger.LogInformation(
                "EFormidling is disabled for task {TaskId}. No eFormidling shipment will be sent, but the service task will be completed.",
                LogSanitizer.Sanitize(taskId)
            );
            return ServiceTaskResult.Success();
        }

        _logger.LogDebug(
            "Calling eFormidlingService for eFormidling Service Task {TaskId}.",
            LogSanitizer.Sanitize(taskId)
        );
        await _eFormidlingService.SendEFormidlingShipment(instance, configuration);
        _logger.LogDebug(
            "Successfully called eFormidlingService for eFormidling Service Task {TaskId}.",
            LogSanitizer.Sanitize(taskId)
        );

        return ServiceTaskResult.Success();
    }

    private Task<ValidAltinnEFormidlingConfiguration> GetValidAltinnEFormidlingConfiguration(string taskId)
    {
        ArgumentNullException.ThrowIfNull(taskId);

        AltinnTaskExtension? taskExtension = _processReader.GetAltinnTaskExtension(taskId);
        AltinnEFormidlingConfiguration? eFormidlingConfig = taskExtension?.EFormidlingConfiguration;

        if (eFormidlingConfig is null)
            throw new ApplicationConfigException(
                $"No eFormidling configuration found in BPMN for task {LogSanitizer.Sanitize(taskId)}"
            );

        HostingEnvironment env = AltinnEnvironments.GetHostingEnvironment(_hostEnvironment);
        ValidAltinnEFormidlingConfiguration validConfig = eFormidlingConfig.Validate(env);

        return Task.FromResult(validConfig);
    }
}
