using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OptionsController;

public class GetTests : DisagnerEndpointsTestsBase<GetTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public GetTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Theory]
    [InlineData("ttd", "app-with-layoutsets", "test-options")]
    public async Task Get_Returns_OptionsList(string org, string repo, string optionsListId)
    {
        var expectedOptionsList = new List<Dictionary<string, string>>
        {
            new() { { "label", "label1" }, { "value", "value1" } },
            new() { { "label", "label2" }, { "value", "value2" } }
        };

        string apiUrl = $"/designer/api/{org}/{repo}/options/{optionsListId}";
        HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, apiUrl);

        HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        response.EnsureSuccessStatusCode();

        string responseBody = await response.Content.ReadAsStringAsync();
        var responseList = JsonSerializer.Deserialize<List<Dictionary<string, string>>>(responseBody);

        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal(expectedOptionsList, responseList);
    }
}
