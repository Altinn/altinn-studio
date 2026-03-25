using System.Text.Json;

namespace Altinn.Augmenter.Agent.Pipelines.Decision;

public interface IDecisionDataMapper
{
    JsonDocument MapToDecision(JsonElement flatData);
}
