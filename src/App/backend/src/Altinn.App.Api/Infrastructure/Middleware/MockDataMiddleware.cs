using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Api.Infrastructure.Middleware;

/// <summary>
/// Middleware for parsing mock data headers in development/test environments.
/// Allows Cypress tests to specify custom user profiles, party data, application metadata, and instance data.
/// </summary>
public class MockDataMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<MockDataMiddleware> _logger;

    private const string MockDataHeader = "X-Mock-Data";
    private const string MockDataKey = "MockData";
    private const int MaxHeaderSizeBytes = 8192; // 8KB limit
    private const string ErrorTooLarge = "Mock data too large. Maximum size is 8KB.";
    private const string ErrorInvalidJson = "Invalid mock data JSON format.";

    /// <summary>
    /// Initializes a new instance of the MockDataMiddleware.
    /// </summary>
    /// <param name="next">The next middleware in the pipeline.</param>
    /// <param name="environment">The web host environment.</param>
    /// <param name="logger">The logger instance.</param>
    public MockDataMiddleware(RequestDelegate next, IWebHostEnvironment environment, ILogger<MockDataMiddleware> logger)
    {
        _next = next;
        _environment = environment;
        _logger = logger;
    }

    /// <summary>
    /// Executes the middleware to parse mock data headers.
    /// </summary>
    /// <param name="context">The HTTP context.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task InvokeAsync(HttpContext context)
    {
        if (ShouldProcessMockData() && TryGetMockDataHeader(context, out var mockDataJson) && mockDataJson != null)
        {
            var processResult = await ProcessMockDataAsync(context, mockDataJson);
            if (!processResult)
                return; // Error response already written
        }

        await _next(context);
    }

    /// <summary>
    /// Determines if mock data should be processed based on the environment.
    /// </summary>
    /// <returns>True if mock data should be processed, otherwise false.</returns>
    private bool ShouldProcessMockData()
    {
        return _environment.IsDevelopment() || _environment.IsEnvironment("Test");
    }

    /// <summary>
    /// Attempts to retrieve the mock data header from the request.
    /// </summary>
    /// <param name="context">The HTTP context.</param>
    /// <param name="mockDataJson">The mock data JSON string if found.</param>
    /// <returns>True if mock data header exists and is not empty, otherwise false.</returns>
    private static bool TryGetMockDataHeader(HttpContext context, out string? mockDataJson)
    {
        mockDataJson = null;

        if (context.Request.Headers.TryGetValue(MockDataHeader, out var mockDataValues))
        {
            mockDataJson = mockDataValues.FirstOrDefault();
            return !string.IsNullOrEmpty(mockDataJson);
        }

        return false;
    }

    /// <summary>
    /// Processes the mock data JSON and stores it in the HttpContext.
    /// </summary>
    /// <param name="context">The HTTP context.</param>
    /// <param name="mockDataJson">The mock data JSON string.</param>
    /// <returns>True if processing succeeded, false if an error response was written.</returns>
    private async Task<bool> ProcessMockDataAsync(HttpContext context, string mockDataJson)
    {
        try
        {
            if (!ValidateMockDataSize(mockDataJson))
            {
                _logger.LogWarning(
                    "Mock data header too large: {Size} bytes",
                    System.Text.Encoding.UTF8.GetByteCount(mockDataJson)
                );
                await WriteErrorResponseAsync(context, ErrorTooLarge);
                return false;
            }

            var mockData = JsonSerializer.Deserialize<Dictionary<string, object>>(mockDataJson);

            if (mockData != null)
            {
                context.Items[MockDataKey] = mockData;
                _logger.LogDebug("Mock data parsed and stored. Keys: {Keys}", string.Join(", ", mockData.Keys));
            }

            return true;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse mock data JSON");
            await WriteErrorResponseAsync(context, ErrorInvalidJson);
            return false;
        }
    }

    /// <summary>
    /// Validates that the mock data size is within limits.
    /// </summary>
    /// <param name="mockDataJson">The mock data JSON string.</param>
    /// <returns>True if size is acceptable, otherwise false.</returns>
    private static bool ValidateMockDataSize(string mockDataJson)
    {
        return System.Text.Encoding.UTF8.GetByteCount(mockDataJson) <= MaxHeaderSizeBytes;
    }

    /// <summary>
    /// Writes an error response to the HTTP context.
    /// </summary>
    /// <param name="context">The HTTP context.</param>
    /// <param name="errorMessage">The error message to write.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    private static async Task WriteErrorResponseAsync(HttpContext context, string errorMessage)
    {
        context.Response.StatusCode = 400;
        context.Response.ContentType = "text/plain";
        await context.Response.WriteAsync(errorMessage);
    }
}
