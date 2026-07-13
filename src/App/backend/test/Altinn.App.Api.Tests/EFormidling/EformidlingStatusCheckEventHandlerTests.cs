using Altinn.App.Core.Configuration;
using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Common.EFormidlingClient;
using Altinn.Common.EFormidlingClient.Models;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Api.Tests.EFormidling;

public class EformidlingStatusCheckEventHandlerTests
{
    [Fact]
    public async Task ProcessEvent_WithJwkCreated_ShouldReturnFalse()
    {
        IEventHandler eventHandler = GetMockedEventHandler(false);
        CloudEvent cloudEvent = GetValidCloudEvent();

        bool processStatus = await eventHandler.ProcessEvent(cloudEvent);

        processStatus.Should().BeFalse();
    }

    [Fact]
    public async Task ProcessEvent_WithJwkDelivered_ShouldReturnTrue()
    {
        IEventHandler eventHandler = GetMockedEventHandler(true);
        CloudEvent cloudEvent = GetValidCloudEvent();

        bool processStatus = await eventHandler.ProcessEvent(cloudEvent);

        processStatus.Should().BeTrue();
    }

    private static CloudEvent GetValidCloudEvent()
    {
        return new()
        {
            Id = Guid.NewGuid().ToString(),
            Source = new Uri(
                "https://dihe.apps.altinn3local.no/dihe/redusert-foreldrebetaling-bhg/instances/510002/553a3ddc-4ca4-40af-9c2a-1e33e659c7e7"
            ),
            SpecVersion = "1.0",
            Type = "app.eformidling.reminder.checkinstancestatus",
            Subject = "/party/510002",
            Time = DateTime.Parse("2022-10-13T09:33:46.6330634Z"),
            AlternativeSubject = "/person/17858296439",
        };
    }

    private static IEventHandler GetMockedEventHandler(bool delivered)
    {
        var eFormidlingClientMock = new Mock<IEFormidlingClient>();
        Statuses statuses = GetStatues(delivered);
        eFormidlingClientMock
            .Setup(e => e.GetMessageStatusById(It.IsAny<string>(), It.IsAny<Dictionary<string, string>>()))
            .ReturnsAsync(statuses);

        // The process advance runs in-process via IProcessEngine (resolved from a scope); AddCompleteConfirmation
        // still calls Storage over HTTP, so the HttpClient mock returns OK for that.
        var httpClientMock = new Mock<HttpClient>();
        httpClientMock
            .Setup(s => s.SendAsync(It.IsAny<HttpRequestMessage>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HttpResponseMessage(System.Net.HttpStatusCode.OK));

        var httpClientFactoryMock = new Mock<IHttpClientFactory>();
        httpClientFactoryMock.Setup(s => s.CreateClient(It.IsAny<string>())).Returns(httpClientMock.Object);

        Mock<IAuthenticationTokenResolver> authenticationTokenResolverMock = new(MockBehavior.Strict);
        authenticationTokenResolverMock
            .Setup(a => a.GetAccessToken(It.IsAny<AuthenticationMethod.AltinnToken>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(JwtToken.Parse(TestAuthentication.GetOrgToken()));

        var instanceClientMock = new Mock<IInstanceClient>();
        instanceClientMock
            .Setup(c =>
                c.GetInstance(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new Instance());
        var processEngineMock = new Mock<IProcessEngine>();
        processEngineMock
            .Setup(e =>
                e.EnqueueProcessNext(
                    It.IsAny<Instance>(),
                    It.IsAny<Actor>(),
                    It.IsAny<string?>(),
                    // The redelivery guard: the advance only applies while the instance is still
                    // parked on the eFormidling service task.
                    "eFormidling",
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(Task.CompletedTask);

        var scopeFactory = new ServiceCollection()
            .AddSingleton(instanceClientMock.Object)
            .AddSingleton(processEngineMock.Object)
            .BuildServiceProvider()
            .GetRequiredService<IServiceScopeFactory>();

        return new EformidlingStatusCheckEventHandler2(
            eFormidlingClientMock.Object,
            httpClientFactoryMock.Object,
            NullLogger<EformidlingStatusCheckEventHandler2>.Instance,
            authenticationTokenResolverMock.Object,
            Options.Create(
                new PlatformSettings
                {
                    ApiEventsEndpoint = "http://localhost:5101/events/api/v1/",
                    SubscriptionKey = "key",
                }
            ),
            scopeFactory
        );
    }

    private static Statuses GetStatues(bool delivered)
    {
        Statuses statuses = new()
        {
            Content = new List<Content> { new() { Status = delivered ? "LEVERT" : "OPPRETTET" } },
        };

        return statuses;
    }
}
