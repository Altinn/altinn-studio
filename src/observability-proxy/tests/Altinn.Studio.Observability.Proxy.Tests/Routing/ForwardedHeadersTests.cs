using System.Net.Http.Headers;
using System.Text;

namespace Altinn.Studio.Observability.Proxy.Tests.Routing;

public sealed class ForwardedHeadersTests
{
    [Theory]
    [InlineData("traces")]
    [InlineData("metrics")]
    [InlineData("logs")]
    public async Task OtlpWrite_ForwardsOnlyTheBodyHeadersAndNoQuery(string signal)
    {
        // Tenant selection and VictoriaLogs' field rewriting are header- or query-driven, and a
        // source must not choose either.
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        await using var proxy = await TestWebApplication.StartProxyAsync(
            ProxyConfiguration.WithBothTokens(downstream.Address)
        );

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"/internal/observability/otlp/v1/{signal}?extra_label=tenant=evil&extra_fields=a=b&AccountID=5"
        );
        request.Headers.Authorization = new("Bearer", ProxyConfiguration.IngestToken);
        request.Headers.Add("AccountID", "5");
        request.Headers.Add("ProjectID", "7");
        request.Headers.Add("VL-Extra-Fields", "source=spoofed");
        request.Headers.Add("VL-Stream-Fields", "a,b");
        request.Headers.Add("VL-Ignore-Fields", "*");
        request.Headers.Add("VL-Msg-Field", "other");
        request.Headers.Add("X-Forwarded-For", "10.0.0.1");
        request.Headers.Add("X-Observability-Source", "studio-prod");
        request.Headers.Add("traceparent", "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01");
        request.Headers.UserAgent.ParseAdd("OpenTelemetry Collector/0.161.0");
        request.Content = new ByteArrayContent(Encoding.UTF8.GetBytes("payload"));
        request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/x-protobuf");
        request.Content.Headers.ContentEncoding.Add("gzip");

        using var response = await proxy.Client.SendAsync(request, TestContext.Current.CancellationToken);

        response.EnsureSuccessStatusCode();
        Assert.Equal(
            ["Content-Encoding", "Content-Length", "Content-Type", "Host", "X-Observability-Source"],
            response.Headers.GetValues("X-Observed-Headers").Single().Split(',')
        );
        Assert.Equal("runtime-prod", response.Headers.GetValues("X-Observed-Source").Single());
        Assert.DoesNotContain('?', response.Headers.GetValues("X-Observed-Path").Single());
        Assert.Equal("7", response.Headers.GetValues("X-Observed-Body-Length").Single());
    }

    [Fact]
    public async Task Read_KeepsWhatGrafanaSendsButTheToken()
    {
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        await using var proxy = await TestWebApplication.StartProxyAsync(
            ProxyConfiguration.WithBothTokens(downstream.Address)
        );

        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            "/internal/observability/logs/select/logsql/query?query=*&limit=1"
        );
        request.Headers.Authorization = new("Bearer", ProxyConfiguration.QueryToken);
        request.Headers.Add("X-Grafana-Org-Id", "1");
        request.Headers.Add("AccountID", "0");
        request.Headers.Add("ProjectID", "0");

        using var response = await proxy.Client.SendAsync(request, TestContext.Current.CancellationToken);

        response.EnsureSuccessStatusCode();
        var headers = response.Headers.GetValues("X-Observed-Headers").Single().Split(',');
        Assert.Contains("X-Grafana-Org-Id", headers);
        Assert.Contains("AccountID", headers);
        Assert.Contains("ProjectID", headers);
        Assert.DoesNotContain("Authorization", headers);
        Assert.Equal("/select/logsql/query?query=*&limit=1", response.Headers.GetValues("X-Observed-Path").Single());
    }
}
