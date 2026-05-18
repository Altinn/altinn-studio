using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Tests.Common.Data;
using Altinn.Platform.Register.Models;

namespace Altinn.App.Api.Tests.Mocks;

public class RegisterClientMock : IRegisterClient
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly string _partyFolder = CommonTestData.GetAltinnProfilePath();

    public async Task<Party?> GetPartyUnchecked(
        int partyId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        var partyList = await GetPartyListUnchecked([partyId], authenticationMethod, cancellationToken);
        return partyList.SingleOrDefault(p => p.PartyId == partyId);
    }

    public async Task<IReadOnlyList<Party>> GetPartyListUnchecked(
        IReadOnlyList<int> partyIds,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
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
