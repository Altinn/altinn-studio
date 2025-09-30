using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Represents the status of an attachment.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CorrespondenceAttachmentStatusResponse
{
    /// <summary>
    /// Attachment has been initialised.
    /// </summary>
    Initialized,

    /// <summary>
    /// Awaiting processing of upload.
    /// </summary>
    UploadProcessing,

    /// <summary>
    /// Published and available for download.
    /// </summary>
    Published,

    /// <summary>
    /// Purged.
    /// </summary>
    Purged,

    /// <summary>
    /// Failed.
    /// </summary>
    Failed,
}
