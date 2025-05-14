using System.Text.Json.Serialization;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Represents the content of a correspondence.
/// </summary>
public sealed record CorrespondenceContentResponse
{
    /// <summary>
    /// The language of the correspondence, specified according to ISO 639-1.
    /// </summary>
    [JsonPropertyName("language")]
    [JsonConverter(typeof(LanguageCodeJsonConverter<Iso6391>))]
    public LanguageCode<Iso6391> Language { get; init; }

    /// <summary>
    /// The correspondence message title (subject).
    /// </summary>
    [JsonPropertyName("messageTitle")]
    public required string MessageTitle { get; init; }

    /// <summary>
    /// The summary text of the correspondence.
    /// </summary>
    [JsonPropertyName("messageSummary")]
    public required string MessageSummary { get; init; }

    /// <summary>
    /// The main body of the correspondence.
    /// </summary>
    [JsonPropertyName("messageBody")]
    public required string MessageBody { get; init; }

    /// <summary>
    /// A list of attachments for the correspondence.
    /// </summary>
    [JsonPropertyName("attachments")]
    public IEnumerable<CorrespondenceAttachmentResponse>? Attachments { get; init; }
}
