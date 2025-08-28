using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace SharedResources.Tests
{
    public static class JsonUtils
    {
        public static bool DeepEquals(string expectedJson, string json)
        {
            JToken actual = (JToken)JsonConvert.DeserializeObject(json);
            JToken expected = (JToken)JsonConvert.DeserializeObject(expectedJson);
            return JToken.DeepEquals(expected, actual);
        }
    }
}
