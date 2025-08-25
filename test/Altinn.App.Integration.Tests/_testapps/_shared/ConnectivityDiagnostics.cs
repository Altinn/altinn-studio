using System;
using System.Net.Http;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

#nullable enable

namespace TestApp.Shared;

/// <summary>
/// Provides connectivity diagnostic endpoints to verify container-to-container communication.
/// This is useful for testing network connectivity and diagnosing host.docker.internal issues.
/// </summary>
public static class ConnectivityDiagnostics
{
    /// <summary>
    /// Maps connectivity diagnostic endpoints.
    /// </summary>
    public static WebApplication UseConnectivityDiagnostics(this WebApplication app)
    {
        app.MapGet(
            "/{org}/{app}/diagnostics/connectivity/pdf",
            async ([FromServices] IHttpClientFactory httpClientFactory, [FromServices] IConfiguration configuration) =>
            {
                try
                {
                    using var httpClient = httpClientFactory.CreateClient();
                    httpClient.Timeout = TimeSpan.FromSeconds(5);

                    // Get PDF service URL from configuration (as set in AppFixture.cs)
                    var pdfServiceUrl =
                        configuration["PlatformSettings:ApiPdf2Endpoint"]
                        ?? throw new Exception("PlatformSettings.ApiPdf2Endpoint not configured");

                    var activeEndpoint = pdfServiceUrl.Replace("/pdf", "/config");

                    var response = await httpClient.GetAsync(activeEndpoint);
                    var content = await response.Content.ReadAsStringAsync();

                    return Results.Json(
                        new ConnectivityResult
                        {
                            Success = response.IsSuccessStatusCode,
                            StatusCode = (int)response.StatusCode,
                            Url = activeEndpoint,
                            ResponseContent = content,
                            Message = response.IsSuccessStatusCode
                                ? "PDF service connectivity verified"
                                : $"PDF service connectivity failed: {response.ReasonPhrase}",
                        }
                    );
                }
                catch (Exception ex)
                {
                    return Results.Json(
                        new ConnectivityResult
                        {
                            Success = false,
                            StatusCode = 0,
                            Url = "unknown",
                            ResponseContent = null,
                            Message = $"PDF service connectivity error: {ex.Message}",
                            Exception = ex.ToString(),
                        }
                    );
                }
            }
        );

        app.MapGet(
            "/{org}/{app}/diagnostics/connectivity/localtest",
            async ([FromServices] IHttpClientFactory httpClientFactory, [FromServices] IConfiguration configuration) =>
            {
                try
                {
                    using var httpClient = httpClientFactory.CreateClient();
                    httpClient.Timeout = TimeSpan.FromSeconds(5);

                    // Get localtest URL from configuration
                    var localtestBaseUrl =
                        configuration["PlatformSettings:ApiStorageEndpoint"]
                        ?? throw new Exception("PlatformSettings.ApiStorageEndpoint not configured");

                    // Extract base URL and construct health endpoint
                    var baseUri = new Uri(localtestBaseUrl);
                    var healthEndpoint = $"{baseUri.Scheme}://{baseUri.Authority}/health";

                    var response = await httpClient.GetAsync(healthEndpoint);
                    var content = await response.Content.ReadAsStringAsync();

                    return Results.Json(
                        new ConnectivityResult
                        {
                            Success = response.IsSuccessStatusCode,
                            StatusCode = (int)response.StatusCode,
                            Url = healthEndpoint,
                            ResponseContent = content,
                            Message = response.IsSuccessStatusCode
                                ? "Localtest health endpoint connectivity verified"
                                : $"Localtest health endpoint connectivity failed: {response.ReasonPhrase}",
                        }
                    );
                }
                catch (Exception ex)
                {
                    return Results.Json(
                        new ConnectivityResult
                        {
                            Success = false,
                            StatusCode = 0,
                            Url = "unknown",
                            ResponseContent = null,
                            Message = $"Localtest health endpoint connectivity error: {ex.Message}",
                            Exception = ex.ToString(),
                        }
                    );
                }
            }
        );

        return app;
    }
}
