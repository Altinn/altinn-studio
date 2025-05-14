using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Defines the location of the attachment data.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CorrespondenceDataLocationTypeResponse
{
    /// <summary>
    /// Specifies that the attachment data is stored in the Altinn correspondence storage.
    /// </summary>
    AltinnCorrespondenceAttachment,

    /// <summary>
    /// Specifies that the attachment data is stored in an external storage controlled by the sender.
    /// </summary>
    ExternalStorage,
}
