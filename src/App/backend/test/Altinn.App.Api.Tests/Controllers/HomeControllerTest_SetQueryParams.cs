using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Mocks.Services;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class HomeControllerTest_SetQueryParams : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "tdd";
    private const string App = "contributer-restriction";

    // Define mocks
    private readonly Mock<IAppResources> _appResourcesMock = new(MockBehavior.Strict);
    private readonly Mock<IPDP> _pdpMock = new(MockBehavior.Strict);

    // Constructor with common setup
    public HomeControllerTest_SetQueryParams(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper)
    {
        OverrideServicesForAllTests = (services) =>
        {
            services.AddSingleton(_appResourcesMock.Object);
            services.AddSingleton(_pdpMock.Object);
        };
    }

    [Fact]
    public async Task Ensure_bad_request_when_invalid_query_params()
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(
                new AppMetadataMutationHook(appMetadata =>
                {
                    appMetadata.OnEntry = new OnEntry() { Show = "stateless" };
                })
            );
        };
        _appResourcesMock.Setup(ar => ar.GetPrefillJson(It.IsAny<string>())).Returns((string?)null);

        using var client = GetRootedClient(Org, App);
        var response = await client.GetAsync($"{Org}/{App}/set-query-params?thing=thang");

        var responseString = await response.Content.ReadAsStringAsync();

        OutputHelper.WriteLine(responseString);
        OutputHelper.WriteLine(response.Headers.ToString());

        Assert.Contains("Found no valid query params.", responseString);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Ensure_bad_request_when_not_stateless()
    {
        using var client = GetRootedClient(Org, App);
        var response = await client.GetAsync($"{Org}/{App}/set-query-params");
        var responseString = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(responseString);
        OutputHelper.WriteLine(response.Headers.ToString());
        Assert.Contains("You can only use query params with a stateless task", responseString);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Ensure_bad_request_when_no_query_params()
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(
                new AppMetadataMutationHook(appMetadata =>
                {
                    appMetadata.OnEntry = new OnEntry() { Show = "stateless" };
                })
            );
        };
        _appResourcesMock.Setup(ar => ar.GetPrefillJson(It.IsAny<string>())).Returns((string?)null);

        using var client = GetRootedClient(Org, App);
        var response = await client.GetAsync($"{Org}/{App}/set-query-params");
        var responseString = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(responseString);
        OutputHelper.WriteLine(response.Headers.ToString());
        Assert.Contains("Found no valid query params.", responseString);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Ensure_ok_request_when_query_params_are_valid()
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(
                new AppMetadataMutationHook(appMetadata =>
                {
                    appMetadata.OnEntry = new OnEntry() { Show = "stateless" };
                    var mockDataType = new DataType();
                    mockDataType.Id = "my-data-type";
                    appMetadata.DataTypes = new List<DataType> { mockDataType };
                })
            );
        };
        _appResourcesMock
            .Setup(ar => ar.GetPrefillJson("my-data-type"))
            .Returns("{\"QueryParameters\":{\"thing\":\"some.Field\"}}");

        using var client = GetRootedClient(Org, App);
        var response = await client.GetAsync($"{Org}/{App}/set-query-params?thing=whatever");
        var responseString = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(responseString);
        OutputHelper.WriteLine(response.Headers.ToString());
        await Verify(responseString).ScrubLinesContaining("<script nonce=");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Ensure_only_one_content_security_policy()
    {
        var prefillValidatorMock = new Mock<IValidateQueryParamPrefill>();
        prefillValidatorMock
            .Setup(p => p.PrefillFromQueryParamsIsValid(It.IsAny<Dictionary<string, string>>()))
            .ReturnsAsync((ValidationIssue?)null);
        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(prefillValidatorMock.Object);
            services.AddSingleton(
                new AppMetadataMutationHook(appMetadata =>
                {
                    appMetadata.OnEntry = new OnEntry() { Show = "stateless" };
                    var mockDataType = new DataType();
                    mockDataType.Id = "my-data-type";
                    appMetadata.DataTypes = new List<DataType> { mockDataType };
                })
            );
        };
        _appResourcesMock
            .Setup(ar => ar.GetPrefillJson("my-data-type"))
            .Returns("{\"QueryParameters\":{\"thing\":\"some.Field\"}}");

        using var client = GetRootedClient(Org, App);
        var response = await client.GetAsync(
            $"{Org}/{App}/set-query-params?thing={WebUtility.UrlEncode("</script><script>alert('XSS')</script>")}&other=IgnoreOther"
        );
        var responseString = await response.Content.ReadAsStringAsync();
        await Verify(responseString).ScrubLinesContaining("<script nonce=");
        OutputHelper.WriteLine(responseString);
        OutputHelper.WriteLine(response.Headers.ToString());
        var cspHeaderCount = response.Headers.Count(h => h.Key == "Content-Security-Policy");
        // Expected only one Content-Security-Policy header, when we add global csp header, we must replace the custom one for set-query-params
        Assert.Equal(1, cspHeaderCount);
    }

    public class MyDataType
    {
        [JsonPropertyName("some")]
        public SomeClass? Some { get; set; }

        public class SomeClass
        {
            [JsonPropertyName("field")]
            public string? Field { get; set; }
        }
    }

    [Fact]
    public async Task SetQueryParms_ReturnBadRequestWhenValidationFails()
    {
        var prefillValidatorMock = new Mock<IValidateQueryParamPrefill>();
        prefillValidatorMock
            .Setup(p => p.PrefillFromQueryParamsIsValid(It.IsAny<Dictionary<string, string>>()))
            .ReturnsAsync(
                new ValidationIssue()
                {
                    Severity = ValidationIssueSeverity.Error,
                    Description = "Custom Validation failed",
                }
            );
        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(prefillValidatorMock.Object);
            services.AddSingleton(
                new AppMetadataMutationHook(appMetadata =>
                {
                    appMetadata.OnEntry = new OnEntry() { Show = "stateless" };
                    var mockDataType = new DataType();
                    mockDataType.Id = "my-data-type";
                    appMetadata.DataTypes = new List<DataType> { mockDataType };
                })
            );
        };
        _appResourcesMock
            .Setup(ar => ar.GetPrefillJson("my-data-type"))
            .Returns("{\"QueryParameters\":{\"thing\":\"some.Field\"}}");
        _appResourcesMock
            .Setup(ar => ar.GetClassRefForLogicDataType("my-data-type"))
            .Returns(typeof(MyDataType).FullName!);

        using var client = GetRootedUserClient(Org, App);
        var response = await client.GetAsync(
            $"{Org}/{App}/set-query-params?thing={WebUtility.UrlEncode("</script><script>alert('XSS')</script>")}&other=IgnoreOther"
        );

        var responseString = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(responseString);

        // Should probably parse out the json from the response, but this is easier
        var prefillJson =
            """[{"dataModelName":"my-data-type","appId":"tdd/contributer-restriction","prefillFields":{"some.Field":"\u003C/script\u003E\u003Cscript\u003Ealert(\u0027XSS\u0027)\u003C/script\u003E"}}]""";
        Assert.Contains(prefillJson, responseString);

        using var jsonDocument = JsonDocument.Parse(prefillJson);
        var prefillObject = jsonDocument.RootElement.EnumerateArray().First();
        var prefill = prefillObject.GetProperty("prefillFields");

        var statelessUrl =
            $"{Org}/{App}/v1/data?prefill={WebUtility.UrlEncode(prefill.ToString())}&dataType=my-data-type";
        OutputHelper.WriteLine(statelessUrl);
        var statelessResponse = await client.GetAsync(statelessUrl);

        var statelessResponseString = await statelessResponse.Content.ReadAsStringAsync();

        await Verify(statelessResponse + "\n" + statelessResponseString);

        Assert.Equal(HttpStatusCode.BadRequest, statelessResponse.StatusCode);
    }

    [Fact]
    public async Task ReturnsMappedModelWhenValidationSucceds()
    {
        var prefillValidatorMock = new Mock<IValidateQueryParamPrefill>();
        prefillValidatorMock
            .Setup(p => p.PrefillFromQueryParamsIsValid(It.IsAny<Dictionary<string, string>>()))
            .ReturnsAsync((ValidationIssue?)null);

        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(prefillValidatorMock.Object);
            services.AddSingleton(
                new AppMetadataMutationHook(appMetadata =>
                {
                    appMetadata.OnEntry = new OnEntry() { Show = "stateless" };
                    var mockDataType = new DataType();
                    mockDataType.Id = "my-data-type";
                    appMetadata.DataTypes = new List<DataType> { mockDataType };
                })
            );
        };

        _pdpMock
            .Setup(pdp => pdp.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(
                new XacmlJsonResponse()
                {
                    Response = new List<XacmlJsonResult>()
                    {
                        new XacmlJsonResult() { Decision = XacmlContextDecision.Permit.ToString() },
                    },
                }
            );

        _appResourcesMock
            .Setup(ar => ar.GetPrefillJson("my-data-type"))
            .Returns("{\"QueryParameters\":{\"thing\":\"some.Field\"}}");
        _appResourcesMock
            .Setup(ar => ar.GetClassRefForLogicDataType("my-data-type"))
            .Returns(typeof(MyDataType).FullName!);

        using var client = GetRootedUserClient(Org, App);
        var response = await client.GetAsync(
            $"{Org}/{App}/set-query-params?thing={WebUtility.UrlEncode("</script><script>alert('XSS')</script>")}&other=IgnoreOther"
        );

        var responseString = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(responseString);

        // Should probably parse out the json from the response, but this is easier
        var prefillJson =
            """[{"dataModelName":"my-data-type","appId":"tdd/contributer-restriction","prefillFields":{"some.Field":"\u003C/script\u003E\u003Cscript\u003Ealert(\u0027XSS\u0027)\u003C/script\u003E"}}]""";
        Assert.Contains(prefillJson, responseString);

        using var jsonDocument = JsonDocument.Parse(prefillJson);
        var prefillObject = jsonDocument.RootElement.EnumerateArray().First();
        var prefill = prefillObject.GetProperty("prefillFields");

        var statelessUrl =
            $"{Org}/{App}/v1/data?prefill={WebUtility.UrlEncode(prefill.ToString())}&dataType=my-data-type";
        OutputHelper.WriteLine(statelessUrl);
        using var statelessRequest = new HttpRequestMessage(HttpMethod.Get, statelessUrl)
        {
            Headers = { { "party", "partyId:500600" } },
        };
        var statelessResponse = await client.SendAsync(statelessRequest);

        var statelessResponseString = await statelessResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(statelessRequest.ToString());

        await Verify(statelessResponse + "\n" + statelessResponseString);

        Assert.Equal(HttpStatusCode.OK, statelessResponse.StatusCode);
    }
}
