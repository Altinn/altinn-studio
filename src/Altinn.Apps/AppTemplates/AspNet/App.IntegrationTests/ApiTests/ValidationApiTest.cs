using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

using Altinn.App.IntegrationTests;
using Altinn.App.Services.Models.Validation;
using App.IntegrationTests.Utils;

using Newtonsoft.Json;
using Xunit;

namespace App.IntegrationTestsRef.ApiTests
{
    public class ValidationApiTest : IClassFixture<CustomWebApplicationFactory<Altinn.App.Startup>>
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
            TestDataUtil.DeleteInstance("tdd", "custom-validation", 1337, new System.Guid("0fc98a23-fe31-4ef5-8fb9-dd3f479354cd"));
            TestDataUtil.PrepareInstance("tdd", "custom-validation", 1337, new System.Guid("0fc98a23-fe31-4ef5-8fb9-dd3f479354cd"));
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "custom-validation");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/custom-validation/instances/1337/0fc98a23-fe31-4ef5-8fb9-dd3f479354cd/validate");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();
            TestDataUtil.DeleteInstance("tdd", "custom-validation", 1337, new System.Guid("0fc98a23-fe31-4ef5-8fb9-dd3f479354cd"));
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
            TestDataUtil.DeleteInstance("tdd", "custom-validation", 1337, new System.Guid("16314483-65f3-495a-aaec-79445b4edb0b"));
            TestDataUtil.PrepareInstance("tdd", "custom-validation", 1337, new System.Guid("16314483-65f3-495a-aaec-79445b4edb0b"));

            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "custom-validation");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/custom-validation/instances/1337/16314483-65f3-495a-aaec-79445b4edb0b/validate");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();
            TestDataUtil.DeleteInstance("tdd", "custom-validation", 1337, new System.Guid("16314483-65f3-495a-aaec-79445b4edb0b"));

            List<ValidationIssue> messages = (List<ValidationIssue>)JsonConvert.DeserializeObject(responseContent, typeof(List<ValidationIssue>));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Empty(messages);
        }

        /// <summary>
        /// Test that verifies that custom validation allows valid data.
        /// </summary>
        /// <returns></returns>
        [Fact]
        public async Task ValidateForm_SingleField_FixedData()
        {
            TestDataUtil.DeleteInstance("tdd", "custom-validation", 1337, new System.Guid("16314483-65f3-495a-aaec-79445b4edb0b"));
            TestDataUtil.PrepareInstance("tdd", "custom-validation", 1337, new System.Guid("16314483-65f3-495a-aaec-79445b4edb0b"));

            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "custom-validation");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            client.DefaultRequestHeaders.Add("ValidationTriggerField", "opplysningerOmArbeidstakerengrp8819.skjemainstansgrp8854.journalnummerdatadef33316.value");
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/custom-validation/instances/1337/16314483-65f3-495a-aaec-79445b4edb0b/validate");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();
            TestDataUtil.DeleteInstance("tdd", "custom-validation", 1337, new System.Guid("16314483-65f3-495a-aaec-79445b4edb0b"));

            List<ValidationIssue> messages = (List<ValidationIssue>)JsonConvert.DeserializeObject(responseContent, typeof(List<ValidationIssue>));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Single(messages);
            Assert.Equal(ValidationIssueSeverity.Fixed, messages[0].Severity);
            Assert.Equal("Value cannot be 1234", messages[0].Code);
        }

        /// <summary>
        /// Test that verifies that custom validation allows valid data.
        /// </summary>
        /// <returns></returns>
        [Fact]
        public async Task ValidateForm_ModelValidation_InvalidData()
        {
            TestDataUtil.DeleteInstance("tdd", "custom-validation", 1337, new System.Guid("46133fb5-a9f2-45d4-90b1-f6d93ad40713"));
            TestDataUtil.PrepareInstance("tdd", "custom-validation", 1337, new System.Guid("46133fb5-a9f2-45d4-90b1-f6d93ad40713"));

            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "custom-validation");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/custom-validation/instances/1337/46133fb5-a9f2-45d4-90b1-f6d93ad40713/validate");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();
            TestDataUtil.DeleteInstance("tdd", "custom-validation", 1337, new System.Guid("46133fb5-a9f2-45d4-90b1-f6d93ad40713"));

            List<ValidationIssue> messages = (List<ValidationIssue>)JsonConvert.DeserializeObject(responseContent, typeof(List<ValidationIssue>));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Single(messages);
            Assert.Equal(ValidationIssueSeverity.Error, messages[0].Severity);
            Assert.Equal("ERROR: Max length is 11", messages[0].Code);
        }

        /// <summary>
        /// Test that verifies that custom validation allows valid data.
        /// </summary>
        /// <returns></returns>
        [Fact]
        public async Task ValidateAttachment_ValidData()
        {
            TestDataUtil.DeleteInstance("tdd", "custom-validation", 1337, new System.Guid("16314483-65f3-495a-aaec-79445b4edb0b"));
            TestDataUtil.PrepareInstance("tdd", "custom-validation", 1337, new System.Guid("16314483-65f3-495a-aaec-79445b4edb0b"));

            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "custom-validation");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            string url = "/tdd/custom-validation/instances/1337/16314483-65f3-495a-aaec-79445b4edb0b/data/b862f944-3f04-45e3-b445-6bbd09f65ad5/validate";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();
            TestDataUtil.DeleteInstance("tdd", "custom-validation", 1337, new System.Guid("16314483-65f3-495a-aaec-79445b4edb0b"));

            List<ValidationIssue> messages = (List<ValidationIssue>)JsonConvert.DeserializeObject(responseContent, typeof(List<ValidationIssue>));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Empty(messages);
        }

        /// <summary>
        /// Test that verifies that task validation stops moving forward if send in is not open
        /// </summary>
        /// <returns></returns>
        [Fact]
        public async Task ValidateTask_InvalidTime()
        {
            // Arrange
            TestDataUtil.DeleteInstanceAndData("tdd", "task-validation", 1337, new System.Guid("16314483-65f3-495a-aaec-79445b4edb0b"));
            TestDataUtil.PrepareInstance("tdd", "task-validation", 1337, new System.Guid("16314483-65f3-495a-aaec-79445b4edb0b"));
            string token = PrincipalUtil.GetToken(1337);
            string expectedMsg = "Task 1 should have been completed within 48 hours. Send in is no longer available.";

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "task-validation");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            string url = "/tdd/task-validation/instances/1337/16314483-65f3-495a-aaec-79445b4edb0b/validate";

            // Act
            HttpResponseMessage response = await client.GetAsync(url);
            string responseContent = await response.Content.ReadAsStringAsync();
            TestDataUtil.DeleteInstanceAndData("tdd", "task-validation", 1337, new System.Guid("16314483-65f3-495a-aaec-79445b4edb0b"));

            List<ValidationIssue> messages = (List<ValidationIssue>)JsonConvert.DeserializeObject(responseContent, typeof(List<ValidationIssue>));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Single(messages);
            Assert.Equal(ValidationIssueSeverity.Error, messages[0].Severity);
            Assert.Equal(expectedMsg, messages[0].Code);
        }
    }
}
