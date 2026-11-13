using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Metrics;

/// <summary>
/// The daily instance metrics of every app of every service owner in one environment, for the platform-wide
/// admin pages. The period ends on the last day any service owner has stored metrics for, so the service owners
/// are comparable.
/// </summary>
public sealed record PlatformAppDailyMetrics
{
    public required string Environment { get; init; }
    public required int PeriodDays { get; init; }

    /// <summary>
    /// The last day with stored metrics for any service owner. Null when nothing is stored for the environment.
    /// </summary>
    public DateOnly? MetricDate { get; init; }

    /// <summary>
    /// Every service owner with stored metrics, ordered by name.
    /// </summary>
    public required IReadOnlyList<ServiceOwnerAppDailyMetrics> ServiceOwners { get; init; }
}

public sealed record ServiceOwnerAppDailyMetrics
{
    public required string Org { get; init; }
    public required DateOnly ObservedSince { get; init; }

    /// <summary>
    /// The service owner's last day with stored metrics. Earlier than the platform's when its collection failed.
    /// </summary>
    public required DateOnly LatestMetricDate { get; init; }

    /// <summary>
    /// When Storage computed the service owner's most recently collected day.
    /// </summary>
    public required DateTimeOffset ComputedAt { get; init; }

    /// <summary>
    /// Every app of the service owner with stored metrics, deployed or not, ordered by name.
    /// </summary>
    public required IReadOnlyList<AppDailyMetricsSummaryRow> Apps { get; init; }
}
