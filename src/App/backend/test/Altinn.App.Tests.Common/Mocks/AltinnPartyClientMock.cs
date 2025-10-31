using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Tests.Common.Data;
using Altinn.Platform.Register.Models;

namespace Altinn.App.Tests.Common.Mocks;

public class AltinnPartyClientMock : IAltinnPartyClient
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly string _partyFolder = CommonTestData.GetAltinnProfilePath();

    public async Task<Party?> GetParty(int partyId)
    {
        var file = Path.Join(_partyFolder, $"{partyId}.json");
        await using var fileHandle = File.OpenRead(file); // Throws exception if missing (helps with debugging tests)
        return await JsonSerializer.DeserializeAsync<Party>(fileHandle, _jsonSerializerOptions);
    }

    public async Task<Party> LookupParty(PartyLookup partyLookup)
    {
        var files = Directory.GetFiles(_partyFolder, "*.json");
        foreach (var file in files)
        {
            var fileHandle = File.OpenRead(file);
            var party = (await JsonSerializer.DeserializeAsync<Party>(fileHandle))!;
            if (partyLookup.OrgNo != null && party.OrgNumber == partyLookup.OrgNo)
            {
                return party;
            }

            if (partyLookup.Ssn != null && party.SSN == partyLookup.Ssn)
            {
                return party;
            }
        }

        // Current implementation throws PlatformException if party is not found. Not sure what the correct behaviour for tests is.
        throw new Exception(
            $"Could not find party with orgNo {partyLookup.OrgNo} or ssn {partyLookup.Ssn} in {_partyFolder}"
        );
    }
}
