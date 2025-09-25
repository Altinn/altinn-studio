using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Represents a binary attachment to a Correspondence.
/// </summary>
public sealed record CorrespondenceAttachmentResponse
{
    /// <summary>
    /// A unique id for the correspondence attachment.
    /// </summary>
    [JsonPropertyName("id")]
    public Guid Id { get; init; }

    /// <summary>
    /// The date and time when the attachment was created.
    /// </summary>
    [JsonPropertyName("created")]
    public DateTimeOffset Created { get; init; }

    /// <summary>
    /// The location of the attachment data.
    /// </summary>
    [JsonPropertyName("dataLocationType")]
    public CorrespondenceDataLocationTypeResponse DataLocationType { get; init; }

    /// <summary>
    /// The current status of the attachment.
    /// </summary>
    [JsonPropertyName("status")]
    public CorrespondenceAttachmentStatusResponse Status { get; init; }

    /// <summary>
    /// The text description of the status code.
    /// </summary>
    [JsonPropertyName("statusText")]
    public required string StatusText { get; init; }

    /// <summary>
    /// The date and time when the current attachment status was changed.
    /// </summary>
    [JsonPropertyName("statusChanged")]
    public DateTimeOffset StatusChanged { get; init; }

    /// <summary>
    /// The date and time when the attachment expires.
    /// </summary>
    [JsonPropertyName("expirationTime")]
    public DateTimeOffset ExpirationTime { get; init; }

    /// <summary>
    /// The filename of the attachment.
    /// </summary>
    [JsonPropertyName("fileName")]
    public string? FileName { get; init; }

    /// <summary>
    /// Indicates if the attachment is encrypted or not.
    /// </summary>
    [JsonPropertyName("isEncrypted")]
    public bool IsEncrypted { get; init; }

    /// <summary>
    /// MD5 checksum of the file data.
    /// </summary>
    [JsonPropertyName("checksum")]
    public string? Checksum { get; init; }

    /// <summary>
    /// A reference value given to the attachment by the creator.
    /// </summary>
    [JsonPropertyName("sendersReference")]
    public required string SendersReference { get; init; }

    /// <summary>
    /// The attachment data type in MIME format.
    /// </summary>
    [JsonPropertyName("dataType")]
    public string? DataType { get; init; }
}
