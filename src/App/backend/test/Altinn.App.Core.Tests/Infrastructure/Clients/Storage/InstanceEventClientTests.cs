using System.Net;
using System.Net.Http.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Infrastructure.Clients.Storage;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Models;
using Altinn.App.PlatformServices.Tests.Mocks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using Newtonsoft.Json;

namespace Altinn.App.Core.Tests.Infrastructure.Clients.Storage;

public class InstanceEventClientTests
{
    private const string ValidJwtToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

    [Fact]
    public async Task SaveInstanceEvent_SendsExpectedStorageRequestWithoutRetiredLockHeader()
    {
        HttpRequestMessage? platformRequest = null;
        string? requestBody = null;
        Guid eventId = Guid.NewGuid();
        var handler = new DelegatingHandlerStub(
            async (request, _) =>
            {
                platformRequest = request;
                requestBody = await request.Content!.ReadAsStringAsync();
                return new HttpResponseMessage(HttpStatusCode.Created)
                {
                    Content = JsonContent.Create(new InstanceEvent { Id = eventId }),
                };
            }
        );
        var tokenResolver = new Mock<IAuthenticationTokenResolver>(MockBehavior.Strict);
        tokenResolver
            .Setup(resolver => resolver.GetAccessToken(It.IsAny<AuthenticationMethod>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(JwtToken.Parse(ValidJwtToken));

        var services = new ServiceCollection();
        services.AddSingleton(
            Options.Create(
                new PlatformSettings
                {
                    ApiStorageEndpoint = "https://local.platform.altinn.no/api/storage/",
                    SubscriptionKey = "test-subscription-key",
                }
            )
        );
        services.AddSingleton(tokenResolver.Object);
        await using ServiceProvider serviceProvider = services.BuildServiceProvider();
        using var httpClient = new HttpClient(handler);
        var client = new InstanceEventClient(httpClient, serviceProvider);
        string instanceId = $"{1337}/{Guid.NewGuid()}";
        var instanceEvent = new InstanceEvent
        {
            InstanceId = instanceId,
            InstanceOwnerPartyId = "1337",
            EventType = "process_EndTask",
            User = new PlatformUser { UserId = 42, AuthenticationLevel = 3 },
            AdditionalInfo = "task completed",
        };
        DateTime beforeSave = DateTime.UtcNow;

        string result = await client.SaveInstanceEvent(instanceEvent, "ttd", "test-app");

        DateTime afterSave = DateTime.UtcNow;
        Assert.Equal(eventId.ToString(), result);
        Assert.NotNull(platformRequest);
        Assert.Equal(HttpMethod.Post, platformRequest.Method);
        Assert.Equal(
            $"https://local.platform.altinn.no/api/storage/instances/{instanceId}/events",
            platformRequest.RequestUri!.ToString()
        );
        Assert.Equal("Bearer", platformRequest.Headers.Authorization!.Scheme);
        Assert.Equal(ValidJwtToken, platformRequest.Headers.Authorization.Parameter);
        Assert.Equal(
            "test-subscription-key",
            Assert.Single(platformRequest.Headers.GetValues(General.SubscriptionKeyHeaderName))
        );
        Assert.Equal("application/json", platformRequest.Content!.Headers.ContentType!.MediaType);
        Assert.NotNull(requestBody);
        InstanceEvent serializedEvent =
            JsonConvert.DeserializeObject<InstanceEvent>(requestBody)
            ?? throw new InvalidOperationException("Request body did not contain an instance event.");
        Assert.Equal(instanceId, serializedEvent.InstanceId);
        Assert.Equal("1337", serializedEvent.InstanceOwnerPartyId);
        Assert.Equal("process_EndTask", serializedEvent.EventType);
        Assert.Equal("task completed", serializedEvent.AdditionalInfo);
        Assert.Equal(42, serializedEvent.User.UserId);
        Assert.Equal(3, serializedEvent.User.AuthenticationLevel);
        Assert.NotNull(serializedEvent.Created);
        Assert.InRange(serializedEvent.Created.Value, beforeSave, afterSave);
        Assert.False(platformRequest.Headers.Contains("Altinn-Storage-Lock-Token"));
        tokenResolver.VerifyAll();
    }
}
