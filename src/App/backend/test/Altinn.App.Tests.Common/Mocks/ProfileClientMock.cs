using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Tests.Common.Data;
using Altinn.Platform.Profile.Models;

namespace Altinn.App.Tests.Common.Mocks;

public class ProfileClientMock : IProfileClient
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    public async Task<UserProfile?> GetUserProfile(int userId, StorageAuthenticationMethod? authenticationMethod = null)
    {
        var folder = CommonTestData.GetRegisterProfilePath();
        var file = Path.Join(folder, $"{userId}.json");
        return await JsonSerializer.DeserializeAsync<UserProfile>(File.OpenRead(file), _jsonSerializerOptions);
    }

    public Task<UserProfile?> GetUserProfile(string ssn, StorageAuthenticationMethod? authenticationMethod = null)
    {
        throw new NotImplementedException();
    }

    public Task<UserProfile?> GetUserProfile(Guid userUuid)
    {
        throw new NotImplementedException();
    }
}
