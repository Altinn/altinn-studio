using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Linq;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ProcessModelingController
{
    public class UpdateProcessTaskName : DisagnerEndpointsTestsBase<UpdateProcessTaskName>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string Url(string org, string repository, string taskId, string taskName) => $"/designer/api/{org}/{repository}/process-modelling/tasks/{taskId}/{taskName}";

        public UpdateProcessTaskName(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "app-with-process", "testUser", "Task_1", "NewTaskName")]
        public async Task UpdateProcessTaskName_ShouldReturnUpdatedProcess(string org, string app, string developer, string taskId, string taskName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = Url(org, targetRepository, taskId, taskName);

            using var response = await HttpClient.PutAsync(url, null);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string responseContent = await response.Content.ReadAsStringAsync();

            responseContent.Should().NotBeNullOrEmpty();
            responseContent.Should().Contain(taskName);
        }

        [Theory]
        [InlineData("ttd", "app-with-process", "testUser", "Does_not_exist", "NewTaskName")]
        public async Task InvalidTaskId_ShouldReturnBadRequest(string org, string app, string developer,  string taskId, string taskName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = Url(org, targetRepository, taskId, taskName);

            using var response = await HttpClient.PutAsync(url, null);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }
}
