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
using Altinn.Platform.Storage.Interface.Models;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ApplicationMetadataController
{
    public class UpdateMetadataForAttachmentTests : ApplicationMetadataControllerTestsBase<UpdateMetadataForAttachmentTests>
    {

        public UpdateMetadataForAttachmentTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.ApplicationMetadataController> factory) : base(factory)
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
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/attachment-component";
            var payloadNode = JsonNode.Parse(payload);

            // payload
            using var payloadContent = new StringContent(payload, Encoding.UTF8, MediaTypeNames.Application.Json);
            using var response = await HttpClient.Value.PutAsync(url, payloadContent);

            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string applicationMetadataFile = await File.ReadAllTextAsync(Path.Combine(CreatedFolderPath, "App", "config", "applicationmetadata.json"));
            var applicationMetadata = JsonSerializer.Deserialize<Application>(applicationMetadataFile, _jsonSerializerOptions);

            var attachmentDataType = applicationMetadata.DataTypes.Single(x => x.Id == payloadNode!["id"]!.ToString());
            attachmentDataType.MaxCount.Should().Be(payloadNode!["maxCount"]!.GetValue<int>());
            attachmentDataType.MaxSize.Should().Be(payloadNode!["maxSize"]!.GetValue<int>());
            attachmentDataType.MinCount.Should().Be(payloadNode!["minCount"]!.GetValue<int>());

            attachmentDataType.AllowedContentTypes.Count.Should().Be(expectedContentTypes.Length);

            foreach (string contentType in expectedContentTypes)
            {
                attachmentDataType.AllowedContentTypes.Should().Contain(contentType);
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
