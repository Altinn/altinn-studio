using System.Threading.Tasks;
using AltinnCore.ServiceLibrary;

namespace Altinn.Platform.Register.Services.Interfaces
{
    /// <summary>
    /// Interface handling methods for operations related to persons
    /// </summary>
    public interface IPersons
    {
        /// <summary>
        /// Method that fetches a person based on a  security number
        /// </summary>
        /// <param name="ssn">The persons ssn</param>
        /// <returns></returns>
        Task<Person> GetPerson(string ssn);
    }
}
