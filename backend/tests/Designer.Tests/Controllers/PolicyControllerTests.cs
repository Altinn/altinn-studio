using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Platform.Authorization.Constants;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Models.Authorization;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.ViewModels.Response;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Newtonsoft.Json;
using Npgsql.EntityFrameworkCore.PostgreSQL.Query.Expressions.Internal;
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
        public async Task GetApp_AppPolicyOk()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await TestDataHelper.CopyRepositoryForTest("ttd", "apps-test", "testUser", targetRepository);


            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/policy";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);
            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.EnsureSuccessStatusCode();
            string responseBody = await response.Content.ReadAsStringAsync();
            ResourcePolicy resourcePolicy = System.Text.Json.JsonSerializer.Deserialize<ResourcePolicy>(responseBody, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase});
            try
            {
                Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
                Assert.NotNull(resourcePolicy.Rules);
                Assert.Equal(6, resourcePolicy.Rules.Count());
            }
            finally
            {
                TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
            }
        }



        private ResourcePolicy CreateTestPolicy(string org, string app)
        {
            ResourcePolicy policy = new ResourcePolicy();

            policy.Rules = new List<PolicyRule>();

            PolicyRule rule1 = new PolicyRule();
            rule1.RuleId = "Policy1";
            rule1.Resources = new List<List<string>>();

            List<string> resourceSet1 = new List<string>();
            resourceSet1.Add(AltinnXacmlConstants.MatchAttributeIdentifiers.OrgAttribute + ":" + org);
            resourceSet1.Add(AltinnXacmlConstants.MatchAttributeIdentifiers.AppAttribute + ":" + app);
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
