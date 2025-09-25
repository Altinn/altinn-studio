using System.Net;
using System.Text;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Core.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class EventsReceiverControllerTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private readonly IEventSecretCodeProvider _secretCodeProvider;

    public EventsReceiverControllerTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper)
    {
        _secretCodeProvider = factory.Services.GetRequiredService<IEventSecretCodeProvider>();
    }

    [Fact]
    public async Task Post_ValidEventType_ShouldReturnOk()
    {
        var org = "tdd";
        var app = "contributer-restriction";

        using var client = GetRootedUserClient(org, app, 1338);
        CloudEvent cloudEvent = new()
        {
            Id = Guid.NewGuid().ToString(),
            Source = new Uri(
                "https://dihe.apps.altinn3local.no/dihe/redusert-foreldrebetaling-bhg/instances/510002/553a3ddc-4ca4-40af-9c2a-1e33e659c7e7"
            ),
            SpecVersion = "1.0",
            Type = "app.event.dummy.success",
            Subject = "/party/510002",
            Time = DateTime.Parse("2022-10-13T09:33:46.6330634Z"),
            AlternativeSubject = "/person/17858296439",
        };

        string requestUrl = $"{org}/{app}/api/v1/eventsreceiver?code={await _secretCodeProvider.GetSecretCode()}";
        HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, requestUrl)
        {
            Content = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(cloudEvent),
                Encoding.UTF8,
                "application/json"
            ),
        };

        HttpResponseMessage response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Post_NonValidEventType_ShouldReturnBadRequest()
    {
        var org = "tdd";
        var app = "contributer-restriction";

        using var client = GetRootedUserClient(org, app, userId: 1338);
        CloudEvent cloudEvent = new()
        {
            Id = Guid.NewGuid().ToString(),
            Source = new Uri(
                "https://dihe.apps.altinn3local.no/dihe/redusert-foreldrebetaling-bhg/instances/510002/553a3ddc-4ca4-40af-9c2a-1e33e659c7e7"
            ),
            SpecVersion = "1.0",
            Type = "no.event.handler.registered.for.this.type",
            Subject = "/party/510002",
            Time = DateTime.Parse("2022-10-13T09:33:46.6330634Z"),
            AlternativeSubject = "/person/17858296439",
        };

        string requestUrl = $"{org}/{app}/api/v1/eventsreceiver?code={await _secretCodeProvider.GetSecretCode()}";
        HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, requestUrl)
        {
            Content = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(cloudEvent),
                Encoding.UTF8,
                "application/json"
            ),
        };

        HttpResponseMessage response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
