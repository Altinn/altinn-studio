using System.Net;
using System.Net.Http.Headers;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Api.Models;
using Altinn.App.Core.Constants;
using Altinn.Platform.Register.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class LookupOrganisationControllerTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
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

    public LookupOrganisationControllerTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper) { }

    [Fact]
    public async Task Get_LookupOrganisation_WithValidOrgNr_Returns_LookupOrganisationResponse()
    {
        HttpClient client = GetHttpClient();
        var orgNr = "123456789";
        var orgName = "Test Company AS";

        var sendAsyncCalled = false;
        SendAsync = async message =>
        {
            message.RequestUri!.PathAndQuery.Should().Be($"/register/api/v1/organizations/{orgNr}");

            OutputHelper.WriteLine("ER client query string:");
            OutputHelper.WriteLine("Path: " + message.RequestUri.PathAndQuery);

            sendAsyncCalled = true;
            var organisation = new Organization
            {
                Name = orgName,
                OrgNumber = orgNr,
                BusinessAddress = "Test Street 1, 1234 Test City",
                MailingAddress = "Test Street 1, 1234 Test City",
                BusinessPostalCode = "1234",
                BusinessPostalCity = "Test City",
                EMailAddress = "test@company.no",
                FaxNumber = "12345678",
                InternetAddress = "www.company.no",
                MailingPostalCity = "Test City",
                MailingPostalCode = "1234",
                MobileNumber = "12345678",
                TelephoneNumber = "12345678",
                UnitStatus = "Active",
                UnitType = "AS",
            };

            string orgJson = JsonSerializer.Serialize(organisation, _jsonSerializerOptions);
            var responseContent = new StringContent(orgJson);

            var response = new HttpResponseMessage(HttpStatusCode.OK) { Content = responseContent };

            return await Task.FromResult(response);
        };

        HttpResponseMessage response = await client.GetAsync($"{Org}/{App}/api/v1/lookup/organisation/{orgNr}");

        sendAsyncCalled.Should().BeTrue();
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        string responseContent = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(responseContent);
        var orgLookupResponse = JsonSerializer.Deserialize<LookupOrganisationResponse>(
            responseContent,
            _jsonSerializerOptions
        );

        orgLookupResponse.Should().NotBeNull();
        orgLookupResponse?.Success.Should().BeTrue();
        orgLookupResponse?.OrganisationDetails.Should().NotBeNull();
        orgLookupResponse?.OrganisationDetails?.OrgNr.Should().Be(orgNr);
        orgLookupResponse?.OrganisationDetails?.Name.Should().Be(orgName);
    }

    [Fact]
    public async Task Get_LookupOrganisation_NotFound_Returned_Correctly()
    {
        HttpClient client = GetHttpClient();

        var orgNr = "123456789";

        var sendAsyncCalled = false;
        SendAsync = async message =>
        {
            message.RequestUri!.PathAndQuery.Should().Be($"/register/api/v1/organizations/{orgNr}");
            sendAsyncCalled = true;
            var response = new HttpResponseMessage(HttpStatusCode.NotFound);
            return await Task.FromResult(response);
        };

        HttpResponseMessage response = await client.GetAsync($"{Org}/{App}/api/v1/lookup/organisation/{orgNr}");

        sendAsyncCalled.Should().BeTrue();
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        string responseContent = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(responseContent);
        var orgLookupResponse = JsonSerializer.Deserialize<LookupOrganisationResponse>(
            responseContent,
            _jsonSerializerOptions
        );

        orgLookupResponse.Should().NotBeNull();
        orgLookupResponse?.Success.Should().BeFalse();
        orgLookupResponse?.OrganisationDetails.Should().BeNull();
    }

    [Fact]
    public async Task Post_LookupOrganisation_General_Exception_Returned_Correctly()
    {
        HttpClient client = GetHttpClient();
        var orgNr = "123456789";

        var sendAsyncCalled = false;
        SendAsync = message =>
        {
            message.RequestUri!.PathAndQuery.Should().Be($"/register/api/v1/organizations/{orgNr}");
            sendAsyncCalled = true;

            throw new Exception("General error");
        };

        HttpResponseMessage response = await client.GetAsync($"{Org}/{App}/api/v1/lookup/organisation/{orgNr}");

        sendAsyncCalled.Should().BeTrue();
        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);

        string responseContent = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(responseContent);
        var personSearchResponse = JsonSerializer.Deserialize<ProblemDetails>(responseContent, _jsonSerializerOptions);

        personSearchResponse.Should().NotBeNull();
        personSearchResponse?.Title.Should().BeEquivalentTo("Error when calling register");
        personSearchResponse
            ?.Detail.Should()
            .BeEquivalentTo("Something went wrong when calling the Organisation Register API.");
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
