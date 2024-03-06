using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class ProcessTests : PreviewControllerTestsBase<ProcessTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public ProcessTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_Process_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/instances/{PartyId}/{InstanceGuId}/process";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={App}&selectedLayoutSet=");

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            ProcessState processState = JsonSerializer.Deserialize<ProcessState>(responseBody, JsonSerializerOptions);
            Assert.Equal("data", processState.CurrentTask.AltinnTaskType);
            Assert.Equal("Task_1", processState.CurrentTask.ElementId);
        }

        [Fact]
        public async Task Get_ProcessForStatefulApp_Ok()
        {
            string dataPathWithData = $"{Org}/{StatefulApp}/instances/{PartyId}/{InstanceGuId}/process";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={StatefulApp}&selectedLayoutSet={LayoutSetName}");

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            AppProcessState processState =
                JsonSerializer.Deserialize<AppProcessState>(responseBody, JsonSerializerOptions);
            var expectedProcessTasks = new List<AppProcessTaskTypeInfo>
            {
                new AppProcessTaskTypeInfo
                {
                    ElementId = "Task_1",
                    AltinnTaskType = "data"
                },
                new AppProcessTaskTypeInfo
                {
                    ElementId = "Task_2",
                    AltinnTaskType = "data"
                },
                new AppProcessTaskTypeInfo
                {
                    ElementId = "Task_3",
                    AltinnTaskType = "data"
                }
            };
            Assert.Equal("data", processState.CurrentTask.AltinnTaskType);
            Assert.Equal("Task_1", processState.CurrentTask.ElementId);
            expectedProcessTasks.Should().BeEquivalentTo(processState.ProcessTasks);
        }
    }
}
