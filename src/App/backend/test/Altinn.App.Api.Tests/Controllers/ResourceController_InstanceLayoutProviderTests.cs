using System.Net;
using System.Text.Json;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Core.Features;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class ResourceController_InstanceLayoutProviderTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "tdd";
    private const string App = "contributer-restriction";
    private const int InstanceOwnerPartyId = 500600;
    private static readonly Guid _instanceGuid = Guid.Parse("cff1cb24-5bc1-4888-8e06-c634753c5144");

    public ResourceController_InstanceLayoutProviderTests(
        WebApplicationFactory<Program> factory,
        ITestOutputHelper outputHelper
    )
        : base(factory, outputHelper) { }

    private sealed class InstanceLayoutProvider(bool returnNull) : IInstanceLayoutProvider
    {
        public int Calls { get; private set; }

        public Task<string?> GetLayouts(InstanceLayoutContext context) => Describe(context);

        public Task<string?> GetLayoutSettings(InstanceLayoutContext context) => Describe(context);

        private Task<string?> Describe(InstanceLayoutContext context)
        {
            Calls++;
            return Task.FromResult(
                returnNull ? null : $"{context.LayoutSetId}:{context.InstanceDataAccessor.Instance.Id}"
            );
        }
    }

    private InstanceLayoutProvider RegisterProvider(bool returnNull = false)
    {
        var provider = new InstanceLayoutProvider(returnNull);
        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton<IInstanceLayoutProvider>(provider);
        };
        return provider;
    }

    private async Task<HttpResponseMessage> Get(HttpClient client, string resource, string instanceGuid)
    {
        TestData.PrepareInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
        return await client.GetAsync(
            $"/{Org}/{App}/instances/{InstanceOwnerPartyId}/{instanceGuid}/{resource}/default"
        );
    }

    private HttpClient GetUserClient() => GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);

    [Theory]
    [InlineData("layouts")]
    [InlineData("layoutsettings")]
    public async Task GetInstanceLayoutResources_WithProvider_ReturnsProviderResult(string resource)
    {
        var provider = RegisterProvider();
        using HttpClient client = GetUserClient();

        var response = await Get(client, resource, _instanceGuid.ToString());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal($"default:{InstanceOwnerPartyId}/{_instanceGuid}", await response.Content.ReadAsStringAsync());
        Assert.Equal(1, provider.Calls);
    }

    [Theory]
    [InlineData("layouts", true)]
    [InlineData("layoutsettings", true)]
    [InlineData("layouts", false)]
    [InlineData("layoutsettings", false)]
    public async Task GetInstanceLayoutResources_WithoutProviderResult_ReturnsAppResources(
        string resource,
        bool registerProvider
    )
    {
        if (registerProvider)
        {
            RegisterProvider(returnNull: true);
        }
        using HttpClient client = GetUserClient();

        var response = await Get(client, resource, _instanceGuid.ToString());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var jsonDoc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = jsonDoc.RootElement;
        Assert.Equal(JsonValueKind.Object, root.ValueKind);
        if (resource == "layouts")
        {
            Assert.True(root.TryGetProperty("page", out var pageLayout));
            Assert.True(pageLayout.TryGetProperty("data", out var data));
            Assert.True(data.TryGetProperty("layout", out var layout));
            Assert.Equal(JsonValueKind.Array, layout.ValueKind);
            Assert.True(layout.GetArrayLength() > 0);
        }
    }

    [Theory]
    [InlineData("layouts")]
    [InlineData("layoutsettings")]
    public async Task GetInstanceLayoutResources_Unauthenticated_ReturnsUnauthorized(string resource)
    {
        var provider = RegisterProvider();
        using HttpClient client = GetRootedClient(Org, App);

        var response = await Get(client, resource, _instanceGuid.ToString());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(0, provider.Calls);
    }

    [Theory]
    [InlineData("layouts")]
    [InlineData("layoutsettings")]
    public async Task GetInstanceLayoutResources_InvalidInstanceGuid_ReturnsNotFound(string resource)
    {
        using HttpClient client = GetUserClient();

        var response = await Get(client, resource, "not-a-guid");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
