using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Core.Internal.Registers;
using Altinn.Platform.Register.Models;

namespace Altinn.App.Api.Tests.Mocks;

public class RegisterClientMock : IRegisterClient
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly string _partyFolder = TestData.GetAltinnProfilePath();

    public async Task<Party?> GetPartyUnchecked(int partyId, CancellationToken cancellationToken)
    {
        var partyList = await GetPartyListUnchecked([partyId], cancellationToken);
        return partyList.SingleOrDefault(p => p.PartyId == partyId);
    }

    public async Task<IReadOnlyList<Party>> GetPartyListUnchecked(
        IReadOnlyList<int> partyIds,
        CancellationToken cancellationToken
    )
    {
        List<Party> parties = [];
        foreach (var partyId in partyIds)
        {
            var file = Path.Join(_partyFolder, $"{partyId}.json");
            await using var fileHandle = File.OpenRead(file); // Throws exception if missing (helps with debugging tests)
            var party = await JsonSerializer.DeserializeAsync<Party>(fileHandle, _jsonSerializerOptions);
            parties.Add(party!);
        }

        return parties;
    }
}
