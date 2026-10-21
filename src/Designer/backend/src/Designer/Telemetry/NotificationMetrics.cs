using System;
using System.Diagnostics;
using System.Diagnostics.Metrics;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.ContactPoints;

namespace Altinn.Studio.Designer.Telemetry;

/// <summary>
/// Counts the notifications and periodic reports Designer sends. Spans record the same outcomes, but traces are
/// sampled, so counts come from these metrics (https://github.com/Altinn/altinn-studio/issues/21073). A failed
/// attempt is counted with error.type set to the exception's type.
/// </summary>
public sealed class NotificationMetrics
{
    public const string DeliveriesMetricName = "altinn.designer.notification.deliveries";
    public const string PeriodicReportsMetricName = "altinn.designer.periodic_report.reports";

    private const string InternalAudience = "internal";
    private const string ServiceOwnerAudience = "service_owner";

    private readonly Counter<long> _deliveries;
    private readonly Counter<long> _periodicReports;

    public NotificationMetrics(IMeterFactory meterFactory)
    {
        Meter meter = meterFactory.Create(InstanceTelemetry.MeterName);
        _deliveries = meter.CreateCounter<long>(
            DeliveriesMetricName,
            unit: "{delivery}",
            description: "Notifications sent through one contact method, or through the internal Slack channel."
        );
        _periodicReports = meter.CreateCounter<long>(
            PeriodicReportsMetricName,
            unit: "{report}",
            description: "Periodic reports sent for one service owner and environment."
        );
    }

    public void RecordInternalDelivery(
        NotificationKind kind,
        string serviceOwner,
        AltinnEnvironment environment,
        Exception? error
    ) => RecordDelivery(kind, InternalAudience, ContactMethodType.Slack, serviceOwner, environment, error);

    public void RecordServiceOwnerDelivery(
        NotificationKind kind,
        ContactMethodType contactMethodType,
        string serviceOwner,
        AltinnEnvironment environment,
        Exception? error
    ) => RecordDelivery(kind, ServiceOwnerAudience, contactMethodType, serviceOwner, environment, error);

    public void RecordPeriodicReport(
        ReportFrequency frequency,
        string serviceOwner,
        string environment,
        Exception? error
    )
    {
        var tags = new TagList
        {
            { ServiceTelemetry.Attributes.PeriodicReport.Frequency, ServiceTelemetry.EnumValue(frequency) },
        };
        AddTarget(ref tags, serviceOwner, environment, error);
        _periodicReports.Add(1, tags);
    }

    private void RecordDelivery(
        NotificationKind kind,
        string audience,
        ContactMethodType contactMethodType,
        string serviceOwner,
        AltinnEnvironment environment,
        Exception? error
    )
    {
        var tags = new TagList
        {
            { ServiceTelemetry.Attributes.Notification.Kind, ServiceTelemetry.EnumValue(kind) },
            { ServiceTelemetry.Attributes.Notification.Audience, audience },
            {
                ServiceTelemetry.Attributes.Notification.ContactMethodType,
                ServiceTelemetry.EnumValue(contactMethodType)
            },
        };
        AddTarget(ref tags, serviceOwner, environment.Name, error);
        _deliveries.Add(1, tags);
    }

    private static void AddTarget(ref TagList tags, string serviceOwner, string environment, Exception? error)
    {
        tags.Add(ServiceTelemetry.Attributes.ServiceOwner, serviceOwner.ToLowerInvariant());
        tags.Add(ServiceTelemetry.Attributes.Environment, ServiceTelemetry.RuntimeEnvironmentName(environment));
        if (error is not null)
        {
            tags.Add(ServiceTelemetry.Attributes.ErrorType, error.GetType().FullName);
        }
    }
}
