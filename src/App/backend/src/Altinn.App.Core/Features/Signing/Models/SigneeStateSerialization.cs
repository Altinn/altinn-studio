using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Signing.Models;

/// <summary>
/// The one serializer configuration for the signee-state data element, shared by every reader and writer so the
/// two sides cannot drift.
/// </summary>
internal static class SigneeStateSerialization
{
    public static JsonSerializerOptions Options { get; } =
        new(
            new JsonSerializerOptions
            {
                Converters =
                {
                    new LenientFailureCodeJsonConverterFactory(),
                    new JsonStringEnumConverter(JsonNamingPolicy.CamelCase),
                },
                PropertyNameCaseInsensitive = true,
                WriteIndented = true,
                ReferenceHandler = ReferenceHandler.Preserve,
                MaxDepth = 16,
            }
        );
}
