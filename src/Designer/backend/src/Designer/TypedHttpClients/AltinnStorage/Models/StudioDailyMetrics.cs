using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.TypedHttpClients.AltinnStorage.Models;

/// <summary>
/// Instance metrics for one service owner and one UTC day, one entry per app, as Storage returns them to Studio.
/// </summary>
public sealed record StudioDailyMetrics
{
    [JsonPropertyName("org")]
    public required string Org { get; init; }

    /// <summary>
    /// The UTC day that the created, completed and time to complete numbers describe.
    /// </summary>
    [JsonPropertyName("date")]
    public required DateOnly Date { get; init; }

    /// <summary>
    /// When Storage read the open and unconfirmed counts.
    /// </summary>
    [JsonPropertyName("computedAt")]
    public required DateTimeOffset ComputedAt { get; init; }

    /// <summary>
    /// Apps with instances on the day or with open or unconfirmed instances. Other apps are left out.
    /// </summary>
    [JsonPropertyName("apps")]
    public IReadOnlyList<StudioAppDailyMetrics> Apps { get; init; } = [];
}

public sealed record StudioAppDailyMetrics
{
    /// <summary>
    /// The app name without the service owner prefix.
    /// </summary>
    [JsonPropertyName("app")]
    public required string App { get; init; }

    [JsonPropertyName("instancesCreated")]
    public long InstancesCreated { get; init; }

    [JsonPropertyName("instancesCompleted")]
    public long InstancesCompleted { get; init; }

    /// <summary>
    /// Median seconds from process start to end for the instances completed on the day. Null when none completed.
    /// </summary>
    [JsonPropertyName("secondsToCompleteP50")]
    public int? SecondsToCompleteP50 { get; init; }

    [JsonPropertyName("openInstances")]
    public long OpenInstances { get; init; }

    [JsonPropertyName("openOver90Days")]
    public long OpenOver90Days { get; init; }

    [JsonPropertyName("unconfirmedOver90Days")]
    public long UnconfirmedOver90Days { get; init; }

    [JsonPropertyName("openByTask")]
    public IReadOnlyList<StudioOpenTaskCount> OpenByTask { get; init; } = [];
}

public sealed record StudioOpenTaskCount
{
    [JsonPropertyName("taskId")]
    public required string TaskId { get; init; }

    [JsonPropertyName("openInstances")]
    public long OpenInstances { get; init; }
}
