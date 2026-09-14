namespace Altinn.App.Core.Models;

/// <summary>
/// The available party types.
/// </summary>
/// <remarks>
/// Unchanged from the old, deprecated <c>Altinn.Platform.Register.Enums.PartyType</c> — same members,
/// same underlying values.
/// </remarks>
public enum PartyType
{
    /// <summary>
    /// The party is a person.
    /// </summary>
    Person = 1,

    /// <summary>
    /// The party is an organization.
    /// </summary>
    Organisation = 2,

    /// <summary>
    /// The party is a self identified user.
    /// </summary>
    SelfIdentified = 3,

    /// <summary>
    /// The party is a sub unit.
    /// </summary>
    SubUnit = 4,

    /// <summary>
    /// The party is a bankruptcy estate.
    /// </summary>
    BankruptcyEstate = 5,
}
