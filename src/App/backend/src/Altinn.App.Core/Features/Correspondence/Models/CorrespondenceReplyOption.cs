using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Methods for recipients to respond to a correspondence, in addition to the normal <c>read</c> and <c>confirm</c> operations.
/// </summary>
public sealed record CorrespondenceReplyOption
{
    /// <summary>
    /// The URL to be used as a reply/response to a correspondence.
    /// </summary>
    [JsonPropertyName("linkURL")]
    public required string LinkUrl { get; init; }

    /// <summary>
    /// The link text.
    /// </summary>
    [JsonPropertyName("linkText")]
    public string? LinkText { get; init; }
}
