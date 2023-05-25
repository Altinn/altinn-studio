using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.PolicyAdmin.Constants;
using Altinn.Studio.PolicyAdmin.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Newtonsoft.Json;
using Xunit;

namespace Designer.Tests.Controllers
{
    public class PolicyControllerTests : ApiTestsBase<PolicyController, PolicyControllerTests>
    {
        private readonly string _versionPrefix = "designer/api";

        public PolicyControllerTests(WebApplicationFactory<PolicyController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Update_AppPolicyOk()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await TestDataHelper.CopyRepositoryForTest("ttd", "apps-test", "testUser", targetRepository);

            ResourcePolicy resourcePolicy = CreateTestPolicy("ttd", targetRepository);

            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/policy";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, dataPathWithData);

            httpRequestMessage.Content = new StringContent(JsonConvert.SerializeObject(resourcePolicy), Encoding.UTF8, "application/json");

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.EnsureSuccessStatusCode();
            string responseBody = await response.Content.ReadAsStringAsync();

            try
            {
                Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
            }
        }

        [Fact]
        public async Task Update_ResourcePolicyOk()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await TestDataHelper.CopyRepositoryForTest("ttd", "ttd-resources", "testUser", targetRepository);

            ResourcePolicy resourcePolicy = CreateTestPolicy("ttd", targetRepository, null);

            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/policy/ttdres1";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, dataPathWithData);

            httpRequestMessage.Content = new StringContent(JsonConvert.SerializeObject(resourcePolicy), Encoding.UTF8, "application/json");

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.EnsureSuccessStatusCode();
            string responseBody = await response.Content.ReadAsStringAsync();

            try
            {
                Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
            }
        }

        [Fact]
        public async Task Create_ResourcePolicyOk()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await TestDataHelper.CopyRepositoryForTest("ttd", "ttd-resources", "testUser", targetRepository);

            ResourcePolicy resourcePolicy = CreateTestPolicy("ttd", targetRepository, "ttdres2");

            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/policy/ttdres2";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, dataPathWithData);

            httpRequestMessage.Content = new StringContent(JsonConvert.SerializeObject(resourcePolicy), Encoding.UTF8, "application/json");

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.EnsureSuccessStatusCode();
            string responseBody = await response.Content.ReadAsStringAsync();

            try
            {
                Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
            }
        }


        [Fact]
        public async Task GetApp_AppPolicyOk()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await TestDataHelper.CopyRepositoryForTest("ttd", "apps-test", "testUser", targetRepository);


            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/policy";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);
            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.EnsureSuccessStatusCode();
            string responseBody = await response.Content.ReadAsStringAsync();
            ResourcePolicy resourcePolicy = System.Text.Json.JsonSerializer.Deserialize<ResourcePolicy>(responseBody, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            try
            {
                Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
                Assert.NotNull(resourcePolicy.Rules);
                Assert.Equal(6, resourcePolicy.Rules.Count);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
            }
        }

        [Fact]
        public async Task Get_ResourcePolicyOk()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await TestDataHelper.CopyRepositoryForTest("ttd", "ttd-resources", "testUser", targetRepository);


            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/policy/ttdres1";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);
            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.EnsureSuccessStatusCode();
            string responseBody = await response.Content.ReadAsStringAsync();
            ResourcePolicy resourcePolicy = System.Text.Json.JsonSerializer.Deserialize<ResourcePolicy>(responseBody, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            try
            {
                Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
                Assert.NotNull(resourcePolicy.Rules);
                Assert.Single(resourcePolicy.Rules);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
            }
        }


        [Fact]
        public async Task Validate_AppPolicyOk()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await TestDataHelper.CopyRepositoryForTest("ttd", "apps-test", "testUser", targetRepository);


            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/policy/validate";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);
            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.EnsureSuccessStatusCode();
            string responseBody = await response.Content.ReadAsStringAsync();
            ValidationProblemDetails validationDetails = System.Text.Json.JsonSerializer.Deserialize<ValidationProblemDetails>(responseBody, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            try
            {
                Assert.Equal(StatusCodes.Status200OK, (int)validationDetails.Status);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
            }
        }

        [Fact]
        public async Task Validate_ResourcePolicyOk()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await TestDataHelper.CopyRepositoryForTest("ttd", "ttd-resources", "testUser", targetRepository);


            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/policy/validate/ttdres1";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);
            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.EnsureSuccessStatusCode();
            string responseBody = await response.Content.ReadAsStringAsync();
            ValidationProblemDetails validationDetails = System.Text.Json.JsonSerializer.Deserialize<ValidationProblemDetails>(responseBody, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            try
            {
                Assert.Equal(StatusCodes.Status200OK, (int)validationDetails.Status);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
            }
        }


        [Fact]
        public async Task Validate_AppPolicyMissingSubject()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await TestDataHelper.CopyRepositoryForTest("ttd", "apps-test", "testUser", targetRepository);

            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/policy";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);
            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.EnsureSuccessStatusCode();
            string responseBody = await response.Content.ReadAsStringAsync();
            ResourcePolicy resourcePolicy = System.Text.Json.JsonSerializer.Deserialize<ResourcePolicy>(responseBody, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

            // Add empty illegal rule
            resourcePolicy.Rules.Add(new PolicyRule() { RuleId = "xys" });

            string dataPathWithData2 = $"{_versionPrefix}/ttd/{targetRepository}/policy";
            HttpRequestMessage httpRequestMessage2 = new HttpRequestMessage(HttpMethod.Put, dataPathWithData2);

            httpRequestMessage2.Content = new StringContent(JsonConvert.SerializeObject(resourcePolicy), Encoding.UTF8, "application/json");

            HttpResponseMessage response2 = await HttpClient.Value.SendAsync(httpRequestMessage2);
            response2.EnsureSuccessStatusCode();
            string responseBody2 = await response2.Content.ReadAsStringAsync();


            string dataPathWithData3 = $"{_versionPrefix}/ttd/{targetRepository}/policy/validate";
            HttpRequestMessage httpRequestMessage3 = new HttpRequestMessage(HttpMethod.Get, dataPathWithData3);
            HttpResponseMessage response3 = await HttpClient.Value.SendAsync(httpRequestMessage3);
            response.EnsureSuccessStatusCode();
            string responseBody3 = await response3.Content.ReadAsStringAsync();
            ValidationProblemDetails validationDetails = System.Text.Json.JsonSerializer.Deserialize<ValidationProblemDetails>(responseBody3, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            try
            {
                Assert.Equal(StatusCodes.Status400BadRequest, (int)validationDetails.Status);
                Assert.Equal(1, validationDetails.Errors.Count);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
            }
        }



        [Fact]
        public async Task Validate_ResourcePolicyMissingSubject()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await TestDataHelper.CopyRepositoryForTest("ttd", "ttd-resources", "testUser", targetRepository);

            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/policy/ttdres1";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);
            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.EnsureSuccessStatusCode();
            string responseBody = await response.Content.ReadAsStringAsync();
            ResourcePolicy resourcePolicy = System.Text.Json.JsonSerializer.Deserialize<ResourcePolicy>(responseBody, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

            // Add empty illegal rule
            resourcePolicy.Rules.Add(new PolicyRule() { RuleId = "xys" });

            string dataPathWithData2 = $"{_versionPrefix}/ttd/{targetRepository}/policy/ttdres1";
            HttpRequestMessage httpRequestMessage2 = new HttpRequestMessage(HttpMethod.Put, dataPathWithData2);

            httpRequestMessage2.Content = new StringContent(JsonConvert.SerializeObject(resourcePolicy), Encoding.UTF8, "application/json");

            HttpResponseMessage response2 = await HttpClient.Value.SendAsync(httpRequestMessage2);
            response2.EnsureSuccessStatusCode();
            string responseBody2 = await response2.Content.ReadAsStringAsync();


            string dataPathWithData3 = $"{_versionPrefix}/ttd/{targetRepository}/policy/validate/ttdres1";
            HttpRequestMessage httpRequestMessage3 = new HttpRequestMessage(HttpMethod.Get, dataPathWithData3);
            HttpResponseMessage response3 = await HttpClient.Value.SendAsync(httpRequestMessage3);
            response.EnsureSuccessStatusCode();
            string responseBody3 = await response3.Content.ReadAsStringAsync();
            ValidationProblemDetails validationDetails = System.Text.Json.JsonSerializer.Deserialize<ValidationProblemDetails>(responseBody3, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            try
            {
                Assert.Equal(StatusCodes.Status400BadRequest, (int)validationDetails.Status);
                Assert.Equal(1, validationDetails.Errors.Count);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
            }
        }



        private ResourcePolicy CreateTestPolicy(string org, string app, string resourceid = null)
        {
            ResourcePolicy policy = new ResourcePolicy();

            policy.Rules = new List<PolicyRule>();

            PolicyRule rule1 = new PolicyRule();
            rule1.RuleId = "Policy1";
            rule1.Resources = new List<List<string>>();

            List<string> resourceSet1 = new List<string>();
            if (resourceid == null)
            {
                resourceSet1.Add(AltinnXacmlConstants.MatchAttributeIdentifiers.OrgAttribute + ":" + org);
                resourceSet1.Add(AltinnXacmlConstants.MatchAttributeIdentifiers.AppAttribute + ":" + app);
            }
            else
            {
                resourceSet1.Add(AltinnXacmlConstants.MatchAttributeIdentifiers.ResourceRegistryResource + ":" + resourceid);
            }

            rule1.Resources.Add(resourceSet1);

            rule1.Actions = new List<string>();
            rule1.Actions.Add("write");
            rule1.Actions.Add("read");
            rule1.Actions.Add("sign");

            policy.Rules.Add(rule1);

            return policy;
        }


        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGitea, IGiteaMock>();
        }



    }
}
