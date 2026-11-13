using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Repository.Models.AppDailyMetrics;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;

public static class AppDailyMetricsMapper
{
    /// <summary>
    /// Serializes observations to the JSON array that the upsert statement expands with <c>jsonb_to_recordset</c>.
    /// </summary>
    public static string MapToUpsertRowsJson(IEnumerable<AppDailyMetricsObservation> observations)
    {
        var rows = observations.Select(observation => new AppDailyMetricsUpsertRow(
            observation.App,
            observation.InstancesCreated,
            observation.InstancesCompleted,
            observation.SecondsToCompleteP50,
            observation.OpenInstances,
            observation.OpenOver90Days
        ));
        return JsonSerializer.Serialize(rows);
    }

    /// <summary>
    /// Serializes the open instances per task of every observation to the JSON array that the insert statement
    /// expands with <c>jsonb_to_recordset</c>.
    /// </summary>
    public static string MapToTaskRowsJson(IEnumerable<AppDailyMetricsObservation> observations)
    {
        var rows = observations.SelectMany(observation =>
            observation.OpenByTask.Select(task => new AppDailyTaskMetricsUpsertRow(
                observation.App,
                task.Key,
                task.Value
            ))
        );
        return JsonSerializer.Serialize(rows);
    }

    private sealed record AppDailyMetricsUpsertRow(
        [property: JsonPropertyName("app")] string App,
        [property: JsonPropertyName("instances_created")] int InstancesCreated,
        [property: JsonPropertyName("instances_completed")] int InstancesCompleted,
        [property: JsonPropertyName("seconds_to_complete_p50")] int? SecondsToCompleteP50,
        [property: JsonPropertyName("open_instances")] int OpenInstances,
        [property: JsonPropertyName("open_over_90_days")] int OpenOver90Days
    );

    private sealed record AppDailyTaskMetricsUpsertRow(
        [property: JsonPropertyName("app")] string App,
        [property: JsonPropertyName("task_id")] string TaskId,
        [property: JsonPropertyName("open_instances")] int OpenInstances
    );
}
