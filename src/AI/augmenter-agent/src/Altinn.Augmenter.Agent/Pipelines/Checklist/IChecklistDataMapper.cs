using System.Text.Json;

namespace Altinn.Augmenter.Agent.Pipelines.Checklist;

public interface IChecklistDataMapper
{
    JsonDocument MapToChecklist(JsonElement flatData);
}
