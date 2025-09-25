using System.Text.Json.Serialization;

#nullable enable

namespace TestApp.Shared;

public sealed record FixtureConfiguration(
    [property: JsonPropertyName("appName")] string AppName,
    [property: JsonPropertyName("appScenario")] string AppScenario,
    [property: JsonPropertyName("fixtureInstance")] long FixtureInstance,
    [property: JsonPropertyName("externalAppPort")] ushort ExternalAppPort,
    [property: JsonPropertyName("externalAppBaseUrl")] string ExternalAppBaseUrl
);
