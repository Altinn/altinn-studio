namespace Altinn.App.Core.Models;

/// <summary>
/// The available party types.
/// </summary>
public enum PartyType
{
    /// <summary>
    /// The party is a person.
    /// </summary>
    Person = 1,

    /// <summary>
    /// The party is an organisation.
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
