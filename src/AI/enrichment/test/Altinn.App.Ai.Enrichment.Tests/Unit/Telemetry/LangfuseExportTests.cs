using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Text;
using Altinn.App.Ai.Enrichment.Configuration;
using Altinn.App.Ai.Enrichment.Telemetry;
using Altinn.App.Ai.Enrichment.Tests.Helpers;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Altinn.App.Ai.Enrichment.Tests.Unit.Telemetry;

/// <summary>
/// Drives the real tracer provider — real OTLP exporter, real batch processor, real
/// wire format — against a socket that answers like Langfuse does.
///
/// Every span-shape test in this suite uses a raw <c>ActivityListener</c>, which
/// proves our attributes are right but never touches the exporter. The failures that
/// actually cost time (a 404 from an endpoint missing its signal path, a 401 from a
/// <c>DelegatingHandler</c> the exporter silently ignores) all lived in that gap:
/// spans were built perfectly and simply never arrived. This closes it.
/// </summary>
[Collection(ActivityListenerCollection.Name)]
public class LangfuseExportTests
{
    [Fact]
    public async Task EnabledTracing_ExportsSpansToTheLangfuseOtlpEndpoint()
    {
        using var langfuse = new FakeLangfuse();

        var options = Options.Create(new LangfuseOptions
        {
            Enabled = true,
            Host = langfuse.BaseUrl,
            PublicKey = "pk-lf-test",
            SecretKey = "sk-lf-test",
            Environment = "test",
        });

        var trace = new EnrichmentTrace(options);
        var tracing = new LangfuseTracing(
            options,
            new ConfigurationLangfuseKeyProvider(options),
            trace,
            NullLogger<LangfuseTracing>.Instance);

        await tracing.StartAsync(CancellationToken.None);

        tracing.IsActive.Should().BeTrue(
            "without a provider the source has no listener and every span is dropped before it exists");

        using (var run = trace.StartRun("ai-enrichment:Task_AiEnrichment", Activity.Current))
        {
            run.Should().NotBeNull("a built provider must make the source live");

            // The project id is not configured here, so this also proves the preflight
            // discovered it and handed it on for linking.
            trace.DeepLink(run).Should().Be(
                $"{langfuse.BaseUrl}/project/proj-test/traces/{run!.TraceId.ToHexString()}");
        }

        // StopAsync force-flushes, so the export is complete by the time it returns.
        await tracing.StopAsync(CancellationToken.None);

        var post = langfuse.Requests.SingleOrDefault(r => r.Method == "POST");
        post.Should().NotBeNull("the flush on shutdown must have delivered the span");
        post!.Path.Should().Be(
            "/api/public/otel/v1/traces",
            "setting Endpoint suppresses the exporter's own signal-path suffixing");
        post.Headers.Should().ContainKey("Authorization");
        post.Headers["Authorization"].Should().Be(
            "Basic " + Convert.ToBase64String(Encoding.UTF8.GetBytes("pk-lf-test:sk-lf-test")),
            "auth travels in Headers - the exporter ignores HttpClientFactory for this protocol");
        post.Headers.Should().ContainKey("x-langfuse-ingestion-version");
        post.Body.Should().NotBeEmpty();

        // Protobuf keeps strings as length-delimited UTF-8, so the span name is legible
        // in the payload without pulling in a decoder.
        Encoding.UTF8.GetString(post.Body).Should().Contain("ai-enrichment:Task_AiEnrichment");

        tracing.Dispose();
    }

    [Fact]
    public async Task RejectedCredentials_DisableTracingRatherThanExportingIntoTheVoid()
    {
        using var langfuse = new FakeLangfuse(preflightStatus: 401);

        var options = Options.Create(new LangfuseOptions
        {
            Enabled = true,
            Host = langfuse.BaseUrl,
            PublicKey = "pk-lf-test",
            SecretKey = "sk-lf-wrong",
        });

        var tracing = new LangfuseTracing(
            options,
            new ConfigurationLangfuseKeyProvider(options),
            new EnrichmentTrace(options),
            NullLogger<LangfuseTracing>.Instance);

        await tracing.StartAsync(CancellationToken.None);

        tracing.IsActive.Should().BeFalse();
        langfuse.Requests.Should().NotContain(r => r.Method == "POST");

        tracing.Dispose();
    }

    /// <summary>
    /// A socket that speaks just enough HTTP to stand in for Langfuse: the credential
    /// preflight and the OTLP ingestion endpoint. Raw rather than <c>HttpListener</c>,
    /// which needs a URL reservation on Windows.
    /// </summary>
    private sealed class FakeLangfuse : IDisposable
    {
        private readonly TcpListener _listener;
        private readonly CancellationTokenSource _cts = new();
        private readonly List<RecordedRequest> _requests = [];
        private readonly object _gate = new();
        private readonly int _preflightStatus;

        public FakeLangfuse(int preflightStatus = 200)
        {
            _preflightStatus = preflightStatus;
            _listener = new TcpListener(IPAddress.Loopback, 0);
            _listener.Start();
            BaseUrl = "http://127.0.0.1:" + ((IPEndPoint)_listener.LocalEndpoint).Port;
            _ = Task.Run(AcceptLoop);
        }

        public string BaseUrl { get; }

        public IReadOnlyList<RecordedRequest> Requests
        {
            get
            {
                lock (_gate)
                {
                    return [.. _requests];
                }
            }
        }

        private async Task AcceptLoop()
        {
            try
            {
                while (!_cts.IsCancellationRequested)
                {
                    var client = await _listener.AcceptTcpClientAsync(_cts.Token);
                    _ = Task.Run(() => Serve(client));
                }
            }
            catch (Exception)
            {
                // listener stopped
            }
        }

        private async Task Serve(TcpClient client)
        {
            using (client)
            {
                var stream = client.GetStream();
                try
                {
                    while (true)
                    {
                        var request = await ReadRequest(stream);
                        if (request is null)
                            return;

                        lock (_gate)
                        {
                            _requests.Add(request);
                        }

                        var status = request.Method == "GET" ? _preflightStatus : 200;
                        var body = status == 200 && request.Method == "GET"
                            ? "{\"data\":[{\"id\":\"proj-test\"}]}"
                            : string.Empty;

                        var response = "HTTP/1.1 " + status + " X\r\n"
                            + "Content-Type: application/json\r\n"
                            + "Content-Length: " + Encoding.UTF8.GetByteCount(body) + "\r\n\r\n"
                            + body;

                        await stream.WriteAsync(Encoding.UTF8.GetBytes(response));
                        await stream.FlushAsync();
                    }
                }
                catch (Exception)
                {
                    // client went away
                }
            }
        }

        private static async Task<RecordedRequest?> ReadRequest(NetworkStream stream)
        {
            var head = new List<byte>();
            var one = new byte[1];
            while (head.Count < 4
                || head[^4] != (byte)'\r' || head[^3] != (byte)'\n'
                || head[^2] != (byte)'\r' || head[^1] != (byte)'\n')
            {
                if (await stream.ReadAsync(one) == 0)
                    return null;
                head.Add(one[0]);
            }

            var lines = Encoding.UTF8.GetString([.. head]).Split("\r\n", StringSplitOptions.RemoveEmptyEntries);
            var start = lines[0].Split(' ');

            var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var line in lines.Skip(1))
            {
                var colon = line.IndexOf(':');
                if (colon > 0)
                    headers[line[..colon].Trim()] = line[(colon + 1)..].Trim();
            }

            var body = Array.Empty<byte>();
            if (headers.TryGetValue("Content-Length", out var raw)
                && int.TryParse(raw, out var length)
                && length > 0)
            {
                body = new byte[length];
                var read = 0;
                while (read < length)
                {
                    var n = await stream.ReadAsync(body.AsMemory(read, length - read));
                    if (n == 0)
                        break;
                    read += n;
                }
            }

            return new RecordedRequest(start[0], start[1], headers, body);
        }

        public void Dispose()
        {
            _cts.Cancel();
            _listener.Stop();
            _cts.Dispose();
        }
    }

    private sealed record RecordedRequest(
        string Method,
        string Path,
        Dictionary<string, string> Headers,
        byte[] Body);
}
