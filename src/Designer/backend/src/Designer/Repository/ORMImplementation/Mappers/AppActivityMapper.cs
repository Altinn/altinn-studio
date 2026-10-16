using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Repository.Models.AppActivity;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;

public static class AppActivityMapper
{
    /// <summary>
    /// Serializes observations to the JSON array that the upsert statement expands with <c>jsonb_to_recordset</c>.
    /// </summary>
    public static string MapToUpsertRowsJson(IEnumerable<AppActivityObservation> observations)
    {
        var rows = observations.Select(observation => new AppActivityUpsertRow(
            observation.App,
            observation.Deployed,
            observation.LastReadAt?.ToUniversalTime(),
            observation.LastWriteAt?.ToUniversalTime(),
            observation.WindowCounts
        ));
        return JsonSerializer.Serialize(rows);
    }

    private sealed record AppActivityUpsertRow(
        [property: JsonPropertyName("app")] string App,
        [property: JsonPropertyName("deployed")] bool Deployed,
        [property: JsonPropertyName("last_read_at")] DateTimeOffset? LastReadAt,
        [property: JsonPropertyName("last_write_at")] DateTimeOffset? LastWriteAt,
        [property: JsonPropertyName("window_counts")] IReadOnlyDictionary<string, double> WindowCounts
    );
}
