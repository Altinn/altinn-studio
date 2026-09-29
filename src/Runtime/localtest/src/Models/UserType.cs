namespace Altinn.Platform.Profile.Models;

/// <summary>
/// The available user types.
/// </summary>
/// <remarks>
/// Unchanged from the old, deprecated <c>Altinn.Platform.Profile.Enums.UserType</c> — same members, same
/// underlying values.
/// </remarks>
public enum UserType
{
    /// <summary>
    /// User type has not been specified.
    /// </summary>
    None = 0,

    /// <summary>
    /// User type is SSN identified user.
    /// </summary>
    SSNIdentified = 1,

    /// <summary>
    /// User type is self identified user.
    /// </summary>
    SelfIdentified = 2,

    /// <summary>
    /// User type is enterprise identified user.
    /// </summary>
    EnterpriseIdentified = 3,

    /// <summary>
    /// User type is agency user.
    /// </summary>
    AgencyUser = 4,

    /// <summary>
    /// User type is PSAN user.
    /// </summary>
    PSAN = 5,

    /// <summary>
    /// User type is PSA user.
    /// </summary>
    PSA = 6,
}
