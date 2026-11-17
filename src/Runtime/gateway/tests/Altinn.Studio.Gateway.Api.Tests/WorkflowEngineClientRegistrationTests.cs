using Altinn.Studio.Gateway.Api.Clients.WorkflowEngine;
using Altinn.Studio.Gateway.Api.Settings;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Tests;

public sealed class WorkflowEngineClientRegistrationTests
{
    [Theory]
    // A query string or a fragment ends up in front of every relative engine path resolved
    // against the base URL, so neither is allowed.
    [InlineData("http://engine.local/prefix?x=1")]
    [InlineData("http://engine.local/prefix#note")]
    public void Settings_RejectAQueryStringOrAFragment(string configured)
    {
        using var provider = BuildProvider(configured);

        Assert.Throws<OptionsValidationException>(() =>
            provider.GetRequiredService<IOptions<WorkflowEngineSettings>>().Value
        );
    }

    [Fact]
    public void Settings_AcceptAPathBearingBaseUrl()
    {
        using var provider = BuildProvider("http://engine.local/prefix");

        var settings = provider.GetRequiredService<IOptions<WorkflowEngineSettings>>().Value;

        Assert.Equal(new Uri("http://engine.local/prefix"), settings.BaseUrl);
    }

    [Fact]
    public void Client_FollowsNoRedirects()
    {
        using var provider = BuildProvider("http://engine.local");
        using var handler = provider
            .GetRequiredService<IHttpMessageHandlerFactory>()
            .CreateHandler(WorkflowEngineClient.HttpClientName);

        HttpMessageHandler current = handler;
        while (current is DelegatingHandler delegating && delegating.InnerHandler is not null)
            current = delegating.InnerHandler;

        var primary = Assert.IsType<SocketsHttpHandler>(current);
        Assert.False(primary.AllowAutoRedirect);
    }

    private static ServiceProvider BuildProvider(string baseUrl)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(
                new Dictionary<string, string?> { [$"{WorkflowEngineSettings.SectionName}:BaseUrl"] = baseUrl }
            )
            .Build();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddWorkflowEngineClient(configuration);
        return services.BuildServiceProvider();
    }
}
