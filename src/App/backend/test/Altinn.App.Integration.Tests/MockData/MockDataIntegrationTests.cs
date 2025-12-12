using System.Net;
using System.Text.Json;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.MockData;

[Trait("Category", "Integration")]
public class MockDataIntegrationTests(ITestOutputHelper _output, AppFixtureClassFixture _classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    private readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    [Fact]
    public async Task Should_Return_Mocked_Data_Via_HTTP_Headers()
    {
        await using var fixtureScope = await _classFixture.Get(_output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;

        // Arrange
        var mockData = new
        {
            userProfile = new { email = "cypress-mocked@example.com", phoneNumber = "+47 98765432" },
            applicationMetadata = new { promptForParty = "always" },
        };

        var client = fixture.GetAppClient();

        var request = new HttpRequestMessage(HttpMethod.Get, "/ttd/frontend-test/debug-initial-data");
        request.Headers.Add("X-Mock-Data", JsonSerializer.Serialize(mockData, _jsonOptions));

        // Act
        var response = await client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var responseContent = await response.Content.ReadAsStringAsync();

        // Debug: Output actual response to understand what's happening
        _output.WriteLine("Response content:");
        _output.WriteLine(responseContent);

        var responseData = JsonSerializer.Deserialize<JsonElement>(responseContent, _jsonOptions);

        // Verify mocked UserProfile data appears in response
        Assert.True(responseData.TryGetProperty("userProfile", out var userProfile));
        Assert.True(userProfile.TryGetProperty("email", out var email));
        Assert.Equal("cypress-mocked@example.com", email.GetString());
        Assert.True(userProfile.TryGetProperty("phoneNumber", out var phone));
        Assert.Equal("+47 98765432", phone.GetString());

        // Verify mocked ApplicationMetadata data appears in response
        Assert.True(responseData.TryGetProperty("applicationMetadata", out var appMetadata));
        Assert.True(appMetadata.TryGetProperty("promptForParty", out var promptForParty));
        Assert.Equal("always", promptForParty.GetString());
    }

    [Fact]
    public async Task Should_Handle_Malformed_Mock_Data_Gracefully()
    {
        await using var fixtureScope = await _classFixture.Get(_output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;

        // Arrange - Invalid JSON
        var client = fixture.GetAppClient();
        var request = new HttpRequestMessage(HttpMethod.Get, "/ttd/frontend-test/debug-initial-data");
        request.Headers.Add("X-Mock-Data", "{ invalid json here }");

        // Act
        var response = await client.SendAsync(request);

        // Assert - Should return 400 Bad Request due to invalid JSON
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var responseContent = await response.Content.ReadAsStringAsync();
        Assert.Contains("Invalid mock data JSON format", responseContent);
    }

    [Fact]
    public async Task Should_Preserve_Real_Data_When_No_Mock_Headers()
    {
        await using var fixtureScope = await _classFixture.Get(_output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;

        // Arrange - No mock headers, should get real data
        var client = fixture.GetAppClient();
        var request = new HttpRequestMessage(HttpMethod.Get, "/ttd/frontend-test/debug-initial-data");

        // Act
        var response = await client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var responseContent = await response.Content.ReadAsStringAsync();
        var responseData = JsonSerializer.Deserialize<JsonElement>(responseContent, _jsonOptions);

        // Should have real data structure
        Assert.True(responseData.TryGetProperty("applicationMetadata", out var appMetadata));
        Assert.True(responseData.TryGetProperty("userProfile", out var userProfile));

        // Should NOT contain any mock data indicators
        Assert.DoesNotContain("cypress-mocked@example.com", responseContent);
        Assert.DoesNotContain("Cypress Test Organization", responseContent);
        Assert.DoesNotContain("concurrent-test", responseContent);
    }

    [Fact]
    public async Task Should_Work_With_Complex_Mock_Scenarios()
    {
        await using var fixtureScope = await _classFixture.Get(_output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;

        // Arrange - Complex scenario: No parties + specific app metadata
        var mockData = new
        {
            parties = Array.Empty<object>(), // Empty parties array
            userProfile = new { email = "no-parties-test@example.com", userId = 1337 },
            applicationMetadata = new
            {
                promptForParty = "always",
                onEntry = new { show = "new-instance" },
                partyTypesAllowed = new
                {
                    person = false,
                    organisation = true,
                    subUnit = false,
                    bankruptcyEstate = false,
                },
            },
        };

        var client = fixture.GetAppClient();
        var request = new HttpRequestMessage(HttpMethod.Get, "/ttd/frontend-test/debug-initial-data");
        request.Headers.Add("X-Mock-Data", JsonSerializer.Serialize(mockData, _jsonOptions));

        // Act
        var response = await client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var responseContent = await response.Content.ReadAsStringAsync();
        var responseData = JsonSerializer.Deserialize<JsonElement>(responseContent, _jsonOptions);

        // Verify complex mocked scenario
        Assert.True(responseData.TryGetProperty("userProfile", out var userProfile));
        Assert.True(userProfile.TryGetProperty("email", out var email));
        Assert.Equal("no-parties-test@example.com", email.GetString());

        Assert.True(responseData.TryGetProperty("applicationMetadata", out var appMetadata));
        Assert.True(appMetadata.TryGetProperty("promptForParty", out var promptForParty));
        Assert.Equal("always", promptForParty.GetString());

        Assert.True(appMetadata.TryGetProperty("onEntry", out var onEntry));
        Assert.True(onEntry.TryGetProperty("show", out var show));
        Assert.Equal("new-instance", show.GetString());

        // Verify that when empty parties array is provided, Party should be null
        // (since the requested partyId won't be found in the empty mock parties list)
        Assert.True(responseData.TryGetProperty("party", out var party));
        Assert.Equal(JsonValueKind.Null, party.ValueKind);
    }

    [Fact]
    public async Task Should_Mock_UserDetails_In_HomeController_Navigation()
    {
        await using var fixtureScope = await _classFixture.Get(_output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;

        // Arrange - Mock user with multiple parties and specific party selection
        var mockData = new
        {
            userProfile = new { email = "test-navigation@example.com", phoneNumber = "+47 98765432" },
            parties = new object[]
            {
                new { partyId = 12345, name = "Test Person" },
                new
                {
                    partyId = 67890,
                    name = "Test Organization",
                    partyTypeName = 2,
                },
            },
            userDetails = new { selectedPartyId = 67890, representsSelf = false },
        };

        var client = fixture.GetAppClient();
        var mockDataHeader = JsonSerializer.Serialize(mockData, _jsonOptions);

        // Act - Call the main home page which will trigger LoadDetails and party selection logic
        var request = new HttpRequestMessage(HttpMethod.Get, "/ttd/frontend-test/");
        request.Headers.Add("X-Mock-Data", mockDataHeader);

        var response = await client.SendAsync(request);

        // Assert - Should get redirected to party-selection because user has multiple parties
        // Note: In real scenario this might redirect, but we can test that the mock data is processed
        Assert.True(response.IsSuccessStatusCode || response.StatusCode == HttpStatusCode.Redirect);

        // If it's a redirect, the location should contain party-selection route
        if (response.StatusCode == HttpStatusCode.Redirect)
        {
            var location = response.Headers.Location?.ToString();
            Assert.Contains("party-selection", location);
        }

        // Also test with the debug endpoint to verify the Details object is properly merged
        var debugRequest = new HttpRequestMessage(HttpMethod.Get, "/ttd/frontend-test/debug-initial-data");
        debugRequest.Headers.Add("X-Mock-Data", mockDataHeader);

        var debugResponse = await client.SendAsync(debugRequest);
        Assert.True(debugResponse.IsSuccessStatusCode);

        var debugContent = await debugResponse.Content.ReadAsStringAsync();
        var debugData = JsonDocument.Parse(debugContent);

        // Verify mocked UserProfile data appears in debug response
        Assert.True(debugData.RootElement.TryGetProperty("userProfile", out var userProfile));
        Assert.True(userProfile.TryGetProperty("email", out var email));
        Assert.Equal("test-navigation@example.com", email.GetString());
        Assert.True(userProfile.TryGetProperty("phoneNumber", out var phone));
        Assert.Equal("+47 98765432", phone.GetString());
    }
}
