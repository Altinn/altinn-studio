using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// The location of the attachment during the correspondence initialisation.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CorrespondenceDataLocationType
{
    /// <summary>
    /// Specifies that the attachment data will be uploaded separately or as part of this request.
    /// </summary>
    NewCorrespondenceAttachment,

    /// <summary>
    /// Specifies that the attachment already exist in Altinn Correspondence storage.
    /// </summary>
    ExistingCorrespondenceAttachment,

    // TODO: Typo in this member, bug issue: https://github.com/Altinn/altinn-correspondence/issues/535
    /// <summary>
    /// Specifies that the attachment data already exist in an external storage.
    /// </summary>
    ExisitingExternalStorage,
}
