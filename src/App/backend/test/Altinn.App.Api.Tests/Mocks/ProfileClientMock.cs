using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Core.Internal.Profile;
using Altinn.Platform.Profile.Models;

namespace Altinn.App.Api.Tests.Mocks;

public class ProfileClientMock : IProfileClient
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    public async Task<UserProfile?> GetUserProfile(int userId)
    {
        var folder = TestData.GetRegisterProfilePath();
        var file = Path.Join(folder, $"{userId}.json");
        return await JsonSerializer.DeserializeAsync<UserProfile>(File.OpenRead(file), _jsonSerializerOptions);
    }

    public Task<UserProfile?> GetUserProfile(string ssn)
    {
        throw new NotImplementedException();
    }
}
