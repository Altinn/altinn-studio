namespace Altinn.App.Core.Models;

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
    public int UserId { get; set; }

    /// <summary>
    /// Gets or sets the UUID of the user.
    /// </summary>
    public Guid? UserUuid { get; set; }

    /// <summary>
    /// Gets or sets the username.
    /// </summary>
    public string? UserName { get; set; }

    /// <summary>
    /// Gets or sets the external identity.
    /// </summary>
    public string? ExternalIdentity { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the user has reserved themselves from electronic communication.
    /// </summary>
    public bool IsReserved { get; set; }

    /// <summary>
    /// Gets or sets the phone number.
    /// </summary>
    public string? PhoneNumber { get; set; }

    /// <summary>
    /// Gets or sets the email address.
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// Gets or sets the party ID.
    /// </summary>
    public int PartyId { get; set; }

    /// <summary>
    /// Gets or sets the <see cref="Party"/>.
    /// </summary>
    public Party? Party { get; set; }

    /// <summary>
    /// Gets or sets the <see cref="UserType"/>.
    /// </summary>
    public UserType UserType { get; set; }

    /// <summary>
    /// Gets or sets the <see cref="ProfileSettingPreference"/>.
    /// </summary>
    public ProfileSettingPreference? ProfileSettingPreference { get; set; }
}
