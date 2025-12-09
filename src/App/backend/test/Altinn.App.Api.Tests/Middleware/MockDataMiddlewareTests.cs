using System.Net;
using System.Text;
using System.Text.Json;
using Altinn.App.Api.Infrastructure.Middleware;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Altinn.App.Api.Tests.Middleware;

public class MockDataMiddlewareTests
{
    [Fact]
    public async Task Should_Parse_Valid_Mock_Data_Header()
    {
        // Arrange
        var mockData = new { userProfile = new { email = "test@example.com" } };
        var mockJson = JsonSerializer.Serialize(mockData);
        using var host = await CreateTestHost();

        // Act
        var response = await host.GetTestClient()
            .SendAsync(new HttpRequestMessage(HttpMethod.Get, "/") { Headers = { { "X-Mock-Data", mockJson } } });

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var responseContent = await response.Content.ReadAsStringAsync();
        Assert.Contains("test@example.com", responseContent);
    }

    [Fact]
    public async Task Should_Store_Parsed_Data_In_HttpContext()
    {
        // Arrange
        var mockData = new { userProfile = new { email = "test@example.com" } };
        var mockJson = JsonSerializer.Serialize(mockData);
        using var host = await CreateTestHost();

        // Act
        var response = await host.GetTestClient()
            .SendAsync(new HttpRequestMessage(HttpMethod.Get, "/") { Headers = { { "X-Mock-Data", mockJson } } });

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var responseContent = await response.Content.ReadAsStringAsync();
        Assert.Contains("MockDataExists:True", responseContent);
    }

    [Fact]
    public async Task Should_Skip_When_No_Header_Present()
    {
        // Arrange
        using var host = await CreateTestHost();

        // Act
        var response = await host.GetTestClient().GetAsync("/");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var responseContent = await response.Content.ReadAsStringAsync();
        Assert.Contains("MockDataExists:False", responseContent);
    }

    [Fact]
    public async Task Should_Return_BadRequest_For_Invalid_JSON()
    {
        // Arrange
        using var host = await CreateTestHost();

        // Act
        var response = await host.GetTestClient()
            .SendAsync(
                new HttpRequestMessage(HttpMethod.Get, "/") { Headers = { { "X-Mock-Data", "invalid-json-{" } } }
            );

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var responseContent = await response.Content.ReadAsStringAsync();
        Assert.Contains("Invalid mock data JSON", responseContent);
    }

    [Fact]
    public async Task Should_Only_Activate_In_Development_Environment()
    {
        // Arrange
        var mockData = new { userProfile = new { email = "test@example.com" } };
        var mockJson = JsonSerializer.Serialize(mockData);
        using var host = await CreateTestHost("Production");

        // Act
        var response = await host.GetTestClient()
            .SendAsync(new HttpRequestMessage(HttpMethod.Get, "/") { Headers = { { "X-Mock-Data", mockJson } } });

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var responseContent = await response.Content.ReadAsStringAsync();
        Assert.Contains("MockDataExists:False", responseContent); // Should ignore header in production
    }

    [Fact]
    public async Task Should_Handle_Large_Headers_Gracefully()
    {
        // Arrange
        var largeObject = new
        {
            userProfile = new
            {
                email = "test@example.com",
                description = new string('a', 10000), // Large string
            },
        };
        var mockJson = JsonSerializer.Serialize(largeObject);
        using var host = await CreateTestHost();

        // Act
        var response = await host.GetTestClient()
            .SendAsync(new HttpRequestMessage(HttpMethod.Get, "/") { Headers = { { "X-Mock-Data", mockJson } } });

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var responseContent = await response.Content.ReadAsStringAsync();
        Assert.Contains("Mock data too large", responseContent);
    }

    [Fact]
    public async Task Should_Validate_Mock_Data_Structure()
    {
        // Arrange
        var mockJson = JsonSerializer.Serialize(new { invalidProperty = "value" });
        using var host = await CreateTestHost();

        // Act
        var response = await host.GetTestClient()
            .SendAsync(new HttpRequestMessage(HttpMethod.Get, "/") { Headers = { { "X-Mock-Data", mockJson } } });

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode); // Should allow unknown properties but not crash
        var responseContent = await response.Content.ReadAsStringAsync();
        Assert.Contains("MockDataExists:True", responseContent);
    }

    private static async Task<IHost> CreateTestHost(string environment = "Development")
    {
        return await new HostBuilder()
            .ConfigureWebHost(webBuilder =>
            {
                webBuilder
                    .UseTestServer()
                    .UseEnvironment(environment)
                    .ConfigureServices(services =>
                    {
                        // Add any required services for the middleware
                    })
                    .Configure(app =>
                    {
                        app.UseMiddleware<MockDataMiddleware>();

                        // Add a simple endpoint that returns mock data info for testing
                        app.Run(async context =>
                        {
                            var hasMockData = context.Items.ContainsKey("MockData");
                            var response = $"MockDataExists:{hasMockData}";

                            if (hasMockData && context.Items["MockData"] is Dictionary<string, object> mockData)
                            {
                                if (
                                    mockData.ContainsKey("userProfile")
                                    && mockData["userProfile"] is JsonElement userProfile
                                    && userProfile.TryGetProperty("email", out var email)
                                )
                                {
                                    response += $"|Email:{email.GetString()}";
                                }
                            }

                            await context.Response.WriteAsync(response);
                        });
                    });
            })
            .StartAsync();
    }
}
