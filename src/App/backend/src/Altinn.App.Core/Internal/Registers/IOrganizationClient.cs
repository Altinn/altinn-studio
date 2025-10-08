using Altinn.Platform.Register.Models;

namespace Altinn.App.Core.Internal.Registers;

/// <summary>
/// Interface for the entity registry (ER: Enhetsregisteret)
/// </summary>
public interface IOrganizationClient
{
    /// <summary>
    /// Method for getting an organization based on a organization nr
    /// </summary>
    /// <param name="OrgNr">the organization number</param>
    /// <returns>The organization for the given organization number</returns>
    Task<Organization?> GetOrganization(string OrgNr);
}
