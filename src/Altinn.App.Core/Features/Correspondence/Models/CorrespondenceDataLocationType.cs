using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// The location of the attachment during the correspondence initialization
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CorrespondenceDataLocationType
{
    /// <summary>
    /// Specifies that the attachment data will need to be uploaded to Altinn Correspondence via the Upload Attachment operation
    /// </summary>
    NewCorrespondenceAttachment,

    /// <summary>
    /// Specifies that the attachment  already exist in Altinn Correspondence storage
    /// </summary>
    ExistingCorrespondenceAttachment,

    /// <summary>
    /// Specifies that the attachment data already exist in an external storage
    /// </summary>
    ExisitingExternalStorage,
}
