using System.Text.Json;

namespace WorkflowEngine.Data.Constants;

internal static class JsonOptions
{
    public static readonly JsonSerializerOptions Default = new()
    {
        AllowOutOfOrderMetadataProperties = true,
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };
}
