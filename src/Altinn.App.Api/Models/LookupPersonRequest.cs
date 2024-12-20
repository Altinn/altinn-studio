namespace Altinn.App.Api.Models;

/// <summary>
/// Data transfer object for the request to search for a person.
/// </summary>
public class LookupPersonRequest
{
    /// <summary>
    /// The social security number of the person to search for.
    /// </summary>
    public required string SocialSecurityNumber { get; set; }

    /// <summary>
    /// The last name of the person to search for.
    /// </summary>
    public required string LastName { get; set; }
}
