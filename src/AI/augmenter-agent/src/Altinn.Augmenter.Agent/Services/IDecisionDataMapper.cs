using System.Text.Json;

namespace Altinn.Augmenter.Agent.Services;

public interface IDecisionDataMapper
{
    JsonDocument MapToDecision(JsonElement flatData);
}
