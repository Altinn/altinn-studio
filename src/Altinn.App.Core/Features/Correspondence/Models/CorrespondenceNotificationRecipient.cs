using Altinn.App.Core.Extensions;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Represents a recipient of a correspondence notification.
/// </summary>
public sealed record CorrespondenceNotificationRecipient : MultipartCorrespondenceListItem
{
    /// <summary>
    /// The email address of the recipient.
    /// </summary>
    public string? EmailAddress { get; init; }

    /// <summary>
    /// The mobile number of the recipient.
    /// </summary>
    public string? MobileNumber { get; init; }

    /// <summary>
    /// The organization number of the recipient.
    /// </summary>
    public OrganisationNumber? OrganizationNumber { get; init; }

    /// <summary>
    /// The national identity number of the recipient.
    /// </summary>
    public NationalIdentityNumber? NationalIdentityNumber { get; init; }

    /// <summary>
    /// Boolean indicating if the recipient is reserved.
    /// </summary>
    public bool IsReserved { get; init; }

    internal override void Serialise(MultipartFormDataContent content, int index) => Serialise(content, index, 0);

    internal void Serialise(MultipartFormDataContent content, int index, int parentIndex)
    {
        AddIfNotNull(
            content,
            EmailAddress,
            $"Correspondence.Notification.CustomNotificationRecipients[{parentIndex}].Recipients[{index}].EmailAddress"
        );
        AddIfNotNull(
            content,
            MobileNumber,
            $"Correspondence.Notification.CustomNotificationRecipients[{parentIndex}].Recipients[{index}].MobileNumber"
        );
        AddRequired(
            content,
            IsReserved.ToString(),
            $"Correspondence.Notification.CustomNotificationRecipients[{parentIndex}].Recipients[{index}].IsReserved"
        );
        AddIfNotNull(
            content,
            OrganizationNumber?.ToUrnFormattedString(),
            $"Correspondence.Notification.CustomNotificationRecipients[{parentIndex}].Recipients[{index}].OrganizationNumber"
        );
        AddIfNotNull(
            content,
            NationalIdentityNumber?.ToUrnFormattedString(),
            $"Correspondence.Notification.CustomNotificationRecipients[{parentIndex}].Recipients[{index}].NationalIdentityNumber"
        );
    }
}
