using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Models.Pdf;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OpenTelemetry.Context.Propagation;

namespace Altinn.App.Core.Infrastructure.Clients.Pdf;

/// <summary>
/// Implementation of the <see cref="IPdfGeneratorClient"/> interface using a HttpClient to send
/// requests to the PDF Generator service.
/// </summary>
public class PdfGeneratorClient : IPdfGeneratorClient
{
    private static readonly TextMapPropagator _w3cPropagator = new TraceContextPropagator();

    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly ILogger<PdfGeneratorClient> _logger;
    private readonly HttpClient _httpClient;
    private readonly PdfGeneratorSettings _pdfGeneratorSettings;
    private readonly PlatformSettings _platformSettings;
    private readonly IUserTokenProvider _userTokenProvider;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Initializes a new instance of the <see cref="PdfGeneratorClient"/> class.
    /// </summary>
    /// <param name="logger">The logger.</param>
    /// <param name="httpClient">The HttpClient to use in communication with the PDF generator service.</param>
    /// <param name="pdfGeneratorSettings">
    /// All generic settings needed for communication with the PDF generator service.
    /// </param>
    /// <param name="platformSettings">Links to platform services</param>
    /// <param name="userTokenProvider">A service able to identify the JWT for currently authenticated user.</param>
    /// <param name="httpContextAccessor">http context</param>
    /// <param name="telemetry">Telemetry service</param>
    public PdfGeneratorClient(
        ILogger<PdfGeneratorClient> logger,
        HttpClient httpClient,
        IOptions<PdfGeneratorSettings> pdfGeneratorSettings,
        IOptions<PlatformSettings> platformSettings,
        IUserTokenProvider userTokenProvider,
        IHttpContextAccessor httpContextAccessor,
        Telemetry? telemetry = null
    )
    {
        _logger = logger;
        _httpClient = httpClient;
        _userTokenProvider = userTokenProvider;
        _pdfGeneratorSettings = pdfGeneratorSettings.Value;
        _platformSettings = platformSettings.Value;
        _httpContextAccessor = httpContextAccessor;
        _telemetry = telemetry;
    }

    /// <inheritdoc/>
    public async Task<Stream> GeneratePdf(Uri uri, CancellationToken ct)
    {
        return await GeneratePdf(uri, null, ct);
    }

    /// <inheritdoc/>
    public async Task<Stream> GeneratePdf(Uri uri, string? footerContent, CancellationToken ct)
    {
        using var activity = _telemetry?.StartGeneratePdfClientActivity();

        bool hasWaitForSelector = !string.IsNullOrWhiteSpace(_pdfGeneratorSettings.WaitForSelector);
        PdfGeneratorRequest generatorRequest = new()
        {
            Url = uri.AbsoluteUri,
            WaitFor = hasWaitForSelector ? _pdfGeneratorSettings.WaitForSelector : _pdfGeneratorSettings.WaitForTime,
            Options =
            {
                HeaderTemplate = "<div/>",
                FooterTemplate = footerContent ?? "<div/>",
                DisplayHeaderFooter = footerContent != null,
            },
        };

        if (Activity.Current is { } propagateActivity)
        {
            // We want the frontend to attach the current trace context to requests
            // when making downstream requests back to the app backend.
            // This makes it easier to debug issues (such as slow backend requests during PDF generation).
            // The frontend expects to see the "traceparent" and "tracestate" values as cookies (as they are easily propagated).
            // It will then pass them back to the backend in the "traceparent" and "tracestate" headers as per W3C spec.
            _w3cPropagator.Inject(
                new PropagationContext(propagateActivity.Context, default),
                generatorRequest.Cookies,
                (c, k, v) =>
                {
                    if (k != "traceparent" && k != "tracestate")
                        _logger.LogWarning("Unexpected key '{Key}' when propagating trace context (expected W3C)", k);

                    var value = v;
                    if (k == "tracestate")
                    {
                        // tracestate will contain e.g. baggage which are arbitrary keyvalue pairs example kv: "dd=s:1;o:rum".
                        // values can contain semicolon which is not allowed in cookie values
                        // so we base64 encode the entire value to be safe
                        // Frontend accounts for this when passing it back when on the PDF page
                        value = Convert.ToBase64String(Encoding.UTF8.GetBytes(v));
                    }

                    c.Add(
                        new PdfGeneratorCookieOptions
                        {
                            Name = $"altinn-telemetry-{k}",
                            Value = value,
                            Domain = uri.Host,
                        }
                    );
                }
            );
        }

        generatorRequest.Cookies.Add(
            new PdfGeneratorCookieOptions { Value = _userTokenProvider.GetUserToken(), Domain = uri.Host }
        );

        if (
            uri.Host.Contains("local.altinn.cloud")
            && _httpContextAccessor.HttpContext?.Request.Cookies.TryGetValue("frontendVersion", out var frontendVersion)
                == true
            && !string.IsNullOrEmpty(frontendVersion)
        )
        {
            frontendVersion = frontendVersion.Replace("localhost", "host.containers.internal");
            generatorRequest.Cookies.Insert(
                0,
                new PdfGeneratorCookieOptions
                {
                    Name = "frontendVersion",
                    Domain = uri.Host,
                    Value = frontendVersion,
                }
            );
        }

        string requestContent = JsonSerializer.Serialize(generatorRequest, _jsonSerializerOptions);
        using StringContent stringContent = new(requestContent, Encoding.UTF8, "application/json");
        var httpResponseMessage = await _httpClient.PostAsync(_platformSettings.ApiPdf2Endpoint, stringContent, ct);

        if (!httpResponseMessage.IsSuccessStatusCode)
        {
            var content = await httpResponseMessage.Content.ReadAsStringAsync(ct);
            var ex = new PdfGenerationException("Pdf generation failed");
            ex.Data.Add("responseContent", content);
            ex.Data.Add("responseStatusCode", httpResponseMessage.StatusCode.ToString());
            ex.Data.Add("responseReasonPhrase", httpResponseMessage.ReasonPhrase);

            throw ex;
        }

        return await httpResponseMessage.Content.ReadAsStreamAsync(ct);
    }
}
