#nullable disable
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OptionsController;

public class UpdateOptionsTests : DesignerEndpointsTestsBase<UpdateOptionsTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public UpdateOptionsTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    private const string Org = "ttd";
    private const string Developer = "testUser";

    [Fact]
    public async Task Put_Returns_200OK_When_Creating_New_OptionsList()
    {
        // Arrange
        const string Repo = "empty-app";
        const string OptionsListId = "new-options";

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, Repo, Developer, targetRepository);

        string optionsJson = @"[
            { ""label"": ""label1"", ""value"": ""value1"" },
            { ""label"": ""label2"", ""value"": ""value2"" }
        ]";
        List<Option> expectedOptionList = JsonSerializer.Deserialize<List<Option>>(optionsJson);

        string apiUrl = $"/designer/api/{Org}/{targetRepository}/options/{OptionsListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);
        httpRequestMessage.Content = new StringContent(optionsJson, Encoding.UTF8, "application/json");

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        var responseList = JsonSerializer.Deserialize<List<Option>>(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal(expectedOptionList.Count, responseList.Count);

        for (int i = 0; i < responseList.Count; i++)
        {
            Assert.Equal(expectedOptionList[i].Label, responseList[i].Label);
            Assert.Equal(expectedOptionList[i].Value, responseList[i].Value);
            Assert.Equal(expectedOptionList[i].Description, responseList[i].Description);
            Assert.Equal(expectedOptionList[i].HelpText, responseList[i].HelpText);
        }
    }

    [Fact]
    public async Task Put_Returns_200OK_When_Option_Values_Are_Bool_String_Numbers()
    {
        string repo = "app-with-options";
        string optionsListId = "test-options";
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, repo, Developer, targetRepository);

        string apiUrl = $"/designer/api/{Org}/{targetRepository}/options/{optionsListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);

        var stringBoolNumbersOptionsList = @"[
            { ""label"": ""StringValue"", ""value"": ""value"" },
            { ""label"": ""BoolValue"", ""value"": true },
            { ""label"": ""NumberValue"", ""value"": 3.1415 },
            { ""label"": ""NumberValue"", ""value"": 1024 },
        ]";
        httpRequestMessage.Content = new StringContent(stringBoolNumbersOptionsList, Encoding.UTF8, "application/json");

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
    }

    [Fact]
    public async Task Put_Returns_200OK_When_Option_Value_And_Label_Are_Empty_Strings()
    {
        string repo = "app-with-options";
        string optionsListId = "test-options";
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, repo, Developer, targetRepository);

        string apiUrl = $"/designer/api/{Org}/{targetRepository}/options/{optionsListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);

        var emptyStringsValueAndLabelOptionsList = @"[
            { ""label"": """", ""value"": """" },
        ]";
        httpRequestMessage.Content = new StringContent(emptyStringsValueAndLabelOptionsList, Encoding.UTF8, "application/json");

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
    }

    [Fact]
    public async Task Put_Returns_200OK_And_Overwrites_Existing_OptionsList()
    {
        // Arrange
        const string Repo = "app-with-options";
        const string OptionsListId = "test-options";

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, Repo, Developer, targetRepository);

        var newOptionsList = @"[
            { ""label"": ""aNewLabelThatDidNotExistBefore"", ""value"": ""aNewValueThatDidNotExistBefore"" },
            { ""label"": ""label2"", ""value"": ""value2"" }
        ]";
        List<Option> expectedOptionList = JsonSerializer.Deserialize<List<Option>>(newOptionsList);

        string apiUrl = $"/designer/api/{Org}/{targetRepository}/options/{OptionsListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);
        httpRequestMessage.Content = new StringContent(newOptionsList, Encoding.UTF8, "application/json");

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        var responseList = JsonSerializer.Deserialize<List<Option>>(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal(expectedOptionList.Count, responseList.Count);

        for (int i = 0; i < expectedOptionList.Count; i++)
        {
            Assert.Equal(expectedOptionList[i].Label, responseList[i].Label);
            Assert.Equal(expectedOptionList[i].Value, responseList[i].Value);
            Assert.Equal(expectedOptionList[i].Description, responseList[i].Description);
            Assert.Equal(expectedOptionList[i].HelpText, responseList[i].HelpText);
        }
    }

    [Fact]
    public async Task Put_Returns_400BadRequest_When_Options_Is_Empty()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, "empty-app", Developer, targetRepository);

        string apiUrl = $"/designer/api/{Org}/{targetRepository}/options/empty-options";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);


        httpRequestMessage.Content = new StringContent("null", Encoding.UTF8, "application/json");

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        var responseContent = await response.Content.ReadAsStringAsync();
        var responseObject = JsonSerializer.Deserialize<JsonElement>(responseContent);

        // Assert
        Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
        Assert.True(responseObject.TryGetProperty("errors", out JsonElement errors));
        Assert.True(errors.TryGetProperty("", out JsonElement labelErrors));
        Assert.Contains("A non-empty request body is required.", labelErrors[0].GetString());
    }

    [Fact]
    public async Task Put_Returns_400BadRequest_When_Option_Value_Is_Invalid()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, "empty-app", Developer, targetRepository);

        string apiUrl = $"/designer/api/{Org}/{targetRepository}/options/option-invalid-value";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);

        string optionsInvalidValue = @"[
            { ""value"": {}, ""label"": ""label2"" },
        ]";

        httpRequestMessage.Content = new StringContent(optionsInvalidValue, Encoding.UTF8, "application/json");

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        var problemDetails = JsonSerializer.Deserialize<ProblemDetails>(await response.Content.ReadAsStringAsync());

        // Assert
        Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);

        Assert.NotNull(problemDetails);
        JsonElement errorCode = (JsonElement)problemDetails.Extensions[ProblemDetailsExtensionsCodes.ErrorCode];
        Assert.Equal("InvalidOptionsFormat", errorCode.ToString());
    }

    [Fact]
    public async Task Put_Returns_400BadRequest_When_Options_Has_Missing_Required_Fields()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, "empty-app", Developer, targetRepository);

        string apiUrl = $"/designer/api/{Org}/{targetRepository}/options/options-missing-fields";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);

        string optionsWithMissingFields = @"[
            { ""value"": ""value1"" },
            { ""label"": ""label2"" },
            { ""value"": null, ""label"": null },
        ]";
        httpRequestMessage.Content = new StringContent(optionsWithMissingFields, Encoding.UTF8, "application/json");

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        var responseContent = await response.Content.ReadAsStringAsync();
        var responseObject = JsonSerializer.Deserialize<JsonElement>(responseContent);

        // Assert
        Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
        Assert.True(responseObject.TryGetProperty("errors", out JsonElement errors));

        Assert.True(errors.TryGetProperty("[0].Label", out JsonElement labelErrors));
        Assert.Contains("The field is required.", labelErrors[0].GetString());

        Assert.True(errors.TryGetProperty("[1].Value", out JsonElement valueErrors));
        Assert.Contains("The field is required.", valueErrors[0].GetString());

        Assert.True(errors.TryGetProperty("[2].Value", out JsonElement valueNullErrors));
        Assert.Contains("The field is required.", valueNullErrors[0].GetString());
        Assert.True(errors.TryGetProperty("[2].Label", out JsonElement labelNullErrors));
        Assert.Contains("The field is required.", labelNullErrors[0].GetString());
    }
}
