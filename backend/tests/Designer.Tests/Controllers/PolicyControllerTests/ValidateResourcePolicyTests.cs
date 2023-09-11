using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Controllers;
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
    public class ValidateResourcePolicyTests : DisagnerEndpointsTestsBase<PolicyController, ValidateResourcePolicyTests>
    {
        private readonly string _versionPrefix = "designer/api";

        public ValidateResourcePolicyTests(WebApplicationFactory<PolicyController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Validate_ResourcePolicyOk()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest("ttd", "ttd-resources", "testUser", targetRepository);


            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/policy/validate/ttdres1";
            ValidationProblemDetails validationDetails;
            using (HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData))
            {
                HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
                response.EnsureSuccessStatusCode();
                string responseBody = await response.Content.ReadAsStringAsync();
                validationDetails = System.Text.Json.JsonSerializer.Deserialize<ValidationProblemDetails>(responseBody, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            }

            Assert.Equal(StatusCodes.Status200OK, (int)validationDetails.Status);
        }

        [Fact]
        public async Task Validate_ResourcePolicyMissingSubject()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest("ttd", "ttd-resources", "testUser", targetRepository);

            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/policy/ttdres1";
            ResourcePolicy resourcePolicy;
            using (HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData))
            {
                HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
                response.EnsureSuccessStatusCode();
                string responseBody = await response.Content.ReadAsStringAsync();
                resourcePolicy = System.Text.Json.JsonSerializer.Deserialize<ResourcePolicy>(responseBody, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            }

            // Add empty illegal rule
            resourcePolicy.Rules.Add(new PolicyRule() { RuleId = "xys" });

            string dataPathWithData2 = $"{_versionPrefix}/ttd/{targetRepository}/policy/ttdres1";
            using (HttpRequestMessage httpRequestMessage2 = new HttpRequestMessage(HttpMethod.Put, dataPathWithData2))
            {
                httpRequestMessage2.Content = new StringContent(JsonConvert.SerializeObject(resourcePolicy), Encoding.UTF8, "application/json");
                HttpResponseMessage response2 = await HttpClient.Value.SendAsync(httpRequestMessage2);
                response2.EnsureSuccessStatusCode();
            }


            string dataPathWithData3 = $"{_versionPrefix}/ttd/{targetRepository}/policy/validate/ttdres1";
            ValidationProblemDetails validationDetails;
            using (HttpRequestMessage httpRequestMessage3 = new HttpRequestMessage(HttpMethod.Get, dataPathWithData3))
            {
                HttpResponseMessage response3 = await HttpClient.Value.SendAsync(httpRequestMessage3);
                string responseBody3 = await response3.Content.ReadAsStringAsync();
                validationDetails = System.Text.Json.JsonSerializer.Deserialize<ValidationProblemDetails>(responseBody3, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            }

            Assert.Equal(StatusCodes.Status400BadRequest, (int)validationDetails.Status);
            Assert.Equal(1, validationDetails.Errors.Count);
        }



        [Fact]
        public async Task Validate_ResourcePolicyMissingRules()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest("ttd", "ttd-resources", "testUser", targetRepository);

            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/policy/ttdres1";
            ResourcePolicy resourcePolicy;
            using (HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData))
            {
                HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
                response.EnsureSuccessStatusCode();
                string responseBody = await response.Content.ReadAsStringAsync();
                resourcePolicy = System.Text.Json.JsonSerializer.Deserialize<ResourcePolicy>(responseBody, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            }

            // Delete all rules
            resourcePolicy.Rules = new List<PolicyRule>();

            string dataPathWithData2 = $"{_versionPrefix}/ttd/{targetRepository}/policy/ttdres1";
            using (HttpRequestMessage httpRequestMessage2 = new HttpRequestMessage(HttpMethod.Put, dataPathWithData2))
            {
                httpRequestMessage2.Content = new StringContent(JsonConvert.SerializeObject(resourcePolicy), Encoding.UTF8, "application/json");
                HttpResponseMessage response2 = await HttpClient.Value.SendAsync(httpRequestMessage2);
                response2.EnsureSuccessStatusCode();
            }


            string dataPathWithData3 = $"{_versionPrefix}/ttd/{targetRepository}/policy/validate/ttdres1";
            ValidationProblemDetails validationDetails;
            using (HttpRequestMessage httpRequestMessage3 = new HttpRequestMessage(HttpMethod.Get, dataPathWithData3))
            {
                HttpResponseMessage response3 = await HttpClient.Value.SendAsync(httpRequestMessage3);
                string responseBody3 = await response3.Content.ReadAsStringAsync();
                validationDetails = System.Text.Json.JsonSerializer.Deserialize<ValidationProblemDetails>(responseBody3, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            }

            Assert.Equal(StatusCodes.Status400BadRequest, (int)validationDetails.Status);
            Assert.Equal(1, validationDetails.Errors.Count);
        }
    }
}
