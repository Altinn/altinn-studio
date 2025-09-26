using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Altinn.App.Api.Models;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Core.Constants;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class DataTagsControllerTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
    : ApiTestBase(factory, outputHelper),
        IClassFixture<WebApplicationFactory<Program>>
{
    readonly string _org = "tdd";
    readonly string _app = "contributer-restriction";
    readonly int _instanceOwnerPartyId = 500600;
    readonly Guid _instanceGuid = new("fad57e80-ec2f-4dee-90ac-400fa6d7720f");
    readonly Guid _dataGuid = new("3b46b9ef-774c-4849-b4dd-66ef871f5b07");

    #region GET endpoint tests

    [Fact]
    public async Task GetTags_ValidRequest_ReturnsOkWithTagsList()
    {
        // Arrange
        HttpClient client = GetRootedClient(_org, _app);
        string token = TestAuthentication.GetUserToken(1337, _instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        TestData.PrepareInstance(_org, _app, _instanceOwnerPartyId, _instanceGuid);

        // Act
        var response = await client.GetAsync(
            $"/{_org}/{_app}/instances/{_instanceOwnerPartyId}/{_instanceGuid}/data/{_dataGuid}/tags"
        );

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var responseContent = await response.Content.ReadAsStringAsync();
        var tagsList = JsonSerializer.Deserialize<TagsList>(
            responseContent,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
        );

        tagsList.Should().NotBeNull();
        tagsList.Tags.Should().NotBeNull();
        tagsList.Tags.Count.Should().Be(1);
        tagsList.Tags.Should().Contain("Tag1");
    }

    [Fact]
    public async Task GetTags_DataElementNotFound_ReturnsNotFound()
    {
        // Arrange
        Guid nonExistentDataGuid = new("99999999-9999-9999-9999-999999999999");

        HttpClient client = GetRootedClient(_org, _app);
        string token = TestAuthentication.GetUserToken(1337, _instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        TestData.PrepareInstance(_org, _app, _instanceOwnerPartyId, _instanceGuid);

        // Act
        var response = await client.GetAsync(
            $"/{_org}/{_app}/instances/{_instanceOwnerPartyId}/{_instanceGuid}/data/{nonExistentDataGuid}/tags"
        );

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var responseContent = await response.Content.ReadAsStringAsync();
        responseContent.Should().Contain("Unable to find data element");
    }

    #endregion

    #region POST endpoint tests

    [Fact]
    public async Task AddTag_ValidTag_ReturnsCreatedWithTagsList()
    {
        // Arrange
        HttpClient client = GetRootedClient(_org, _app);
        string token = TestAuthentication.GetUserToken(1337, _instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        TestData.PrepareInstance(_org, _app, _instanceOwnerPartyId, _instanceGuid);

        string newTag = "newValidTag";
        var json = JsonSerializer.Serialize(newTag);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await client.PostAsync(
            $"/{_org}/{_app}/instances/{_instanceOwnerPartyId}/{_instanceGuid}/data/{_dataGuid}/tags",
            content
        );

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var responseContent = await response.Content.ReadAsStringAsync();
        var tagsList = JsonSerializer.Deserialize<TagsList>(
            responseContent,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
        );

        tagsList.Should().NotBeNull();
        tagsList.Tags.Count.Should().Be(2);
        tagsList.Tags.Should().Contain("Tag1"); // pre-existing tag
        tagsList.Tags.Should().Contain(newTag); // new tag

        // Verify Location header is set
        response.Headers.Location.Should().NotBeNull();
    }

    [Theory]
    [InlineData("123")]
    [InlineData("tag@")]
    [InlineData("tag with spaces")]
    [InlineData("tag!")]
    [InlineData("")]
    [InlineData(null)]
    public async Task AddTag_InvalidTagFormat_ReturnsBadRequest(string? invalidTag)
    {
        // Arrange
        HttpClient client = GetRootedClient(_org, _app);
        string token = TestAuthentication.GetUserToken(1337, _instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        TestData.PrepareInstance(_org, _app, _instanceOwnerPartyId, _instanceGuid);

        var json = JsonSerializer.Serialize(invalidTag);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await client.PostAsync(
            $"/{_org}/{_app}/instances/{_instanceOwnerPartyId}/{_instanceGuid}/data/{_dataGuid}/tags",
            content
        );

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var responseContent = await response.Content.ReadAsStringAsync();
        var problemDetails = JsonSerializer.Deserialize<ProblemDetails>(
            responseContent,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
        );

        problemDetails.Should().NotBeNull();
        problemDetails.Status.Should().Be(400);
    }

    [Fact]
    public async Task AddTag_DuplicateTag_ReturnsCreatedWithoutDuplicate()
    {
        // Arrange
        HttpClient client = GetRootedClient(_org, _app);
        string token = TestAuthentication.GetUserToken(1337, _instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        TestData.PrepareInstance(_org, _app, _instanceOwnerPartyId, _instanceGuid);

        string duplicateTag = "duplicateTag";

        // First, add the tag
        var json = JsonSerializer.Serialize(duplicateTag);
        using var content1 = new StringContent(json, Encoding.UTF8, "application/json");
        await client.PostAsync(
            $"/{_org}/{_app}/instances/{_instanceOwnerPartyId}/{_instanceGuid}/data/{_dataGuid}/tags",
            content1
        );

        // Now try to add the same tag again
        using var content2 = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await client.PostAsync(
            $"/{_org}/{_app}/instances/{_instanceOwnerPartyId}/{_instanceGuid}/data/{_dataGuid}/tags",
            content2
        );

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var responseContent = await response.Content.ReadAsStringAsync();
        var tagsList = JsonSerializer.Deserialize<TagsList>(
            responseContent,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
        );

        tagsList.Should().NotBeNull();
        tagsList.Tags.Count.Should().Be(2);
        tagsList.Tags.Should().Contain("Tag1"); // pre-existing tag
        tagsList.Tags.Count(t => t == duplicateTag).Should().Be(1, "duplicate tags should not be added");
    }

    [Fact]
    public async Task AddTag_DataElementNotFound_ReturnsNotFound()
    {
        // Arrange
        Guid nonExistentDataGuid = new("99999999-9999-9999-9999-999999999999");

        HttpClient client = GetRootedClient(_org, _app);
        string token = TestAuthentication.GetUserToken(1337, _instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        TestData.PrepareInstance(_org, _app, _instanceOwnerPartyId, _instanceGuid);

        string validTag = "validTag";
        var json = JsonSerializer.Serialize(validTag);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await client.PostAsync(
            $"/{_org}/{_app}/instances/{_instanceOwnerPartyId}/{_instanceGuid}/data/{nonExistentDataGuid}/tags",
            content
        );

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var responseContent = await response.Content.ReadAsStringAsync();
        responseContent.Should().Contain("Unable to find data element");
    }

    #endregion

    #region DELETE endpoint tests

    [Fact]
    public async Task DeleteTag_ExistingTag_ReturnsNoContent()
    {
        // Arrange
        HttpClient client = GetRootedClient(_org, _app);
        string token = TestAuthentication.GetUserToken(1337, _instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        TestData.PrepareInstance(_org, _app, _instanceOwnerPartyId, _instanceGuid);

        string preExistingTag = "Tag1";

        // Act - Delete the tag
        var response = await client.DeleteAsync(
            $"/{_org}/{_app}/instances/{_instanceOwnerPartyId}/{_instanceGuid}/data/{_dataGuid}/tags/{preExistingTag}"
        );

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Verify the tag was actually removed by checking the tags list
        var getResponse = await client.GetAsync(
            $"/{_org}/{_app}/instances/{_instanceOwnerPartyId}/{_instanceGuid}/data/{_dataGuid}/tags"
        );
        var getContent = await getResponse.Content.ReadAsStringAsync();
        var tagsList = JsonSerializer.Deserialize<TagsList>(
            getContent,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
        );

        tagsList.Should().NotBeNull();
        tagsList.Tags.Count.Should().Be(0);
    }

    [Fact]
    public async Task DeleteTag_NonExistentTag_ReturnsNoContent()
    {
        // Arrange
        HttpClient client = GetRootedClient(_org, _app);
        string token = TestAuthentication.GetUserToken(1337, _instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        TestData.PrepareInstance(_org, _app, _instanceOwnerPartyId, _instanceGuid);

        string nonExistentTag = "nonExistentTag";

        // Act
        var response = await client.DeleteAsync(
            $"/{_org}/{_app}/instances/{_instanceOwnerPartyId}/{_instanceGuid}/data/{_dataGuid}/tags/{nonExistentTag}"
        );

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task DeleteTag_DataElementNotFound_ReturnsNotFound()
    {
        // Arrange
        Guid nonExistentDataGuid = new("99999999-9999-9999-9999-999999999999");

        HttpClient client = GetRootedClient(_org, _app);
        string token = TestAuthentication.GetUserToken(1337, _instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        TestData.PrepareInstance(_org, _app, _instanceOwnerPartyId, _instanceGuid);

        string tagToDelete = "tagToDelete";

        // Act
        var response = await client.DeleteAsync(
            $"/{_org}/{_app}/instances/{_instanceOwnerPartyId}/{_instanceGuid}/data/{nonExistentDataGuid}/tags/{tagToDelete}"
        );

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var responseContent = await response.Content.ReadAsStringAsync();
        responseContent.Should().Contain("Unable to find data element");
    }

    #endregion

    #region PUT endpoint tests

    [Fact]
    public async Task SetTags_ValidRequest_ReturnsOkWithTags()
    {
        // Arrange
        HttpClient client = GetRootedClient(_org, _app);
        string token = TestAuthentication.GetUserToken(1337, _instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        TestData.PrepareInstance(_org, _app, _instanceOwnerPartyId, _instanceGuid);

        var setTagsRequest = new SetTagsRequest { Tags = ["tagA", "tagB", "tagC"] };

        var json = JsonSerializer.Serialize(setTagsRequest);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await client.PutAsync(
            $"/{_org}/{_app}/instances/{_instanceOwnerPartyId}/{_instanceGuid}/data/{_dataGuid}/tags",
            content
        );

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var responseContent = await response.Content.ReadAsStringAsync();
        var setTagsResponse = JsonSerializer.Deserialize<SetTagsResponse>(
            responseContent,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
        );

        setTagsResponse.Should().NotBeNull();
        setTagsResponse.Tags.Should().BeEquivalentTo(["tagA", "tagB", "tagC"]);
        setTagsResponse.ValidationIssues.Should().BeNull();
    }

    [Fact]
    public async Task SetTags_EmptyTagsList_ClearsAllTags()
    {
        // Arrange
        HttpClient client = GetRootedClient(_org, _app);
        string token = TestAuthentication.GetUserToken(1337, _instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        TestData.PrepareInstance(_org, _app, _instanceOwnerPartyId, _instanceGuid);

        var setTagsRequest = new SetTagsRequest { Tags = [] };

        var json = JsonSerializer.Serialize(setTagsRequest);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await client.PutAsync(
            $"/{_org}/{_app}/instances/{_instanceOwnerPartyId}/{_instanceGuid}/data/{_dataGuid}/tags",
            content
        );

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var responseContent = await response.Content.ReadAsStringAsync();
        var setTagsResponse = JsonSerializer.Deserialize<SetTagsResponse>(
            responseContent,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
        );

        setTagsResponse.Should().NotBeNull();
        setTagsResponse.Tags.Should().BeEmpty();
    }

    [Theory]
    [InlineData("123")]
    [InlineData("tag@")]
    [InlineData("tag with spaces")]
    [InlineData("tag!")]
    public async Task SetTags_InvalidTagFormat_ReturnsBadRequest(string invalidTag)
    {
        // Arrange
        HttpClient client = GetRootedClient(_org, _app);
        string token = TestAuthentication.GetUserToken(1337, _instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        TestData.PrepareInstance(_org, _app, _instanceOwnerPartyId, _instanceGuid);

        var setTagsRequest = new SetTagsRequest { Tags = ["validTag", invalidTag] };

        var json = JsonSerializer.Serialize(setTagsRequest);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await client.PutAsync(
            $"/{_org}/{_app}/instances/{_instanceOwnerPartyId}/{_instanceGuid}/data/{_dataGuid}/tags",
            content
        );

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var responseContent = await response.Content.ReadAsStringAsync();
        var problemDetails = JsonSerializer.Deserialize<ProblemDetails>(
            responseContent,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
        );

        problemDetails.Should().NotBeNull();
        problemDetails.Title.Should().Be("Invalid tag name");
        problemDetails.Detail.Should().Contain("letters");
        problemDetails.Status.Should().Be(400);
    }

    [Fact]
    public async Task SetTags_DataElementNotFound_ReturnsNotFound()
    {
        // Arrange
        Guid nonExistentDataGuid = new("99999999-9999-9999-9999-999999999999"); // Non-existent data element

        HttpClient client = GetRootedClient(_org, _app);
        string token = TestAuthentication.GetUserToken(1337, _instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        TestData.PrepareInstance(_org, _app, _instanceOwnerPartyId, _instanceGuid);

        var setTagsRequest = new SetTagsRequest { Tags = ["tagA"] };

        var json = JsonSerializer.Serialize(setTagsRequest);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await client.PutAsync(
            $"/{_org}/{_app}/instances/{_instanceOwnerPartyId}/{_instanceGuid}/data/{nonExistentDataGuid}/tags",
            content
        );

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var responseContent = await response.Content.ReadAsStringAsync();
        responseContent.Should().Contain("Unable to find data element");
    }

    [Fact]
    public async Task SetTags_WithIgnoredValidatorsQueryParameter_ReturnsOkWithValidationIssues()
    {
        // Arrange
        HttpClient client = GetRootedClient(_org, _app);
        string token = TestAuthentication.GetUserToken(1337, _instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        TestData.PrepareInstance(_org, _app, _instanceOwnerPartyId, _instanceGuid);

        var setTagsRequest = new SetTagsRequest { Tags = ["tagA", "tagB"] };

        var json = JsonSerializer.Serialize(setTagsRequest);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await client.PutAsync(
            $"/{_org}/{_app}/instances/{_instanceOwnerPartyId}/{_instanceGuid}/data/{_dataGuid}/tags?ignoredValidators=Validator1,Validator2",
            content
        );

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var responseContent = await response.Content.ReadAsStringAsync();
        var setTagsResponse = JsonSerializer.Deserialize<SetTagsResponse>(
            responseContent,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
        );

        setTagsResponse.Should().NotBeNull();
        setTagsResponse.Tags.Should().BeEquivalentTo(["tagA", "tagB"]);
        setTagsResponse.ValidationIssues.Should().NotBeNull();
        setTagsResponse.ValidationIssues.Should().HaveCount(2);
        setTagsResponse
            .ValidationIssues.Should()
            .Contain(validationSourcePair => validationSourcePair.Source == "Expression");
        setTagsResponse
            .ValidationIssues.Should()
            .Contain(validationSourcePair => validationSourcePair.Source == "Required");
    }

    [Fact]
    public async Task SetTags_WithoutIgnoredValidatorsQueryParameter_ReturnsOkWithoutValidationIssues()
    {
        // Arrange
        HttpClient client = GetRootedClient(_org, _app);
        string token = TestAuthentication.GetUserToken(1337, _instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        TestData.PrepareInstance(_org, _app, _instanceOwnerPartyId, _instanceGuid);

        var setTagsRequest = new SetTagsRequest { Tags = ["tagA", "tagB"] };

        var json = JsonSerializer.Serialize(setTagsRequest);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await client.PutAsync(
            $"/{_org}/{_app}/instances/{_instanceOwnerPartyId}/{_instanceGuid}/data/{_dataGuid}/tags",
            content
        );

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var responseContent = await response.Content.ReadAsStringAsync();
        var setTagsResponse = JsonSerializer.Deserialize<SetTagsResponse>(
            responseContent,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
        );

        setTagsResponse.Should().NotBeNull();
        setTagsResponse.Tags.Should().BeEquivalentTo(["tagA", "tagB"]);
        setTagsResponse.ValidationIssues.Should().BeNull();
    }

    [Theory]
    [InlineData("valid-tag")]
    [InlineData("validTag")]
    [InlineData("valid_tag")]
    [InlineData("åæø")]
    [InlineData("TagWithÜmlaut")]
    public async Task SetTags_ValidTagFormats_ReturnsOk(string validTag)
    {
        // Arrange
        HttpClient client = GetRootedClient(_org, _app);
        string token = TestAuthentication.GetUserToken(1337, _instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        TestData.PrepareInstance(_org, _app, _instanceOwnerPartyId, _instanceGuid);

        var setTagsRequest = new SetTagsRequest { Tags = [validTag] };

        var json = JsonSerializer.Serialize(setTagsRequest);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await client.PutAsync(
            $"/{_org}/{_app}/instances/{_instanceOwnerPartyId}/{_instanceGuid}/data/{_dataGuid}/tags",
            content
        );

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var responseContent = await response.Content.ReadAsStringAsync();
        var setTagsResponse = JsonSerializer.Deserialize<SetTagsResponse>(
            responseContent,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
        );

        setTagsResponse.Should().NotBeNull();
        setTagsResponse.Tags.Should().Contain(validTag);
    }

    #endregion
}
