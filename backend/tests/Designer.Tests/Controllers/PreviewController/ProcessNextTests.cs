﻿using System;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Newtonsoft.Json;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class ProcessNextTests : PreviewControllerTestsBase<ProcessNextTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public ProcessNextTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_ProcessNext_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/instances/{PartyId}/{InstanceGuId}/process/next";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={App}&selectedLayoutSetInEditor=");

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            ProcessState processState = JsonConvert.DeserializeObject<ProcessState>(responseDocument.RootElement.ToString());
            Assert.Equal("data", processState.CurrentTask.AltinnTaskType);
            Assert.Equal("Task_1", processState.CurrentTask.ElementId);
        }

        [Fact]
        public async Task Get_ProcessNextForStatefulApp_Ok()
        {
            string dataPathWithData = $"{Org}/{StatefulApp}/instances/{PartyId}/{InstanceGuId}/process/next";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={StatefulApp}&selectedLayoutSetInEditor={LayoutSetName}");

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            ProcessState processState = JsonConvert.DeserializeObject<ProcessState>(responseDocument.RootElement.ToString());
            Assert.Equal("data", processState.CurrentTask.AltinnTaskType);
            Assert.Equal("Task_1", processState.CurrentTask.ElementId);
        }
    }
}
