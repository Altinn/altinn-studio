using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Common.Telemetry;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Altinn.Studio.Designer.Telemetry;

/// <summary>
/// Counts the service owners' apps in Gitea, and the apps deployed to their environments, for
/// <see cref="AppMetrics"/>. Every replica counts on its own: the clustered scheduler would count on one replica
/// and leave the others reporting what they counted last. Since every replica reports the same numbers, a dashboard
/// takes their maximum.
/// </summary>
internal sealed class AppInventoryCollector(
    IServiceScopeFactory scopeFactory,
    AppMetrics metrics,
    TimeProvider timeProvider
) : BackgroundService
{
    internal static readonly TimeSpan Interval = TimeSpan.FromMinutes(15);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval, timeProvider);
        do
        {
            await Collect(stoppingToken);
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    internal async Task Collect(CancellationToken cancellationToken)
    {
        using Activity? activity = ServiceTelemetry.Source.StartActivity(
            $"{nameof(AppInventoryCollector)}.{nameof(Collect)}"
        );
        activity.SetAlwaysSample();

        await using AsyncServiceScope scope = scopeFactory.CreateAsyncScope();
        IServiceProvider services = scope.ServiceProvider;

        HashSet<string>? serviceOwners = await TryCount(
            activity,
            async () =>
                (await services.GetRequiredService<IOrgService>().GetOrgList(cancellationToken)).Orgs.Keys.ToHashSet(
                    StringComparer.OrdinalIgnoreCase
                ),
            cancellationToken
        );
        if (serviceOwners is null)
        {
            metrics.SetAppCounts(null);
            metrics.SetDeployedAppCounts(null);
            return;
        }

        metrics.SetAppCounts(
            await TryCount(
                activity,
                () => CountApps(services.GetRequiredService<IGiteaAppCounter>(), serviceOwners, cancellationToken),
                cancellationToken
            )
        );
        metrics.SetDeployedAppCounts(
            await TryCount(
                activity,
                () => CountDeployedApps(services, serviceOwners, cancellationToken),
                cancellationToken
            )
        );
    }

    // Every service owner gets a count, so that one without apps shows as zero rather than as missing.
    private static async Task<IReadOnlyDictionary<string, int>> CountApps(
        IGiteaAppCounter appCounter,
        HashSet<string> serviceOwners,
        CancellationToken cancellationToken
    )
    {
        var counts = new Dictionary<string, int>(
            await appCounter.CountAppsByOrganization(cancellationToken),
            StringComparer.OrdinalIgnoreCase
        );
        return serviceOwners.ToDictionary(
            serviceOwner => serviceOwner,
            serviceOwner => counts.GetValueOrDefault(serviceOwner)
        );
    }

    // Deployments to environments that no longer exist stay in the history, so only current environments count.
    private static async Task<IReadOnlyList<DeployedAppCount>> CountDeployedApps(
        IServiceProvider services,
        HashSet<string> serviceOwners,
        CancellationToken cancellationToken
    )
    {
        HashSet<string> environments = (await services.GetRequiredService<IEnvironmentsService>().GetEnvironments())
            .Select(environment => environment.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        IReadOnlyList<DeployedAppCount> counts = await services
            .GetRequiredService<IDeploymentRepository>()
            .CountDeployedApps(cancellationToken);
        return
        [
            .. counts.Where(count => serviceOwners.Contains(count.Org) && environments.Contains(count.Environment)),
        ];
    }

    private static async Task<T?> TryCount<T>(
        Activity? activity,
        Func<Task<T>> count,
        CancellationToken cancellationToken
    )
        where T : class
    {
        try
        {
            return await count();
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
        {
            activity?.SetStatus(ActivityStatusCode.Error);
            activity?.AddException(ex);
            return null;
        }
    }
}
