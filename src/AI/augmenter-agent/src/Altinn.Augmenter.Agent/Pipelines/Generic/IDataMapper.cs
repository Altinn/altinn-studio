using System.Text.Json;

namespace Altinn.Augmenter.Agent.Pipelines.Generic;

/// <summary>
/// Maps raw application data (typically Altinn FlatData) into the normalized
/// JSON shape expected by a Typst template and/or AI agent prompt.
/// Implementations are registered as keyed services in DI.
/// </summary>
public interface IDataMapper
{
    JsonDocument Map(JsonElement flatData);
}
