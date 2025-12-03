using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.App;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ApplicationMetadataController
{
    public class UpdateMetadataForAttachmentTests : DesignerEndpointsTestsBase<UpdateMetadataForAttachmentTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/metadata";
        public UpdateMetadataForAttachmentTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        private readonly JsonSerializerOptions _jsonSerializerOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        [Theory]
        [MemberData(nameof(TestData))]
        public async Task UpdateMetadataForAttachment_WhenExists_ShouldReturnConflict(string org, string app, string developer, string payload, params string[] expectedContentTypes)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/attachment-component";
            var payloadNode = JsonNode.Parse(payload);

            // payload
            using var payloadContent = new StringContent(payload, Encoding.UTF8, MediaTypeNames.Application.Json);
            using var response = await HttpClient.PutAsync(url, payloadContent);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string applicationMetadataFile = await File.ReadAllTextAsync(Path.Combine(TestRepoPath, "App", "config", "applicationmetadata.json"));
            var applicationMetadata = JsonSerializer.Deserialize<ApplicationMetadata>(applicationMetadataFile, _jsonSerializerOptions);

            var attachmentDataType = applicationMetadata.DataTypes.Single(x => x.Id == payloadNode!["id"]!.ToString());

            Assert.Equal(attachmentDataType.MaxCount, payloadNode!["maxCount"]!.GetValue<int>());
            Assert.Equal(attachmentDataType.MaxSize, payloadNode!["maxSize"]!.GetValue<int>());
            Assert.Equal(attachmentDataType.MinCount, payloadNode!["minCount"]!.GetValue<int>());


            Assert.Equal(attachmentDataType.AllowedContentTypes.Count, expectedContentTypes.Length);

            foreach (string contentType in expectedContentTypes)
            {
                Assert.Contains(contentType, attachmentDataType.AllowedContentTypes);
            }
        }

        // Payload should have strong type instead in controller.
        public static IEnumerable<object[]> TestData => new List<object[]>
        {
            new object[]
            {
                "ttd", "hvem-er-hvem", "testUser", @"
                {
                    ""id"": ""testId"",
                    ""maxCount"": 1,
                    ""maxSize"": 25,
                    ""minCount"": 1,
                    ""fileType"": "".pdf, .jpeg, .gif""
                }",
                MediaTypeNames.Application.Pdf,
                MediaTypeNames.Image.Jpeg,
                MediaTypeNames.Image.Gif,

            }
        };
    }
}
