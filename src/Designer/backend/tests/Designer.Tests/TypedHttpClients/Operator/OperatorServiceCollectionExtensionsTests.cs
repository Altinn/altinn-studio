#nullable enable
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration.Extensions;
using Altinn.Studio.Designer.TypedHttpClients.Operator;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.TypedHttpClients.Operator;

public sealed class OperatorServiceCollectionExtensionsTests : IDisposable
{
    private readonly string _directory = Directory.CreateTempSubdirectory("core-operator-token-").FullName;

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void AddOperatorHttpClient_WithoutABaseUrl_RegistersNoClient(string? baseUrl)
    {
        using var provider = BuildProvider(baseUrl, Path.Join(_directory, "token"), new RecordingHandler());

        Assert.Null(provider.GetService<IOperatorClient>());
    }

    [Theory]
    [InlineData(
        "http://core-operator.core-operator.svc.cluster.local:8080",
        "http://core-operator.core-operator.svc.cluster.local:8080/api/v1/kinds"
    )]
    [InlineData("http://gateway.example/operator", "http://gateway.example/operator/api/v1/kinds")]
    [InlineData("http://gateway.example/operator/", "http://gateway.example/operator/api/v1/kinds")]
    public async Task AddOperatorHttpClient_WithABaseUrl_SendsAuthenticatedRequestsBelowIt(
        string baseUrl,
        string expectedUri
    )
    {
        string tokenPath = Path.Join(_directory, "token");
        await File.WriteAllTextAsync(tokenPath, "designer-token");
        var recorder = new RecordingHandler();
        using var provider = BuildProvider(baseUrl, tokenPath, recorder);

        await provider.GetRequiredService<IOperatorClient>().ListKinds();

        Assert.Equal(new Uri(expectedUri), recorder.RequestUri);
        Assert.Equal("Bearer designer-token", recorder.Authorization);
    }

    public void Dispose() => Directory.Delete(_directory, recursive: true);

    private static ServiceProvider BuildProvider(string? baseUrl, string tokenPath, RecordingHandler recorder)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    [$"{nameof(OperatorSettings)}:{nameof(OperatorSettings.BaseUrl)}"] = baseUrl,
                    [$"{nameof(OperatorSettings)}:{nameof(OperatorSettings.TokenPath)}"] = tokenPath,
                }
            )
            .Build();
        var services = new ServiceCollection();
        services.RegisterSettings<OperatorSettings>(config);
        services.ConfigureHttpClientDefaults(builder => builder.ConfigurePrimaryHttpMessageHandler(() => recorder));
        services.AddOperatorHttpClient(config);
        return services.BuildServiceProvider();
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        public Uri? RequestUri { get; private set; }

        public string? Authorization { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            RequestUri = request.RequestUri;
            Authorization = request.Headers.Authorization?.ToString();
            return Task.FromResult(
                new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"kinds":[]}""", Encoding.UTF8, "application/json"),
                }
            );
        }
    }
}
