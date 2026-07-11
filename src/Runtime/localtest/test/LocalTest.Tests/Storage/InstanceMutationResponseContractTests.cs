using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;
using InstanceMutationResponse = Altinn.Platform.Storage.LocalTest.Models.InstanceMutationResponse;

namespace LocalTest.Tests.Storage;

public class InstanceMutationResponseContractTests
{
    [Fact]
    public void Serialize_PreservesTemporaryLegacyWireShape()
    {
        InstanceMutationResponse response = new()
        {
            Instance = new Instance { Id = "123/93b2b455-67fb-4d40-a3c2-3a8f15f04240" },
            DataElementContentEtags = new Dictionary<string, string>
            {
                ["data-element-id"] = "\"content-etag\"",
            },
        };

        JObject json = JObject.Parse(JsonConvert.SerializeObject(response));

        Assert.Equal(response.Instance.Id, json["instance"]?["id"]?.Value<string>());
        Assert.Equal(
            response.DataElementContentEtags["data-element-id"],
            json["dataElementContentEtags"]?["data-element-id"]?.Value<string>()
        );
    }
}
