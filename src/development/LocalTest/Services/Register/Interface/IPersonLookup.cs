#nullable enable
using System.Threading.Tasks;

using Altinn.Platform.Register.Models;

namespace Altinn.Platform.Register.Core
{
    /// <summary>
    /// Describes the methods required by a person check service.
    /// </summary>
    public interface IPersonLookup
    {
        /// <summary>
        /// Describes the signature of a lookup method.
        /// </summary>
        /// <param name="nationalIdentityNumber">The national identity number to check.</param>
        /// <param name="lastName">The last name of the person. Must match the last name of the person.</param>
        /// <param name="activeUser">The unique id of the user performing the check.</param>
        /// <returns>The identified person if found.</returns>
        Task<Person?> GetPerson(string nationalIdentityNumber, string lastName, int activeUser);
    }
}
