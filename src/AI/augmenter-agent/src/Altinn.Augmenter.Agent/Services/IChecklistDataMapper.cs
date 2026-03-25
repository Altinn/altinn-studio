using System.Text.Json;

namespace Altinn.Augmenter.Agent.Services;

public interface IChecklistDataMapper
{
    JsonDocument MapToChecklist(JsonElement flatData);
}
