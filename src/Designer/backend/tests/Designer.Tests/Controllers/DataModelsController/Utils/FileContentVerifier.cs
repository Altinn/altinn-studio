using System.IO;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController.Utils
{
    public static class FileContentVerifier
    {
        // Verify content of json file on given path
        public static void VerifyJsonFileContent(string path, string json)
        {
            string fileContent = File.ReadAllText(path);
            Assert.True(JsonUtils.DeepEquals(fileContent, json));
        }
    }
}
