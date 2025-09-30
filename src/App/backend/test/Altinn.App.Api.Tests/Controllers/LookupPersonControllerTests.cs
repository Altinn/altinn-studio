using System.Net;
using System.Net.Http.Headers;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Api.Models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Helpers;
using Altinn.Platform.Register.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class LookupPersonControllerTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "tdd";
    private const string App = "contributer-restriction";

    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        UnknownTypeHandling = JsonUnknownTypeHandling.JsonElement,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    public LookupPersonControllerTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper) { }

    [Fact]
    public async Task Post_PersonSearch_HappyPath_ReturnsOk()
    {
        HttpClient client = GetHttpClient();

        var sendAsyncCalled = false;
        SendAsync = async message =>
        {
            message.RequestUri!.PathAndQuery.Should().Be($"/register/api/v1/persons");
            string socialSecurityNumber = message.Headers.GetValues("X-Ai-NationalIdentityNumber").First();
            string lastName = message.Headers.GetValues("X-Ai-LastName").First();

            OutputHelper.WriteLine("Person client request headers:");
            OutputHelper.WriteLine("X-Ai-NationalIdentityNumber: " + socialSecurityNumber);
            OutputHelper.WriteLine("X-Ai-LastName: " + lastName + " (base64)");

            sendAsyncCalled = true;

            var person = new Person
            {
                SSN = "12345678901",
                Name = "Ola Normann",
                FirstName = "Ola Normann",
                MiddleName = null,
                LastName = "Normann",
            };

            string personJson = JsonSerializer.Serialize(person);
            var responseContent = new StringContent(personJson);

            var response = new HttpResponseMessage(HttpStatusCode.OK);
            response.Content = responseContent;

            return await Task.FromResult(response);
        };

        using var requestContent = new StringContent(
            """{"SocialSecurityNumber": "12345678901", "LastName": "Normann"}""",
            System.Text.Encoding.UTF8,
            "application/json"
        );

        HttpResponseMessage response = await client.PostAsync($"{Org}/{App}/api/v1/lookup/person", requestContent);

        sendAsyncCalled.Should().BeTrue();
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        string responseContent = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(responseContent);
        var personSearchResponse = JsonSerializer.Deserialize<LookupPersonResponse>(
            responseContent,
            _jsonSerializerOptions
        );

        personSearchResponse.Should().NotBeNull();
        personSearchResponse?.Success.Should().BeTrue();
        personSearchResponse?.PersonDetails.Should().NotBeNull();
        personSearchResponse?.PersonDetails?.Ssn.Should().Be("12345678901");
        personSearchResponse?.PersonDetails?.LastName.Should().Be("Normann");
    }

    [Fact]
    public async Task Post_PersonSearch_NotFound_Returned_Correctly()
    {
        HttpClient client = GetHttpClient();

        var sendAsyncCalled = false;
        SendAsync = async message =>
        {
            message.RequestUri!.PathAndQuery.Should().Be($"/register/api/v1/persons");
            sendAsyncCalled = true;

            var response = new HttpResponseMessage(HttpStatusCode.NotFound);

            return await Task.FromResult(response);
        };

        using var requestContent = new StringContent(
            """{"SocialSecurityNumber": "12345678901", "LastName": "Normann"}""",
            System.Text.Encoding.UTF8,
            "application/json"
        );

        HttpResponseMessage response = await client.PostAsync($"{Org}/{App}/api/v1/lookup/person", requestContent);

        sendAsyncCalled.Should().BeTrue();
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        string responseContent = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(responseContent);
        var personSearchResponse = JsonSerializer.Deserialize<LookupPersonResponse>(
            responseContent,
            _jsonSerializerOptions
        );

        personSearchResponse.Should().NotBeNull();
        personSearchResponse?.Success.Should().BeFalse();
        personSearchResponse?.PersonDetails.Should().BeNull();
    }

    [Fact]
    public async Task Post_PersonSearch_Forbidden_Returned_Correctly()
    {
        HttpClient client = GetHttpClient();

        var sendAsyncCalled = false;
        SendAsync = async message =>
        {
            message.RequestUri!.PathAndQuery.Should().Be($"/register/api/v1/persons");
            sendAsyncCalled = true;

            var response = new HttpResponseMessage(HttpStatusCode.Forbidden);

            return await Task.FromResult(response);
        };

        using var requestContent = new StringContent(
            """{"SocialSecurityNumber": "12345678901", "LastName": "Normann"}""",
            System.Text.Encoding.UTF8,
            "application/json"
        );

        HttpResponseMessage response = await client.PostAsync($"{Org}/{App}/api/v1/lookup/person", requestContent);

        sendAsyncCalled.Should().BeTrue();
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        string responseContent = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(responseContent);
        var personSearchResponse = JsonSerializer.Deserialize<ProblemDetails>(responseContent, _jsonSerializerOptions);

        personSearchResponse.Should().NotBeNull();
        personSearchResponse?.Title.Should().BeEquivalentTo("Forbidden");
        personSearchResponse?.Detail.Should().BeEquivalentTo("Access to the register is forbidden");
        personSearchResponse?.Status.Should().Be(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public async Task Post_PersonSearch_TooManyRequests_Returned_Correctly()
    {
        HttpClient client = GetHttpClient();

        var sendAsyncCalled = false;
        SendAsync = async message =>
        {
            message.RequestUri!.PathAndQuery.Should().Be($"/register/api/v1/persons");
            sendAsyncCalled = true;

            var response = new HttpResponseMessage(HttpStatusCode.TooManyRequests);

            return await Task.FromResult(response);
        };

        using var requestContent = new StringContent(
            """{"SocialSecurityNumber": "12345678901", "LastName": "Normann"}""",
            System.Text.Encoding.UTF8,
            "application/json"
        );

        HttpResponseMessage response = await client.PostAsync($"{Org}/{App}/api/v1/lookup/person", requestContent);

        sendAsyncCalled.Should().BeTrue();
        response.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);

        string responseContent = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(responseContent);
        var personSearchResponse = JsonSerializer.Deserialize<ProblemDetails>(responseContent, _jsonSerializerOptions);

        personSearchResponse.Should().NotBeNull();
        personSearchResponse?.Title.Should().BeEquivalentTo("Too many requests");
        personSearchResponse?.Detail.Should().BeEquivalentTo("Too many requests to the register");
        personSearchResponse?.Status.Should().Be(StatusCodes.Status429TooManyRequests);
    }

    [Fact]
    public async Task Post_PersonSearch_Other_PlatformException_Returned_Correctly()
    {
        HttpClient client = GetHttpClient();

        var sendAsyncCalled = false;
        SendAsync = message =>
        {
            message.RequestUri!.PathAndQuery.Should().Be($"/register/api/v1/persons");
            sendAsyncCalled = true;

            var response = new HttpResponseMessage(HttpStatusCode.InternalServerError);
            throw new PlatformHttpException(response, "Error");
        };

        using var requestContent = new StringContent(
            """{"SocialSecurityNumber": "12345678901", "LastName": "Normann"}""",
            System.Text.Encoding.UTF8,
            "application/json"
        );

        HttpResponseMessage response = await client.PostAsync($"{Org}/{App}/api/v1/lookup/person", requestContent);

        sendAsyncCalled.Should().BeTrue();
        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);

        string responseContent = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(responseContent);
        var personSearchResponse = JsonSerializer.Deserialize<ProblemDetails>(responseContent, _jsonSerializerOptions);

        personSearchResponse.Should().NotBeNull();
        personSearchResponse?.Title.Should().BeEquivalentTo("Error when calling register");
        personSearchResponse?.Detail.Should().BeEquivalentTo("Error");
        personSearchResponse?.Status.Should().Be(StatusCodes.Status500InternalServerError);
    }

    [Fact]
    public async Task Post_PersonSearch_General_Exception_Returned_Correctly()
    {
        HttpClient client = GetHttpClient();

        var sendAsyncCalled = false;
        SendAsync = message =>
        {
            message.RequestUri!.PathAndQuery.Should().Be($"/register/api/v1/persons");
            sendAsyncCalled = true;

            throw new Exception("General error");
        };

        using var requestContent = new StringContent(
            """{"SocialSecurityNumber": "12345678901", "LastName": "Normann"}""",
            System.Text.Encoding.UTF8,
            "application/json"
        );

        HttpResponseMessage response = await client.PostAsync($"{Org}/{App}/api/v1/lookup/person", requestContent);

        sendAsyncCalled.Should().BeTrue();
        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);

        string responseContent = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(responseContent);
        var personSearchResponse = JsonSerializer.Deserialize<ProblemDetails>(responseContent, _jsonSerializerOptions);

        personSearchResponse.Should().NotBeNull();
        personSearchResponse?.Title.Should().BeEquivalentTo("Error when calling the Person Register");
        personSearchResponse
            ?.Detail.Should()
            .BeEquivalentTo("Something went wrong when calling the Person Register API.");
        personSearchResponse?.Status.Should().Be(StatusCodes.Status500InternalServerError);
    }

    private HttpClient GetHttpClient()
    {
        HttpClient client = GetRootedClient(Org, App);
        string token = TestAuthentication.GetUserToken(1337);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);
        return client;
    }
}
