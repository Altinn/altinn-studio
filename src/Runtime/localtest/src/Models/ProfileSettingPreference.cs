using System.Text.Json.Serialization;

namespace Altinn.Platform.Profile.Models;

/// <summary>
/// Describes a user's profile setting preferences.
/// </summary>
/// <remarks>
/// Compared to the old, deprecated <c>Altinn.Platform.Profile.Models.ProfileSettingPreference</c>:
/// <see cref="PreselectedPartyUuid"/>, <see cref="ShowClientUnits"/>,
/// <see cref="ShouldShowSubEntities"/>, and <see cref="ShouldShowDeletedEntities"/> are new fields.
/// </remarks>
public class ProfileSettingPreference
{
    /// <summary>
    /// Sets the user's language preference in Altinn.
    /// </summary>
    /// <remarks>
    /// Write-only alias used to support incoming JSON "languageType" while avoiding duplicate
    /// serialization output. Value is stored in <see cref="Language"/>.
    /// </remarks>
    [JsonPropertyName("languageType")]
    public string? LanguageType
    {
        set { Language = value; }
    }

    /// <summary>
    /// Gets or sets the user's language preference in Altinn.
    /// </summary>
    [JsonPropertyName("language")]
    public string? Language { get; set; }

    /// <summary>
    /// Gets or sets the user's preselected party.
    /// </summary>
    /// <remarks>
    /// This is being phased out in favor of <see cref="PreselectedPartyUuid"/>.
    /// </remarks>
    [JsonPropertyName("preSelectedPartyId")]
    public int PreSelectedPartyId { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the user wants to be asked for the party on every form submission.
    /// </summary>
    [JsonPropertyName("doNotPromptForParty")]
    public bool DoNotPromptForParty { get; set; }

    /// <summary>
    /// Gets or sets the UUID of the preselected party. Optional.
    /// </summary>
    [JsonPropertyName("preselectedPartyUuid")]
    public Guid? PreselectedPartyUuid { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether client units should be shown.
    /// </summary>
    [JsonPropertyName("showClientUnits")]
    public bool ShowClientUnits { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether sub-entities should be shown.
    /// </summary>
    [JsonPropertyName("shouldShowSubEntities")]
    public bool ShouldShowSubEntities { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether deleted entities should be shown.
    /// </summary>
    [JsonPropertyName("shouldShowDeletedEntities")]
    public bool ShouldShowDeletedEntities { get; set; }
}
