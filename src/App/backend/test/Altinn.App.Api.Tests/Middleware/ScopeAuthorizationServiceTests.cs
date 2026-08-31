using System.Reflection;
using Altinn.App.Api.Infrastructure.Middleware;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Cache;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Routing.Patterns;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using Moq;

namespace Altinn.App.Api.Tests.Middleware;

public class ScopeAuthorizationServiceTests
{
    [Fact]
    public async Task EnsureInitialized_WhenNoCustomScopesAndMvcInertEndpoint_DoesNotThrow()
    {
        var routeActionDescriptor = CreateControllerActionDescriptor();
        var inertActionDescriptor = CreateControllerActionDescriptor();
        var routeEndpoint = CreateRouteEndpoint(
            "/instances/{instanceOwnerPartyId}/{instanceGuid}",
            routeActionDescriptor,
            "GET"
        );
        var inertEndpoint = CreateMvcInertEndpoint(inertActionDescriptor, "GET");
        var service = CreateService(new ApplicationMetadata("ttd/app"), inertEndpoint, routeEndpoint);

        await service.EnsureInitialized();

        Assert.False(service.HasDefinedCustomScopes);
        Assert.Single(service.Metadata);
    }

    [Fact]
    public async Task EnsureInitialized_WhenCustomScopesAndMvcInertEndpoint_SkipsInertEndpoint()
    {
        var appMetadata = new ApplicationMetadata("ttd/app")
        {
            ApiScopes = new ApiScopesConfiguration
            {
                Users = new ApiScopes { Read = "ttd:[app]/instances.read", Write = "ttd:[app]/instances.write" },
            },
        };
        var routeActionDescriptor = CreateControllerActionDescriptor();
        var inertActionDescriptor = CreateControllerActionDescriptor();
        var routeEndpoint = CreateRouteEndpoint(
            "/instances/{instanceOwnerPartyId}/{instanceGuid}",
            routeActionDescriptor,
            "GET"
        );
        var inertEndpoint = CreateMvcInertEndpoint(inertActionDescriptor, "GET");
        var service = CreateService(appMetadata, inertEndpoint, routeEndpoint);

        await service.EnsureInitialized();

        Assert.True(service.HasDefinedCustomScopes);
        var endpointInfo = Assert.Single(service.Metadata);
        Assert.Equal("GET /instances/{instanceOwnerPartyId}/{instanceGuid}", endpointInfo.Endpoint);
        Assert.NotNull(endpointInfo.Metadata.RequiredScopesUsers);
        Assert.Contains("ttd:app/instances.read", endpointInfo.Metadata.RequiredScopesUsers.AsEnumerable());
    }

    [Fact]
    public async Task EnsureInitialized_WhenUnexpectedNonRouteEndpoint_Throws()
    {
        var service = CreateService(new ApplicationMetadata("ttd/app"), CreateNonRouteEndpoint());

        var exception = await Assert.ThrowsAsync<Exception>(() => service.EnsureInitialized());

        Assert.Contains("Unexpected endpoint type: Microsoft.AspNetCore.Http.Endpoint", exception.Message);
    }

    private static ScopeAuthorizationService CreateService(ApplicationMetadata appMetadata, params Endpoint[] endpoints)
    {
        return new ScopeAuthorizationService(
            new TestAppConfigurationCache(appMetadata),
            [new TestEndpointDataSource(endpoints)],
            Mock.Of<IHostApplicationLifetime>(),
            Options.Create(new GeneralSettings()),
            NullLogger<ScopeAuthorizationService>.Instance
        );
    }

    private static Endpoint CreateNonRouteEndpoint() =>
        new(_ => Task.CompletedTask, EndpointMetadataCollection.Empty, "Non-route endpoint");

    private static Endpoint CreateMvcInertEndpoint(
        ControllerActionDescriptor actionDescriptor,
        params string[] methods
    ) =>
        new(
            _ => Task.CompletedTask,
            new EndpointMetadataCollection(new HttpMethodMetadata(methods), actionDescriptor),
            actionDescriptor.DisplayName
        );

    private static RouteEndpoint CreateRouteEndpoint(
        string route,
        ControllerActionDescriptor actionDescriptor,
        params string[] methods
    )
    {
        var builder = new RouteEndpointBuilder(_ => Task.CompletedTask, RoutePatternFactory.Parse(route), order: 0);
        builder.Metadata.Add(new HttpMethodMetadata(methods));
        builder.Metadata.Add(actionDescriptor);
        return (RouteEndpoint)builder.Build();
    }

    private static ControllerActionDescriptor CreateControllerActionDescriptor()
    {
        var httpMethodMetadata = new HttpMethodMetadata(["GET"]);
        return new ControllerActionDescriptor
        {
            DisplayName = "TestController.Get (Test)",
            ActionName = "Get",
            ControllerName = "Test",
            ControllerTypeInfo = typeof(ScopeAuthorizationServiceTests).GetTypeInfo(),
            MethodInfo = typeof(ScopeAuthorizationServiceTests).GetMethod(
                nameof(TestControllerAction),
                BindingFlags.NonPublic | BindingFlags.Static
            )!,
            EndpointMetadata = [httpMethodMetadata],
        };
    }

    private static void TestControllerAction() { }

    private sealed class TestAppConfigurationCache(ApplicationMetadata appMetadata) : IAppConfigurationCache
    {
        public ApplicationMetadata ApplicationMetadata { get; } = appMetadata;
    }

    private sealed class TestEndpointDataSource(IReadOnlyList<Endpoint> endpoints) : EndpointDataSource
    {
        public override IReadOnlyList<Endpoint> Endpoints { get; } = endpoints;

        public override IChangeToken GetChangeToken() => new CancellationChangeToken(CancellationToken.None);
    }
}
