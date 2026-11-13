using System.Text.Json;

namespace Altinn.App.Core.Internal.App;

/// <summary>
/// The JSON grammar for app configuration files. Keep raw resources intact and apply the same grammar when
/// consuming them, including resources supplied by an app's own IAppResources implementation.
/// </summary>
internal static class AppFileJson
{
    /// <summary>
    /// The document-reader grammar used by ingestion and downstream app-file consumers.
    /// </summary>
    public static JsonDocumentOptions DocumentOptions { get; } =
        new() { AllowTrailingCommas = true, CommentHandling = JsonCommentHandling.Skip };

    /// <summary>
    /// Adds the app-file grammar without changing the consumer's naming, converters or value handling.
    /// </summary>
    public static JsonSerializerOptions CreateSerializerOptions(JsonSerializerOptions? defaults = null) =>
        new(defaults ?? new JsonSerializerOptions())
        {
            AllowTrailingCommas = true,
            ReadCommentHandling = JsonCommentHandling.Skip,
        };
}
