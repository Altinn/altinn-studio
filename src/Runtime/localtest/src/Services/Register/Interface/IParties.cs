#nullable enable
using Altinn.Platform.Register.Models;

namespace LocalTest.Services.Register.Interface
{
    /// <summary>
    /// Interface handling methods for operations related to parties
    /// </summary>
    public interface IParties
    {
        /// <summary>
        /// Method that fetches a party based on a party id
        /// </summary>
        /// <param name="partyId">The party id</param>
        /// <returns></returns>
        Task<Party?> GetParty(int partyId);

        /// <summary>
        /// Method that fetches  party list based on list of party ids
        /// </summary>
        /// <param name="partyIds">The party id list</param>
        /// <returns></returns>
        Task<List<Party?>> GetPartyList(List<int> partyIds);

        /// <summary>
        /// Method that looks up a party id based on social security number or organisation number.
        /// </summary>
        /// <param name="lookupValue">SSN or org number</param>
        /// <returns></returns>
        Task<int> LookupPartyIdBySSNOrOrgNo(string lookupValue);

        /// <summary>
        /// Method that fetches a party based on social security number or organisation number.
        /// </summary>
        /// <param name="lookupValue">SSN or org number</param>
        /// <returns></returns>
        Task<Party?> LookupPartyBySSNOrOrgNo(string lookupValue);
    }
}
