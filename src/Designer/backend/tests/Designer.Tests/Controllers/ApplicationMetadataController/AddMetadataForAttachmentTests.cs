#nullable disable
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Models.App;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ApplicationMetadataController
{
    public class AddMetadataForAttachmentTests : DesignerEndpointsTestsBase<AddMetadataForAttachmentTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/metadata";
        public AddMetadataForAttachmentTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [MemberData(nameof(TestData))]
        public async Task AddMetadataForAttachment_WhenExists_ShouldReturnConflict(string org, string app, string developer, DataType payload)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/attachment-component";

            // payload
            using var payloadContent = new StringContent(JsonSerializer.Serialize(payload, JsonSerializerOptions), Encoding.UTF8, MediaTypeNames.Application.Json);
            using var response = await HttpClient.PostAsync(url, payloadContent);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string applicationMetadataFile = await File.ReadAllTextAsync(Path.Combine(TestRepoPath, "App", "config", "applicationmetadata.json"));
            var applicationMetadata = JsonSerializer.Deserialize<ApplicationMetadata>(applicationMetadataFile, JsonSerializerOptions);

            var attachmentDataType = applicationMetadata.DataTypes.Single(x => x.Id == payload.Id);

            Assert.Equal(payload.MaxCount, attachmentDataType.MaxCount);
            Assert.Equal(payload.MaxSize, attachmentDataType.MaxSize);
            Assert.Equal(payload.MinCount, attachmentDataType.MinCount);
        }

        /// <summary>
        /// Only 4 parameters are expected in a theory for payload
        /// </summary>
        public static IEnumerable<object[]> TestData => new List<object[]>
        {
            new object[]
            {
                "ttd", "hvem-er-hvem", "testUser", new DataType
                {
                    Id = "testId",
                    MaxCount = 1,
                    MaxSize = 25,
                    MinCount = 1
                }
            }
        };

    }
}
