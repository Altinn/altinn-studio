using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;

using Altinn.App;
using Altinn.App.IntegrationTests;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Utils;
using App.IntegrationTestsRef.Utils;

using Newtonsoft.Json;
using Xunit;

namespace App.IntegrationTestsRef.EndToEndTests
{
    public class EndToEndTest : IClassFixture<CustomWebApplicationFactory<Startup>>
    {

        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;
        private readonly string org = "tdd";
        private readonly string app = "complex-process";
        private readonly int instanceOwnerId = 1000;

        public EndToEndTest(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async void ComplexProcessApp()
        {

            // Arrange
            string instanceGuid = string.Empty;
            string dataGuid;
            try
            {
                string token = PrincipalUtil.GetToken(1);
                HttpClient client = SetupUtil.GetTestClient(_factory, org, app);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                #region Start Process
                // Arrange
                Instance template = new Instance
                {
                    InstanceOwner = new InstanceOwner { PartyId = instanceOwnerId.ToString() }
                };
                string expectedCurrentTaskName = "Task_1";

                // Act
                string url = $"/{org}/{app}/instances/";

                HttpResponseMessage response = await client.PostAsync(url, new StringContent(template.ToString(), Encoding.UTF8, "application/json"));
                response.EnsureSuccessStatusCode();

                Instance createdInstance = JsonConvert.DeserializeObject<Instance>(await response.Content.ReadAsStringAsync());
                instanceGuid = createdInstance.Id.Split('/')[1];
                dataGuid = createdInstance.Data.Where(d => d.DataType.Equals("default")).Select(d => d.Id).First();

                // Assert
                Assert.Equal(expectedCurrentTaskName, createdInstance.Process.CurrentTask.ElementId);
                #endregion

                #region Upload invalid attachment type
                // Act
                url = $"/{org}/{app}/instances/{instanceOwnerId}/{instanceGuid}/data?dataType=invalidDataType";
                response = await client.PostAsync(url, null);

                // Assert
                Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
                #endregion

                #region Move process to next step
                // Arrange
                string expectedNextTask = "Task_2";
                url = $"/{org}/{app}/instances/{instanceOwnerId}/{instanceGuid}/process/next";

                // Act
                response = await client.GetAsync(url);

                List<string> nextTasks = JsonConvert.DeserializeObject<List<string>>(await response.Content.ReadAsStringAsync());
                string actualNextTask = nextTasks[0];

                // Assert
                Assert.Equal(expectedNextTask, actualNextTask);

                // Act
                response = await client.PutAsync(url, null);

                // Assert
                response.EnsureSuccessStatusCode();
                #endregion

                #region Upload form data during Task_2
                // Arrange
                url = $"/{org}/{app}/instances/{instanceOwnerId}/{instanceGuid}/data/{dataGuid}";

                // Act
                response = await client.PutAsync(url, null);

                // Assert: Upload for data during step 2
                Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
                #endregion

                #region Complete process
                //Arrange
                url = $"/{org}/{app}/instances/{instanceOwnerId}/{instanceGuid}/process/completeProcess";

               // Act
                response = await client.PutAsync(url, null);
                ProcessState endProcess = JsonConvert.DeserializeObject<ProcessState>(await response.Content.ReadAsStringAsync());

                // Assert
                response.EnsureSuccessStatusCode();
                #endregion
            }
            finally
            {
                // Cleanup
                TestDataUtil.DeletInstanceAndData("tdd", "complex-process", 1000, new Guid(instanceGuid));
            }
        }
    }
}
