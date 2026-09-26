using System.Text.Json;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Internal.App;

/// <summary>
/// Deserializes <c>config/applicationmetadata.json</c> from <see cref="AppFiles"/>. Shared by the services that need
/// the file as it is on disk, without the runtime values <see cref="IAppMetadata"/> adds on top.
/// </summary>
internal static class ApplicationMetadataParser
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        AllowTrailingCommas = true,
    };

    /// <summary>
    /// Reads and deserializes the application metadata file.
    /// </summary>
    /// <exception cref="ApplicationConfigException">Thrown if the file is missing or cannot be deserialized.</exception>
    public static ApplicationMetadata Parse(AppFiles appFiles)
    {
        try
        {
            return JsonSerializer.Deserialize<ApplicationMetadata>(
                    appFiles.ApplicationMetadata.Span,
                    _jsonSerializerOptions
                )
                ?? throw new ApplicationConfigException(
                    "Deserialization returned null, Could indicate problems with deserialization of config/applicationmetadata.json"
                );
        }
        catch (JsonException ex)
        {
            throw new ApplicationConfigException(
                "Something went wrong when parsing application metadata file (config/applicationmetadata.json)",
                ex
            );
        }
    }
}
