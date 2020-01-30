using Altinn.App.IntegrationTests;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Utils;
using App.IntegrationTestsRef.Utils;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace App.IntegrationTestsRef.ApiTests
{
    public class ValidationApiTest: IClassFixture<CustomWebApplicationFactory<Altinn.App.Startup>>
    {
        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public ValidationApiTest(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        /// <summary>
        /// Test that verifies that custom validation identifies invalid data
        /// </summary>
        /// <returns></returns>
        [Fact]
        public async Task ValidateForm_CustomValidation_InvalidData()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "custom-validation");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/custom-validation/instances/1000/0fc98a23-fe31-4ef5-8fb9-dd3f479354cd/validate");
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;
            System.Console.WriteLine("**** RESPONSE CONTENT: " + responseContent);
            System.Console.WriteLine("**** RESPONSE STATUD CODE: " + response.StatusCode);
            List<ValidationIssue> messages = (List<ValidationIssue>)JsonConvert.DeserializeObject(responseContent, typeof(List<ValidationIssue>));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Single(messages);
            Assert.Equal(ValidationIssueSeverity.Error, messages[0].Severity);
            Assert.Equal("Value cannot be 1234", messages[0].Code);
        }

        /// <summary>
        /// Test that verifies that custom validation allows valid data.
        /// </summary>
        /// <returns></returns>
        [Fact]
        public async Task ValidateForm_ValidData()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "custom-validation");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/custom-validation/instances/1000/16314483-65f3-495a-aaec-79445b4edb0b/validate");
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            List<ValidationIssue> messages = (List<ValidationIssue>)JsonConvert.DeserializeObject(responseContent, typeof(List<ValidationIssue>));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Empty(messages);
        }

        /// <summary>
        /// Test that verifies that custom validation allows valid data.
        /// </summary>
        /// <returns></returns>
        [Fact]
        public async Task ValidateForm_ModelValidation_InvalidData()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "custom-validation");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/custom-validation/instances/1000/46133fb5-a9f2-45d4-90b1-f6d93ad40713/validate");
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            List<ValidationIssue> messages = (List<ValidationIssue>)JsonConvert.DeserializeObject(responseContent, typeof(List<ValidationIssue>));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Single(messages);
            Assert.Equal(ValidationIssueSeverity.Error, messages[0].Severity);
            Assert.Equal("ERROR: Max length is 11", messages[0].Code);
        }
    }
}
