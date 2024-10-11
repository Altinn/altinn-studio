using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.PolicyAdmin.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Newtonsoft.Json;
using Xunit;

namespace Designer.Tests.Controllers.PolicyControllerTests
{
    public class ValidateAppPolicyTests : DesignerEndpointsTestsBase<ValidateAppPolicyTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly string _versionPrefix = "designer/api";

        public ValidateAppPolicyTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Validate_AppPolicyOk()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest("ttd", "apps-test", "testUser", targetRepository);


            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/policy/validate";
            ValidationProblemDetails validationDetails;
            using (HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData))
            {
                HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
                response.EnsureSuccessStatusCode();
                string responseBody = await response.Content.ReadAsStringAsync();
                validationDetails = System.Text.Json.JsonSerializer.Deserialize<ValidationProblemDetails>(responseBody, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            }


            Assert.Equal(StatusCodes.Status200OK, (int)validationDetails.Status);
        }

        [Fact]
        public async Task Validate_AppPolicyMissingSubject()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest("ttd", "apps-test", "testUser", targetRepository);

            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/policy";
            ResourcePolicy resourcePolicy;
            using (HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData))
            {
                HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
                response.EnsureSuccessStatusCode();
                string responseBody = await response.Content.ReadAsStringAsync();
                resourcePolicy = System.Text.Json.JsonSerializer.Deserialize<ResourcePolicy>(responseBody, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            }

            // Add empty illegal rule
            resourcePolicy.Rules.Add(new PolicyRule() { RuleId = "xys" });

            string dataPathWithData2 = $"{_versionPrefix}/ttd/{targetRepository}/policy";
            using (HttpRequestMessage httpRequestMessage2 = new HttpRequestMessage(HttpMethod.Put, dataPathWithData2))
            {

                httpRequestMessage2.Content = new StringContent(JsonConvert.SerializeObject(resourcePolicy), Encoding.UTF8, "application/json");

                HttpResponseMessage response2 = await HttpClient.SendAsync(httpRequestMessage2);
                response2.EnsureSuccessStatusCode();
            }


            string dataPathWithData3 = $"{_versionPrefix}/ttd/{targetRepository}/policy/validate";
            ValidationProblemDetails validationDetails;
            using (HttpRequestMessage httpRequestMessage3 = new HttpRequestMessage(HttpMethod.Get, dataPathWithData3))
            {
                HttpResponseMessage response3 = await HttpClient.SendAsync(httpRequestMessage3);
                string responseBody3 = await response3.Content.ReadAsStringAsync();
                validationDetails = System.Text.Json.JsonSerializer.Deserialize<ValidationProblemDetails>(responseBody3, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            }

            Assert.Equal(StatusCodes.Status400BadRequest, (int)validationDetails.Status);
            Assert.Single(validationDetails.Errors);
        }
    }
}
