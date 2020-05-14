using System.Threading.Tasks;
using Altinn.App.Services.Models;
using Altinn.Platform.Register.Models;

namespace Altinn.App.Services.Interface
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

        /// <summary>
        /// Looks up a party by person or organisation number.
        /// </summary>
        /// <param name="partyLookup"></param>
        /// <returns>The party lookup containing either SSN or organisation number.</returns>
        Task<Party> LookupParty(PartyLookup partyLookup);
    }
}
