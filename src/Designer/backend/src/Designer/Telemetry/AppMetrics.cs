using System.Collections.Generic;
using System.Diagnostics;
using System.Diagnostics.Metrics;
using System.Linq;
using Altinn.Studio.Designer.Repository.Models;

namespace Altinn.Studio.Designer.Telemetry;

/// <summary>
/// The service owners' apps: how many there are, how many each environment has deployed, and the creations and
/// deployments that change those numbers. <see cref="AppInventoryCollector"/> takes the numbers from Gitea and
/// Designer's database, so they are right from its first collection, while the counters only see what happens from
/// the moment they are deployed.
/// </summary>
public sealed class AppMetrics
{
    public const string CreationsMetricName = "altinn.designer.app.creations";
    public const string DeploymentsMetricName = "altinn.designer.app.deployments";
    public const string AppCountMetricName = "altinn.designer.app.count";
    public const string DeployedAppCountMetricName = "altinn.designer.deployed_app.count";

    private readonly Counter<long> _creations;
    private readonly Counter<long> _deployments;
    private volatile Measurement<long>[] _appCounts = [];
    private volatile Measurement<long>[] _deployedAppCounts = [];

    public AppMetrics(IMeterFactory meterFactory)
    {
        Meter meter = meterFactory.Create(ServiceTelemetry.MeterName);
        _creations = meter.CreateCounter<long>(
            CreationsMetricName,
            unit: "{app}",
            description: "Apps created in a service owner's organization."
        );
        _deployments = meter.CreateCounter<long>(
            DeploymentsMetricName,
            unit: "{deployment}",
            description: "Deployments and decommissions of an app that reached their outcome."
        );
        meter.CreateObservableGauge(
            AppCountMetricName,
            () => _appCounts,
            unit: "{app}",
            description: "Apps in each service owner's organization in Gitea."
        );
        meter.CreateObservableGauge(
            DeployedAppCountMetricName,
            () => _deployedAppCounts,
            unit: "{app}",
            description: "Apps deployed to each of a service owner's environments."
        );
    }

    public void RecordCreation(string serviceOwner, AppCreationSource source)
    {
        var tags = new TagList
        {
            { ServiceTelemetry.Attributes.ServiceOwner, serviceOwner.ToLowerInvariant() },
            { ServiceTelemetry.Attributes.AppLifecycle.CreationSource, ServiceTelemetry.EnumValue(source) },
        };
        _creations.Add(1, tags);
    }

    /// <param name="serviceOwner">The service owner that owns the app.</param>
    /// <param name="environment">The environment, by Designer's or the runtime's name for it.</param>
    /// <param name="deploymentType">Whether the deployment put the app in the environment or took it out.</param>
    /// <param name="outcome">The event that ended the deployment. Any but a succeeded final event is a failure,
    /// and becomes its error.type.</param>
    /// <param name="first">For a successful deploy, whether it is the app's first in the environment.</param>
    public void RecordDeployment(
        string serviceOwner,
        string environment,
        DeploymentType deploymentType,
        DeployEventType outcome,
        bool? first
    )
    {
        var tags = new TagList
        {
            { ServiceTelemetry.Attributes.ServiceOwner, serviceOwner.ToLowerInvariant() },
            { ServiceTelemetry.Attributes.Environment, ServiceTelemetry.RuntimeEnvironmentName(environment) },
            { ServiceTelemetry.Attributes.AppLifecycle.DeploymentType, ServiceTelemetry.EnumValue(deploymentType) },
        };
        if (!DeploymentEntity.SucceededFinalEventTypes.Contains(outcome))
        {
            tags.Add(ServiceTelemetry.Attributes.ErrorType, ServiceTelemetry.EnumValue(outcome));
        }
        if (first is not null)
        {
            tags.Add(ServiceTelemetry.Attributes.AppLifecycle.DeploymentFirst, first.Value);
        }
        _deployments.Add(1, tags);
    }

    /// <summary>
    /// Sets the number of apps each service owner has. Null, when counting failed, stops reporting them until the
    /// next count, so that a dashboard shows a gap rather than an old number.
    /// </summary>
    public void SetAppCounts(IReadOnlyDictionary<string, int>? countsByServiceOwner)
    {
        _appCounts =
        [
            .. (countsByServiceOwner ?? new Dictionary<string, int>()).Select(entry => new Measurement<long>(
                entry.Value,
                new TagList { { ServiceTelemetry.Attributes.ServiceOwner, entry.Key.ToLowerInvariant() } }
            )),
        ];
    }

    /// <summary>
    /// Sets the number of apps deployed to each of the service owners' environments. Null, when counting failed,
    /// stops reporting them until the next count.
    /// </summary>
    public void SetDeployedAppCounts(IReadOnlyList<DeployedAppCount>? counts)
    {
        _deployedAppCounts =
        [
            .. (counts ?? []).Select(count => new Measurement<long>(
                count.Count,
                new TagList
                {
                    { ServiceTelemetry.Attributes.ServiceOwner, count.Org.ToLowerInvariant() },
                    {
                        ServiceTelemetry.Attributes.Environment,
                        ServiceTelemetry.RuntimeEnvironmentName(count.Environment)
                    },
                }
            )),
        ];
    }
}
