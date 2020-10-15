using System.Threading.Tasks;

namespace Altinn.Platform.Events.Services.Interfaces
{
    /// <summary>
    /// Interface
    /// </summary>
    public interface IRegisterService
    {
        /// <summary>
        /// Party lookup
        /// </summary>
        /// <param name="orgNo">organisation number</param>
        /// <param name="person">f or d number</param>
        /// <returns></returns>
        Task<int> PartyLookup(string orgNo, string person);
    }
}
