using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.Notifications.Core
{
    /// <summary>
    /// Provider class for JsonSerializerOptions
    /// </summary>
    public static class JsonSerializerOptionsProvider
    {
        /// <summary>
        /// Standard serializer options
        /// </summary>
        public static JsonSerializerOptions Options { get; } = new()
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            Converters = { new JsonStringEnumConverter() },
            PropertyNameCaseInsensitive = true
        };
    }
}
