using System.Text.Json.Serialization;
using Altinn.Register.Contracts.V1;

namespace Altinn.Platform.Profile.Models;

/// <summary>
/// Describes a user profile.
/// </summary>
/// <remarks>
/// Vendored to match the shape of <c>Altinn/altinn-profile</c>'s own already-migrated model, rather than
/// referenced as a NuGet package (that service ships as a container, not a library, so there is no
/// package to depend on). Compared to the old, deprecated
/// <c>Altinn.Platform.Profile.Models.UserProfile</c>: <see cref="UserUuid"/> and <see cref="IsReserved"/>
/// are new fields, and every string property is now properly nullable.
/// </remarks>
public class UserProfile
{
    /// <summary>
    /// Gets or sets the ID of the user.
    /// </summary>
    [JsonPropertyName("userId")]
    public int UserId { get; set; }

    /// <summary>
    /// Gets or sets the UUID of the user.
    /// </summary>
    [JsonPropertyName("userUuid")]
    public Guid? UserUuid { get; set; }

    /// <summary>
    /// Gets or sets the username.
    /// </summary>
    [JsonPropertyName("userName")]
    public string? UserName { get; set; }

    /// <summary>
    /// Gets or sets the external identity.
    /// </summary>
    [JsonPropertyName("externalIdentity")]
    public string? ExternalIdentity { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the user has reserved themselves from electronic communication.
    /// </summary>
    [JsonPropertyName("isReserved")]
    public bool IsReserved { get; set; }

    /// <summary>
    /// Gets or sets the phone number.
    /// </summary>
    [JsonPropertyName("phoneNumber")]
    public string? PhoneNumber { get; set; }

    /// <summary>
    /// Gets or sets the email address.
    /// </summary>
    [JsonPropertyName("email")]
    public string? Email { get; set; }

    /// <summary>
    /// Gets or sets the party ID.
    /// </summary>
    [JsonPropertyName("partyId")]
    public int PartyId { get; set; }

    /// <summary>
    /// Gets or sets the <see cref="Party"/>.
    /// </summary>
    [JsonPropertyName("party")]
    public Party? Party { get; set; }

    /// <summary>
    /// Gets or sets the <see cref="UserType"/>.
    /// </summary>
    [JsonPropertyName("userType")]
    public UserType UserType { get; set; }

    /// <summary>
    /// Gets or sets the <see cref="ProfileSettingPreference"/>.
    /// </summary>
    [JsonPropertyName("profileSettingPreference")]
    public ProfileSettingPreference? ProfileSettingPreference { get; set; }
}
