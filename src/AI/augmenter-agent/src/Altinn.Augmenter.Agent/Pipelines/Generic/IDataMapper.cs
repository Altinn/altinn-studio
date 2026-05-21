using System.Text.Json;

namespace Altinn.Augmenter.Agent.Pipelines.Generic;

/// <summary>
/// Maps raw application data (typically Altinn FlatData) into the normalized
/// JSON shape expected by a Typst template and/or AI agent prompt.
/// Production registration goes through <see cref="IDataMapperRegistry"/>;
/// implementations are not registered individually in DI.
/// </summary>
public interface IDataMapper
{
    JsonDocument Map(JsonElement flatData);
}

/// <summary>
/// Lazy, file-system-backed lookup of mappers by name. Resolves the mapper
/// spec file at <c>ContentPaths.MappingsRoot/&lt;name&gt;.json</c> on first
/// access and caches the resulting <see cref="JsonPathMapper"/>. Deferring
/// resolution to request time (rather than scanning the folder at startup)
/// makes <c>ContentPaths.MappingsRoot</c> overrides from test factories or
/// docker-compose overrides actually take effect.
/// </summary>
public interface IDataMapperRegistry
{
    IDataMapper Get(string name);
}
