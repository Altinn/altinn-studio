using Altinn.App.Core.Constants;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.EFormidling;

/// <summary>
/// Checks at startup what an eFormidling task would otherwise only discover mid-process: that its
/// BPMN configuration is complete for this environment, that the data types it ships exist, and that
/// the app registered the services it needs.
/// </summary>
/// <remarks>
/// The configuration is resolved per environment, so this validates what <em>this</em> deployment
/// would use. Registration is only required where the task is actually enabled — an app that ships in
/// production but disables eFormidling in development (a common shape) must still start locally.
/// Authentication is deliberately not checked: eFormidling's tokens are minted per request from
/// settings the platform provides, so there is nothing an app can get wrong here that a startup probe
/// would catch.
/// </remarks>
internal sealed class EFormidlingConfigValidationService : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<EFormidlingConfigValidationService> _logger;

    // Everything is resolved inside StartAsync rather than injected: a hosted service's constructor
    // runs whenever anything merely enumerates IHostedService, and taking the app's process/metadata
    // services here would make that enumeration require the whole graph to be constructible.
    public EFormidlingConfigValidationService(
        IServiceScopeFactory scopeFactory,
        ILogger<EFormidlingConfigValidationService> logger
    )
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using IServiceScope scope = _scopeFactory.CreateScope();
        IServiceProvider services = scope.ServiceProvider;

        List<ProcessTask> eFormidlingTasks;
        ApplicationMetadata appMetadata;
        HostingEnvironment environment;
        try
        {
            eFormidlingTasks = services
                .GetRequiredService<IProcessReader>()
                .GetProcessTasks()
                .Where(task =>
                    string.Equals(
                        task.ExtensionElements?.TaskExtension?.TaskType,
                        AltinnTaskTypes.EFormidling,
                        StringComparison.OrdinalIgnoreCase
                    )
                )
                .ToList();

            if (eFormidlingTasks.Count == 0)
            {
                return;
            }

            appMetadata = await services.GetRequiredService<IAppMetadata>().GetApplicationMetadata();
            environment = AltinnEnvironments.GetHostingEnvironment(services.GetRequiredService<IHostEnvironment>());
        }
        catch (Exception e)
        {
            // Mirrors the workflow-engine validators: a startup check that cannot read what it needs
            // stands down rather than taking the app with it. Only an actual configuration violation
            // below is worth failing a boot over.
            _logger.LogWarning(
                e,
                "Could not read the process definition or application metadata; skipping eFormidling configuration validation."
            );
            return;
        }

        var errors = new List<string>();
        bool anyEnabled = false;

        foreach (ProcessTask task in eFormidlingTasks)
        {
            AltinnEFormidlingConfiguration? config = task.ExtensionElements?.TaskExtension?.EFormidlingConfiguration;
            if (config is null)
            {
                errors.Add($"Task '{task.Id}' is an eFormidling task but has no <altinn:eFormidlingConfig> element.");
                continue;
            }

            ValidAltinnEFormidlingConfiguration validConfig;
            try
            {
                validConfig = config.Validate(environment);
            }
            catch (ApplicationConfigException e)
            {
                errors.Add($"Task '{task.Id}': {e.Message}");
                continue;
            }

            anyEnabled |= !validConfig.Disabled;

            // Shipping a data type the app does not declare cannot work, and today it surfaces as a
            // missing attachment rather than an error.
            foreach (string dataTypeId in validConfig.DataTypes)
            {
                if (!appMetadata.DataTypes.Exists(dataType => dataType.Id == dataTypeId))
                {
                    errors.Add(
                        $"Task '{task.Id}' ships data type '{dataTypeId}', which does not exist in "
                            + "applicationmetadata.json."
                    );
                }
            }
        }

        if (anyEnabled)
        {
            if (services.GetService<IEFormidlingService>() is null)
            {
                errors.Add(
                    $"eFormidling is enabled for this environment ({environment}), but no "
                        + $"{nameof(IEFormidlingService)} is registered. Call AddEFormidlingServices2<TM,TR> when "
                        + "configuring services, or disable the task with <altinn:disabled>."
                );
            }
        }

        if (errors.Count > 0)
        {
            throw new ApplicationConfigException(
                "eFormidling configuration is not valid:"
                    + Environment.NewLine
                    + string.Join(Environment.NewLine, errors)
            );
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
