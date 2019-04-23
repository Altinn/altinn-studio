using AltinnCore.ServiceLibrary.Models;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for register functionality
    /// </summary>
    public interface IRegister
    {
        /// <summary>
        /// Operation that returns the Party for a given partyId from a testfile
        /// </summary>
        /// <param name="partyId">The partyId</param>
        /// <returns>The party</returns>
        Party GetPartyFromTestFile(int partyId);
    }
}
