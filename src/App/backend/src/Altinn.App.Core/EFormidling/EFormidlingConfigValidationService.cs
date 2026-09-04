using Altinn.App.Core.Constants;
using Altinn.App.Core.EFormidling.Configuration;
using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.EFormidling;

/// <summary>
/// Checks at startup what an eFormidling task would otherwise only discover mid-process: that its
/// BPMN configuration is complete for this environment, that the data types it ships exist, and that
/// the app registered the services it needs.
/// </summary>
/// <remarks>
/// Configuration resolves per environment, so this validates what <em>this</em> deployment would use —
/// and the services are only required where the task is actually enabled, since an app running
/// eFormidling in production alone must still start locally. Authentication is deliberately not
/// probed: those tokens are minted per request from platform settings, so a startup check could not
/// tell an app anything it can get wrong.
/// </remarks>
internal sealed class EFormidlingConfigValidationService : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<EFormidlingConfigValidationService> _logger;

    // Resolved inside StartAsync rather than injected: a hosted service's constructor runs whenever
    // anything merely enumerates IHostedService, and taking process/metadata services here would make
    // that enumeration require the whole graph to be constructible.
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
            // Mirrors the workflow-engine validators: a check that cannot read what it needs stands
            // down rather than taking the app with it. Only a real violation below is worth a failed boot.
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

            // Shipping an undeclared data type cannot work, and surfaces as a missing attachment
            // rather than an error.
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
            IEFormidlingService? eFormidlingService = services.GetService<IEFormidlingService>();
            if (eFormidlingService is null)
            {
                errors.Add(
                    $"eFormidling is enabled for this environment ({environment}), but no "
                        + $"{nameof(IEFormidlingService)} is registered. Call AddEFormidling() when configuring "
                        + "services, or disable the task with <altinn:disabled>."
                );
            }
            else if (
                // Only the built-in service consumes the metadata generator, to build the arkivmelding.
                // An app that replaced IEFormidlingService outright composes its own shipment and needs
                // no generator, so requiring one would fail a deployment that is entirely well-formed.
                eFormidlingService is DefaultEFormidlingService
                && services.GetRequiredService<AppImplementationFactory>().Get<IEFormidlingMetadata>() is null
            )
            {
                errors.Add(
                    $"eFormidling is enabled for this environment ({environment}), but no "
                        + $"{nameof(IEFormidlingMetadata)} is registered. Complete the registration with "
                        + "AddEFormidling().WithMetadata<T>(), or disable the task with <altinn:disabled>."
                );
            }

            // Only the built-in service ships through the built-in client, so only it needs a base
            // address. Checked here rather than left to the first shipment, where an unset value used
            // to surface as an ArgumentNullException from inside the service provider.
            if (
                eFormidlingService is DefaultEFormidlingService
                && string.IsNullOrWhiteSpace(services.GetService<IOptions<EFormidlingClientSettings>>()?.Value.BaseUrl)
            )
            {
                errors.Add(
                    $"eFormidling is enabled for this environment ({environment}), but "
                        + $"{nameof(EFormidlingClientSettings)}.{nameof(EFormidlingClientSettings.BaseUrl)} is not "
                        + "set. Add it to the EFormidlingClientSettings configuration section, or supply it with "
                        + "AddEFormidling().WithMetadata<T>().WithConfig(...)."
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
