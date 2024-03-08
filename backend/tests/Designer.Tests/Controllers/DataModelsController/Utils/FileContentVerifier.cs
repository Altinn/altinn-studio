using System.IO;
using FluentAssertions;
using SharedResources.Tests;

namespace Designer.Tests.Controllers.DataModelsController.Utils
{
    public static class FileContentVerifier
    {
        // Verify content of json file on given path
        public static void VerifyJsonFileContent(string path, string json)
        {
            string fileContent = File.ReadAllText(path);
            JsonUtils.DeepEquals(fileContent, json).Should().BeTrue();
        }
    }
}
