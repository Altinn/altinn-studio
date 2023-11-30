using Altinn.App.Api.Tests.Utils;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Core.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace Altinn.App.Api.Tests.Controllers
{
    public class EventsReceiverControllerTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;
        private readonly IEventSecretCodeProvider _secretCodeProvider;
        public EventsReceiverControllerTests(WebApplicationFactory<Program> factory)
        {
            _factory = factory;
            _secretCodeProvider = _factory.Services.GetRequiredService<IEventSecretCodeProvider>();
        }

        [Fact]
        public async Task Post_ValidEventType_ShouldReturnOk()
        {
            var client = _factory.CreateClient();
            string token = PrincipalUtil.GetToken(1337, null);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            CloudEvent cloudEvent = new()
            {
                Id = Guid.NewGuid().ToString(),
                Source = new Uri("https://dihe.apps.altinn3local.no/dihe/redusert-foreldrebetaling-bhg/instances/510002/553a3ddc-4ca4-40af-9c2a-1e33e659c7e7"),
                SpecVersion = "1.0",
                Type = "app.event.dummy.success",
                Subject = "/party/510002",
                Time = DateTime.Parse("2022-10-13T09:33:46.6330634Z"),
                AlternativeSubject = "/person/17858296439"
            };

            var org = "ttd";
            var app = "non-existing-app";
            string requestUrl = $"{org}/{app}/api/v1/eventsreceiver?code={await _secretCodeProvider.GetSecretCode()}";
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, requestUrl)
            {
                Content = new StringContent(System.Text.Json.JsonSerializer.Serialize(cloudEvent), Encoding.UTF8, "application/json")
            };

            HttpResponseMessage response = await client.SendAsync(request);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task Post_NonValidEventType_ShouldReturnBadRequest()
        {
            var client = _factory.CreateClient();
            string token = PrincipalUtil.GetToken(1337, null);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            CloudEvent cloudEvent = new()
            {
                Id = Guid.NewGuid().ToString(),
                Source = new Uri("https://dihe.apps.altinn3local.no/dihe/redusert-foreldrebetaling-bhg/instances/510002/553a3ddc-4ca4-40af-9c2a-1e33e659c7e7"),
                SpecVersion = "1.0",
                Type = "no.event.handler.registered.for.this.type",
                Subject = "/party/510002",
                Time = DateTime.Parse("2022-10-13T09:33:46.6330634Z"),
                AlternativeSubject = "/person/17858296439"
            };

            var org = "ttd";
            var app = "non-existing-app";
            string requestUrl = $"{org}/{app}/api/v1/eventsreceiver?code={await _secretCodeProvider.GetSecretCode()}";
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, requestUrl)
            {
                Content = new StringContent(System.Text.Json.JsonSerializer.Serialize(cloudEvent), Encoding.UTF8, "application/json")
            };
            
            HttpResponseMessage response = await client.SendAsync(request);
            
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }
}
