using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace SharedResources.Tests
{
    public static class JsonAssertionUtils
    {
        public static bool DeepEquals(string expectedJson, string json)
        {
            JObject actual = (JObject)JsonConvert.DeserializeObject(json);
            JObject expected = (JObject)JsonConvert.DeserializeObject(expectedJson);
            return JToken.DeepEquals(expected, actual);
        }
    }
}
