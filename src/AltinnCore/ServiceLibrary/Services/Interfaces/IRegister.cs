using System.Threading.Tasks;
using AltinnCore.ServiceLibrary.Models;

namespace AltinnCore.ServiceLibrary.Services.Interfaces
{
    /// <summary>
    /// Interface for register functionality
    /// </summary>
    public interface IRegister
    {
        /// <summary>
        /// The access to dsf methods through register
        /// </summary>
        IDSF DSF { get; }

        /// <summary>
        /// The access to er methods through register
        /// </summary>
        IER ER { get; }

        /// <summary>
        /// Returns party information
        /// </summary>
        /// <param name="partyId">The partyId</param>
        /// <returns>The party for the given partyId</returns>
        Task<Party> GetParty(int partyId);
    }
}
