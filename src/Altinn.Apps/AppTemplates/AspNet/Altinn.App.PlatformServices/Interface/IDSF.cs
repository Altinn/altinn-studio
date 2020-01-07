using System.Threading.Tasks;
using Altinn.Platform.Register.Models;

namespace Altinn.App.Services.Interface
{
    /// <summary>
    /// Interface for the resident registration database (DSF: Det sentrale folkeregisteret)
    /// </summary>
    public interface IDSF
    {
        /// <summary>
        /// Method for getting a person based on their social security number
        /// </summary>
        /// <param name="SSN">The social security number</param>
        /// <returns>The person for the given social security number</returns>
        Task<Person> GetPerson(string SSN);
    }
}
