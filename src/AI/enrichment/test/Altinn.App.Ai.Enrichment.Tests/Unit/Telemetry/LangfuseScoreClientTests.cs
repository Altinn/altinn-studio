using System.Net;
using System.Text.Json;
using Altinn.App.Ai.Enrichment.Configuration;
using Altinn.App.Ai.Enrichment.Telemetry;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Altinn.App.Ai.Enrichment.Tests.Unit.Telemetry;

public class LangfuseScoreClientTests
{
    [Fact]
    public async Task FindTraceIdsBySession_ReturnsEveryTraceForTheSubmission()
    {
        // More than one trace per session is normal: an engine retry or a replay produces
        // a second run for the same instance.
        var handler = new StubHandler(Json("""
            {"data":[{"id":"aaa1"},{"id":"bbb2"}],"meta":{"totalItems":2}}
            """));
        var sut = CreateSut(handler);

        var ids = await sut.FindTraceIdsBySession("ttd/klage/50012345/0195c0de");

        ids.Should().Equal("aaa1", "bbb2");
        handler.LastUri!.PathAndQuery.Should().StartWith("/api/public/traces?sessionId=");
        handler.LastUri.Query.Should().Contain(Uri.EscapeDataString("ttd/klage/50012345/0195c0de"));
    }

    [Fact]
    public async Task CreateScore_SendsTheClientChosenIdSoReimportOverwrites()
    {
        var handler = new StubHandler(Json("""{"id":"backfill-1"}"""));
        var sut = CreateSut(handler);

        var ok = await sut.CreateScore(new LangfuseScore
        {
            Id = "backfill-1",
            TraceId = "aaa1",
            Name = "saksbehandler_vurdering",
            Value = 1,
            DataType = "BOOLEAN",
            Comment = "Verdikt korrekt",
        });

        ok.Should().BeTrue();
        using var body = JsonDocument.Parse(handler.LastBody!);
        body.RootElement.GetProperty("id").GetString().Should().Be("backfill-1");
        body.RootElement.GetProperty("traceId").GetString().Should().Be("aaa1");
        body.RootElement.GetProperty("dataType").GetString().Should().Be("BOOLEAN");
    }

    [Fact]
    public async Task CreateScore_WhenLangfuseRejects_ReportsFailureWithoutThrowing()
    {
        var sut = CreateSut(new StubHandler(new HttpResponseMessage(HttpStatusCode.BadRequest)
        {
            Content = new StringContent("""{"error":"no such trace"}"""),
        }));

        var ok = await sut.CreateScore(new LangfuseScore
        {
            Id = "backfill-1",
            TraceId = "missing",
            Name = "x",
            Value = 0,
        });

        ok.Should().BeFalse();
    }

    [Theory]
    [InlineData(null, "pk-lf-x", "sk-lf-x")]
    [InlineData("https://langfuse.example", null, "sk-lf-x")]
    [InlineData("https://langfuse.example", "pk-lf-x", null)]
    public async Task WithoutCompleteCredentials_IsInertRatherThanFailing(string? host, string? publicKey, string? secretKey)
    {
        // An app with tracing switched off should be able to call this unconditionally.
        var handler = new StubHandler(Json("{}"));
        var sut = CreateSut(handler, host, publicKey, secretKey);

        (await sut.FindTraceIdsBySession("any")).Should().BeEmpty();
        (await sut.CreateScore(new LangfuseScore { Id = "a", TraceId = "b", Name = "c", Value = 1 })).Should().BeFalse();
        handler.LastUri.Should().BeNull("no request should have been attempted");
    }

    private static LangfuseScoreClient CreateSut(
        HttpMessageHandler handler,
        string? host = "https://langfuse.example",
        string? publicKey = "pk-lf-x",
        string? secretKey = "sk-lf-x")
    {
        var options = Options.Create(new LangfuseOptions
        {
            Host = host,
            PublicKey = publicKey,
            SecretKey = secretKey,
        });
        return new LangfuseScoreClient(
            new StubHttpClientFactory(handler),
            options,
            new ConfigurationLangfuseKeyProvider(options),
            NullLogger<LangfuseScoreClient>.Instance);
    }

    private static HttpResponseMessage Json(string body) =>
        new(HttpStatusCode.OK) { Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json") };

    private sealed class StubHttpClientFactory(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(handler, disposeHandler: false);
    }

    private sealed class StubHandler(HttpResponseMessage response) : HttpMessageHandler
    {
        public Uri? LastUri { get; private set; }
        public string? LastBody { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastUri = request.RequestUri;
            if (request.Content is not null)
                LastBody = await request.Content.ReadAsStringAsync(cancellationToken);
            return response;
        }
    }
}
