using System.Text;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Models.Pdf;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Infrastructure.Clients.Pdf;

/// <summary>
/// Implementation of the <see cref="IPdfGeneratorClient"/> interface using a HttpClient to send
/// requests to the PDF Generator service.
/// </summary>
public class PdfGeneratorClient : IPdfGeneratorClient
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly HttpClient _httpClient;
    private readonly PdfGeneratorSettings _pdfGeneratorSettings;
    private readonly PlatformSettings _platformSettings;
    private readonly IUserTokenProvider _userTokenProvider;
    private readonly IHttpContextAccessor _httpContextAccessor;

    /// <summary>
    /// Initializes a new instance of the <see cref="PdfGeneratorClient"/> class.
    /// </summary>
    /// <param name="httpClient">The HttpClient to use in communication with the PDF generator service.</param>
    /// <param name="pdfGeneratorSettings">
    /// All generic settings needed for communication with the PDF generator service.
    /// </param>
    /// <param name="platformSettings">Links to platform services</param>
    /// <param name="userTokenProvider">A service able to identify the JWT for currently authenticated user.</param>
    /// <param name="httpContextAccessor">http context</param>
    public PdfGeneratorClient(
        HttpClient httpClient,
        IOptions<PdfGeneratorSettings> pdfGeneratorSettings,
        IOptions<PlatformSettings> platformSettings,
        IUserTokenProvider userTokenProvider,
        IHttpContextAccessor httpContextAccessor
    )
    {
        _httpClient = httpClient;
        _userTokenProvider = userTokenProvider;
        _pdfGeneratorSettings = pdfGeneratorSettings.Value;
        _platformSettings = platformSettings.Value;
        _httpContextAccessor = httpContextAccessor;
    }

    /// <inheritdoc/>
    public async Task<Stream> GeneratePdf(Uri uri, CancellationToken ct)
    {
        return await GeneratePdf(uri, null, ct);
    }

    /// <inheritdoc/>
    public async Task<Stream> GeneratePdf(Uri uri, string? footerContent, CancellationToken ct)
    {
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
