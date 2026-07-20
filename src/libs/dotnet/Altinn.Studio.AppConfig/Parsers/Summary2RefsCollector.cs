using System.Text.Json;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;
using static Altinn.Studio.AppConfig.Parsers.JsonRead;

namespace Altinn.Studio.AppConfig.Parsers;

internal static class Summary2RefsCollector
{
    public static void CollectSummary2Refs(
        AppModelBuilder app,
        string ownerId,
        string file,
        string basePtr,
        JsonElement c
    )
    {
        string? taskId = null;
        if (c.TryGetProperty("target", out var target) && target.ValueKind == JsonValueKind.Object)
        {
            taskId = TryString(target, "taskId");
            if (string.IsNullOrEmpty(taskId))
                taskId = null;
            if (taskId is not null)
                app.Refs.TaskIds.Add(new TaskIdReference(taskId, new SourceSpan(file, basePtr + "/target/taskId")));
            var type = TryString(target, "type") ?? "component";
            var id = TryString(target, "id");
            if (!string.IsNullOrEmpty(id))
            {
                var ptr = new SourceSpan(file, basePtr + "/target/id");
                if (type == "page")
                {
                    app.Refs.PageFiles.Add(new PageFileReference(id, ptr, Ordered: false, InTaskId: taskId));
                }
                else if (type == "component")
                {
                    app.Refs.ComponentIds.Add(new ComponentIdReference(id, ownerId, ptr, InTaskId: taskId));
                }
            }
        }

        if (c.TryGetProperty("overrides", out var overrides) && overrides.ValueKind == JsonValueKind.Array)
        {
            int i = 0;
            foreach (var ov in overrides.EnumerateArray())
            {
                if (ov.ValueKind == JsonValueKind.Object && TryString(ov, "componentId") is { Length: > 0 } cid)
                {
                    app.Refs.ComponentIds.Add(
                        new ComponentIdReference(
                            cid,
                            ownerId,
                            new SourceSpan(file, basePtr + $"/overrides/{i}/componentId"),
                            InTaskId: taskId
                        )
                    );
                }
                i++;
            }
        }
    }
}
