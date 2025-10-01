using Altinn.Platform.Register.Models;

namespace Altinn.App.Core.Interface;

/// <summary>
/// Interface for the resident registration database (DSF: Det sentrale folkeregisteret)
/// </summary>
[Obsolete(message: "Upstream API changed. Use Altinn.App.Core.Internal.Registers.IPersonClient instead", error: true)]
public interface IDSF
{
    /// <summary>
    /// Method for getting a person based on their social security number
    /// </summary>
    /// <param name="SSN">The social security number</param>
    /// <returns>The person for the given social security number</returns>
    Task<Person?> GetPerson(string SSN);
}
