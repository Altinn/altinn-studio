using System.IO;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController.Utils
{
    public static class FileContentVerifier
    {
        // Verify content of json file on given path
        public static void VerifyJsonFileContent(string path, string json)
        {
            string fileContent = File.ReadAllText(path);
            JObject result = (JObject)JsonConvert.DeserializeObject(fileContent);
            JObject expected = (JObject)JsonConvert.DeserializeObject(json);
            Assert.True(JToken.DeepEquals(expected, result));
        }
    }
}
