using LocalTest.Configuration;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace LocalTest.Controllers;

[ApiController]
[Route("Home/[controller]/[action]")]
public class InfraController : ControllerBase
{
    private readonly ILogger<InfraController> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly LocalPlatformSettings _localPlatformSettings;
    private readonly GeneralSettings _generalSettings;

    public InfraController(
        ILogger<InfraController> logger,
        IHttpClientFactory httpClientFactory,
        IOptions<LocalPlatformSettings> localPlatformSettings,
        IOptions<GeneralSettings> generalSettings
    )
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _localPlatformSettings = localPlatformSettings.Value;
        _generalSettings = generalSettings.Value;
    }

    [HttpGet]
    public async Task<IActionResult> Grafana(CancellationToken cancellationToken)
    {
        using var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(2);

        try
        {
            var baseUrl = _localPlatformSettings.LocalGrafanaUrl ?? $"{_generalSettings.BaseUrl}/grafana";
            var url = $"{baseUrl}/api/health";
            var response = await client.GetAsync(url, cancellationToken);

            return response.IsSuccessStatusCode
                ? Ok()
                : throw new Exception("Unexpected status code: " + response.StatusCode);
        }
        catch (HttpRequestException ex)
            when (ex.InnerException?.Message.Contains(
                    "name does not resolve",
                    StringComparison.OrdinalIgnoreCase
                ) is true
            )
        {
            return StatusCode(StatusCodes.Status204NoContent);
        }
        catch (TaskCanceledException)
        {
            return StatusCode(StatusCodes.Status204NoContent);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error while checking health of {container}", "grafana");
            return StatusCode(StatusCodes.Status503ServiceUnavailable);
        }
    }
}
