using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models.Notifications.Sms;

/// <summary>
/// Represents a recipient of SMS notification.
/// </summary>
/// <param name="MobileNumber">
/// Mobile number to receive SMS notification.
/// Must be in the format of +CCXXXXXXXX or 00CCXXXXXXXX.
/// </param>
/// <param name="OrganizationNumber">Organization number.</param>
/// <param name="NationalIdentityNumber">National Identity number.</param>
public sealed record SmsRecipient(
    [property: JsonPropertyName("mobileNumber")] string MobileNumber,
    // The JSON name keeps the British spelling on purpose: "organisationNumber" is the field name
    // in the Altinn Notifications wire contract. Renaming it would break the integration.
    [property: JsonPropertyName("organisationNumber")] string? OrganizationNumber = null,
    [property: JsonPropertyName("nationalIdentityNumber")] string? NationalIdentityNumber = null
);
