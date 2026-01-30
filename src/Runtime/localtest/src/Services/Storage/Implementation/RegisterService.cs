using System.Threading.Tasks;
using Altinn.Platform.Register.Models;
using LocalTest.Services.Register.Interface;

namespace Altinn.Platform.Storage.Services;

/// <summary>
/// Implementation of <see cref="IRegisterService"/> for local testing.
/// </summary>
public class RegisterService : IRegisterService
{
    private readonly IParties _partiesService;

    /// <summary>
    /// Initializes a new instance of the <see cref="RegisterService"/> class.
    /// </summary>
    public RegisterService(IParties partiesService)
    {
        _partiesService = partiesService;
    }

    /// <inheritdoc/>
    public async Task<Party> GetParty(int partyId)
    {
        return await _partiesService.GetParty(partyId);
    }

    /// <inheritdoc/>
    public async Task<int> PartyLookup(string person, string orgNo)
    {
        string lookupValue = !string.IsNullOrEmpty(person) ? person : orgNo;
        return await _partiesService.LookupPartyIdBySSNOrOrgNo(lookupValue);
    }
}
