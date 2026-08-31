namespace Altinn.Studio.Designer.Enums;

/// <summary>
/// The scope a validation-on-navigation configuration applies to. The member names match the
/// frontend ValidationOnNavigationLevel enum values, so query strings bind directly.
/// </summary>
public enum ValidationOnNavigationLevel
{
    /// <summary>
    /// The app-wide global configuration in global settings.json.
    /// </summary>
    Global,

    /// <summary>
    /// The configuration stored per layout set in its settings.json.
    /// </summary>
    LayoutSets,

    /// <summary>
    /// The configuration stored per page within the layout sets in its "layout".json.
    /// </summary>
    Pages,
}
