namespace Altinn.Platform.Profile.Models;

/// <summary>
/// Describes a user's profile setting preferences.
/// </summary>
public class ProfileSettingPreference
{
    /// <summary>
    /// Sets the user's language preference in Altinn.
    /// </summary>
    /// <remarks>
    /// Write-only alias used to support incoming JSON "languageType" while avoiding duplicate
    /// serialization output. Value is stored in <see cref="Language"/>.
    /// </remarks>
    public string? LanguageType
    {
        set { Language = value; }
    }

    /// <summary>
    /// Gets or sets the user's language preference in Altinn.
    /// </summary>
    public string? Language { get; set; }

    /// <summary>
    /// Gets or sets the user's preselected party.
    /// </summary>
    /// <remarks>
    /// This is being phased out in favor of <see cref="PreselectedPartyUuid"/>.
    /// </remarks>
    public int PreSelectedPartyId { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the user wants to be asked for the party on every form submission.
    /// </summary>
    public bool DoNotPromptForParty { get; set; }

    /// <summary>
    /// Gets or sets the UUID of the preselected party. Optional.
    /// </summary>
    public Guid? PreselectedPartyUuid { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether client units should be shown.
    /// </summary>
    public bool ShowClientUnits { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether sub-entities should be shown.
    /// </summary>
    public bool ShouldShowSubEntities { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether deleted entities should be shown.
    /// </summary>
    public bool ShouldShowDeletedEntities { get; set; }
}
