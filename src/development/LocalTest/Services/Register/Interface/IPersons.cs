using Altinn.Platform.Register.Models;
using System.Threading.Tasks;

namespace LocalTest.Services.Register.Interface
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
