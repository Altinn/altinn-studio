using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Altinn.App.Api.Models;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Api.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Altinn.App.Api.Tests.Controllers;

public class ProcessControllerTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    public ProcessControllerTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Fact]
    public async Task Get_ShouldReturnProcessTasks()
    {
        string org = "tdd";
        string app = "contributer-restriction";
        int partyId = 500000;
        Guid instanceId = new Guid("5d9e906b-83ed-44df-85a7-2f104c640bff");
        HttpClient client = GetRootedClient(org, app);

        TestData.DeleteInstance(org, app, partyId, instanceId);
        TestData.PrepareInstance(org, app, partyId, instanceId);

        string token = PrincipalUtil.GetToken(1337, 500000, 3);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        string url = $"/{org}/{app}/instances/{partyId}/{instanceId}/process";
        HttpResponseMessage response = await client.GetAsync(url);
        TestData.DeleteInstance(org, app, partyId, instanceId);
            
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        var expectedString = """
                             {
                               "currentTask": {
                                 "actions": {
                                   "read": true,
                                   "write": true
                                 },
                                 "userActions": [
                                   {
                                     "id": "read",
                                     "authorized": true,
                                     "type": "ProcessAction"
                                   },
                                   {
                                     "id": "write",
                                     "authorized": true,
                                     "type": "ProcessAction"
                                   }
                                 ],
                                 "read": true,
                                 "write": true,
                                 "flow": 2,
                                 "started": "2019-12-05T13:24:34.9196661Z",
                                 "elementId": "Task_1",
                                 "name": "Utfylling",
                                 "altinnTaskType": "data",
                                 "ended": null,
                                 "validated": {
                                   "timestamp": "2020-02-07T10:46:36.985894+01:00",
                                   "canCompleteTask": false
                                 },
                                 "flowType": null
                               },
                               "processTasks": [
                                 {
                                   "altinnTaskType": "data",
                                   "elementId": "Task_1"
                                 }
                               ],
                               "started": "2019-12-05T13:24:34.8412179Z",
                               "startEvent": "StartEvent_1",
                               "ended": null,
                               "endEvent": null
                             }
                             """;
        CompareResult<AppProcessState>(expectedString, content);
    }
    
    
    //TODO: replace this assertion with a proper one once fluentassertions has a json compare feature scheduled for v7 https://github.com/fluentassertions/fluentassertions/issues/2205
    private static void CompareResult<T>(string expectedString, string actualString)
    {
        T? expected = JsonSerializer.Deserialize<T>(expectedString);
        T? actual = JsonSerializer.Deserialize<T>(actualString);
        actual.Should().BeEquivalentTo(expected);
    }
}