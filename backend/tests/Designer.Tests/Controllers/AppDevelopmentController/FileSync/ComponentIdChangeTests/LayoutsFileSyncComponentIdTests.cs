using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController.FileSync.ComponentIdChangeTests;

public class LayoutsFileSyncComponentIdTests : DisagnerEndpointsTestsBase<LayoutsFileSyncComponentIdTests>,
    IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/app-development/form-layout";

    private const string Org = "ttd";
    private const string App = "app-with-layoutsets";
    private const string Developer = "testUser";

    public LayoutsFileSyncComponentIdTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Theory]
    [InlineData("App/ui/group/layouts/repeating2.json", "layoutSet1", "sum-all", "aNewComponentId")]
    // The oldComponentId is present as a componentRef in the array of cells in rowsAfter in the original repeating group component in repeating2.json
    public async Task SaveFormLayoutWithComponentIdChanges_ShouldSyncRepeatingGroupOccurrenceInSameLayout(
        string pathToLayoutWithComponentIdOccurrenceInRepeatingGroup, string layoutSetName, string oldComponentId, string newComponentId)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);
        string layoutName = "testLayout";
        string jsonPayload = ArrangeApiRequestContent(pathToLayoutWithComponentIdOccurrenceInRepeatingGroup, oldComponentId, newComponentId);
        string url = $"{VersionPrefix(Org, targetRepository)}/{layoutName}?layoutSetName={layoutSetName}";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(jsonPayload, Encoding.UTF8, MediaTypeNames.Application.Json)
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        string layoutFromRepo = TestDataHelper.GetFileFromRepo(Org, targetRepository, Developer, $"App/ui/{layoutSetName}/layouts/{layoutName}.json");
        JsonNode layout = JsonNode.Parse(layoutFromRepo);
        JsonNode repeatingGroupComponent = layout["data"]["layout"]?.AsArray()?.FirstOrDefault(item => item["id"]?.ToString() == "mainGroup2");
        JsonArray rowsAfterArray = repeatingGroupComponent?["rowsAfter"]?.AsArray();

        bool containsOldId = rowsAfterArray
            ?.SelectMany(rowsAfter => rowsAfter["cells"]?.AsArray() ?? new JsonArray())
            .Any(cell => cell["component"]?.ToString() == oldComponentId) ?? false;

        bool containsNewId = rowsAfterArray
            ?.SelectMany(rowsAfter => rowsAfter["cells"]?.AsArray() ?? new JsonArray())
            .Any(cell => cell["component"]?.ToString() == newComponentId) ?? false;

        containsOldId.Should().BeFalse();
        containsNewId.Should().BeTrue();
    }

    [Theory]
    [InlineData("App/ui/group/layouts/repeating2.json", "layoutSet1", "sum-all", "aNewComponentId")]
    // The oldComponentId is present as a componentRef in the array of cells in rowsAfter in the original repeating group component in repeating2.json
    public async Task SaveFormLayoutWithComponentIdChanges_ShouldSyncRepeatingGroupOccurrenceInAnotherLayout(
        string pathToLayoutWithComponentIdOccurrenceInRepeatingGroup, string layoutSetName, string oldComponentId, string newComponentId)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);
        string layoutNameToPost = "testLayout";
        string layoutNameThatIsAffected = "repeating2";
        // Add a file to repo that should get an updated componentIdRef when posting another layout with the attached componentIdChanges info
        await AddFileToRepo(pathToLayoutWithComponentIdOccurrenceInRepeatingGroup,
            $"App/ui/{layoutSetName}/layouts/{layoutNameThatIsAffected}.json");
        // Post a random layout without any componentRefs, and pass inconsistent componentIdChanges to test effect in the other layout in repo
        string jsonPayload = ArrangeApiRequestContent("App/ui/group/layouts/prefill.json", oldComponentId, newComponentId);
        string url = $"{VersionPrefix(Org, targetRepository)}/{layoutNameToPost}?layoutSetName={layoutSetName}";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(jsonPayload, Encoding.UTF8, MediaTypeNames.Application.Json)
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        string layoutFromRepo = TestDataHelper.GetFileFromRepo(Org, targetRepository, Developer, $"App/ui/{layoutSetName}/layouts/{layoutNameThatIsAffected}.json");
        JsonNode layout = JsonNode.Parse(layoutFromRepo);
        JsonNode repeatingGroupComponent = layout["data"]["layout"]?.AsArray()?.FirstOrDefault(item => item["id"]?.ToString() == "mainGroup2");
        JsonArray rowsAfterArray = repeatingGroupComponent?["rowsAfter"]?.AsArray();

        bool containsOldId = rowsAfterArray
            ?.SelectMany(rowsAfter => rowsAfter["cells"]?.AsArray() ?? new JsonArray())
            .Any(cell => cell["component"]?.ToString() == oldComponentId) ?? false;

        bool containsNewId = rowsAfterArray
            ?.SelectMany(rowsAfter => rowsAfter["cells"]?.AsArray() ?? new JsonArray())
            .Any(cell => cell["component"]?.ToString() == newComponentId) ?? false;

        containsOldId.Should().BeFalse();
        containsNewId.Should().BeTrue();
    }

    [Theory]
    [InlineData("App/ui/group/layouts/repeating2.json", "layoutSet1", "currentValue", "aNewComponentId")]
    // The oldComponentId is present as a componentRef in both component and layout expression in repeating2.json
    public async Task SaveFormLayoutWithComponentIdChanges_ShouldSyncExpressionOccurrencesInSameLayout(
        string pathToLayoutWithComponentIdOccurrenceInExpression, string layoutSetName, string oldComponentId, string newComponentId)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);
        string layoutName = "testLayout";
        string jsonPayload = ArrangeApiRequestContent(pathToLayoutWithComponentIdOccurrenceInExpression, oldComponentId, newComponentId);
        string url = $"{VersionPrefix(Org, targetRepository)}/{layoutName}?layoutSetName={layoutSetName}";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(jsonPayload, Encoding.UTF8, MediaTypeNames.Application.Json)
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        string layoutFromRepo = TestDataHelper.GetFileFromRepo(Org, targetRepository, Developer, $"App/ui/{layoutSetName}/layouts/{layoutName}.json");
        JsonNode layout = JsonNode.Parse(layoutFromRepo);
        JsonNode expressionOnLayout = layout["data"]["hidden"]?.AsArray();
        JsonNode componentWithExpression = layout["data"]["layout"]?.AsArray()?.FirstOrDefault(item => item["id"]?.ToString() == "header-rep2");
        JsonArray expressionOnTitle = componentWithExpression?["textResourceBindings"]?["title"].AsArray();

        bool containsOldIdOnLayout = ContainsValue(expressionOnLayout, oldComponentId);
        bool containsNewIdOnLayout = ContainsValue(expressionOnLayout, newComponentId);
        bool containsOldIdInComponent = ContainsValue(expressionOnTitle, oldComponentId);
        bool containsNewIdInComponent = ContainsValue(expressionOnTitle, newComponentId);

        containsOldIdOnLayout.Should().BeFalse();
        containsNewIdOnLayout.Should().BeTrue();
        containsOldIdInComponent.Should().BeFalse();
        containsNewIdInComponent.Should().BeTrue();
    }

    [Theory]
    [InlineData("App/ui/group/layouts/repeating2.json", "layoutSet1", "currentValue", "aNewComponentId")]
    // The oldComponentId is present as a componentRef in both component and layout expression in repeating2.json
    public async Task SaveFormLayoutWithComponentIdChanges_ShouldSyncExpressionOccurrencesInAnotherLayout(
        string pathToLayoutWithComponentIdOccurrenceInExpression, string layoutSetName, string oldComponentId, string newComponentId)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);
        string layoutNameToPost = "testLayout";
        string layoutNameThatIsAffected = "repeating2";
        // Add a file to repo that should get an updated componentIdRef when posting another layout with the attached componentIdChanges info
        await AddFileToRepo(pathToLayoutWithComponentIdOccurrenceInExpression,
            $"App/ui/{layoutSetName}/layouts/{layoutNameThatIsAffected}.json");
        // Post a random layout without any componentRefs, and pass inconsistent componentIdChanges to test effect in the other layout in repo
        string jsonPayload = ArrangeApiRequestContent("App/ui/group/layouts/prefill.json", oldComponentId, newComponentId);
        string url = $"{VersionPrefix(Org, targetRepository)}/{layoutNameToPost}?layoutSetName={layoutSetName}";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(jsonPayload, Encoding.UTF8, MediaTypeNames.Application.Json)
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        string layoutFromRepo = TestDataHelper.GetFileFromRepo(Org, targetRepository, Developer, $"App/ui/{layoutSetName}/layouts/{layoutNameThatIsAffected}.json");
        JsonNode layout = JsonNode.Parse(layoutFromRepo);
        JsonNode expressionOnLayout = layout["data"]["hidden"]?.AsArray();
        JsonNode componentWithExpression = layout["data"]["layout"]?.AsArray()?.FirstOrDefault(item => item["id"]?.ToString() == "header-rep2");
        JsonArray expressionOnTitle = componentWithExpression?["textResourceBindings"]?["title"].AsArray();

        bool containsOldIdOnLayout = ContainsValue(expressionOnLayout, oldComponentId);
        bool containsNewIdOnLayout = ContainsValue(expressionOnLayout, newComponentId);
        bool containsOldIdInComponent = ContainsValue(expressionOnTitle, oldComponentId);
        bool containsNewIdInComponent = ContainsValue(expressionOnTitle, newComponentId);

        containsOldIdOnLayout.Should().BeFalse();
        containsNewIdOnLayout.Should().BeTrue();
        containsOldIdInComponent.Should().BeFalse();
        containsNewIdInComponent.Should().BeTrue();
    }

    [Theory]
    [InlineData("App/ui/likert/layouts/formLayout.json", "layoutSet1", "likert-group", "aNewComponentId")]
    // The oldComponentId is present as a componentRef in a summary component formLayout.json
    public async Task SaveFormLayoutWithComponentIdChanges_ShouldSyncSummaryRefOccurrencesInSameLayout(
        string pathToLayoutWithComponentIdOccurrenceInSummaryComponent, string layoutSetName, string oldComponentId, string newComponentId)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);
        string layoutName = "testLayout";
        string jsonPayload = ArrangeApiRequestContent(pathToLayoutWithComponentIdOccurrenceInSummaryComponent, oldComponentId, newComponentId);
        string url = $"{VersionPrefix(Org, targetRepository)}/{layoutName}?layoutSetName={layoutSetName}";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(jsonPayload, Encoding.UTF8, MediaTypeNames.Application.Json)
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        string layoutFromRepo = TestDataHelper.GetFileFromRepo(Org, targetRepository, Developer, $"App/ui/{layoutSetName}/layouts/{layoutName}.json");
        JsonNode layout = JsonNode.Parse(layoutFromRepo);
        JsonNode summaryComponentWithComponentRef = layout["data"]["layout"]?.AsArray()?.FirstOrDefault(item => item["id"]?.ToString() == "summary-1");

        summaryComponentWithComponentRef["componentRef"].ToString().Should().Be(newComponentId);
    }

    [Theory]
    [InlineData("App/ui/likert/layouts/formLayout.json", "layoutSet1", "likert-group", "aNewComponentId")]
    // The oldComponentId is present as a componentRef in a summary component formLayout.json
    public async Task SaveFormLayoutWithComponentIdChanges_ShouldSyncSummaryRefOccurrencesInAnotherLayout(
        string pathToLayoutWithComponentIdOccurrenceInSummaryComponent, string layoutSetName, string oldComponentId, string newComponentId)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);
        string layoutNameToPost = "testLayout";
        string layoutNameThatIsAffected = "formLayout";
        // Add a file to repo that should get an updated componentIdRef when posting another layout with the attached componentIdChanges info
        await AddFileToRepo(pathToLayoutWithComponentIdOccurrenceInSummaryComponent,
            $"App/ui/{layoutSetName}/layouts/{layoutNameThatIsAffected}.json");
        // Post a random layout without any componentRefs, and pass inconsistent componentIdChanges to test effect in the other layout in repo
        string jsonPayload = ArrangeApiRequestContent("App/ui/group/layouts/prefill.json", oldComponentId, newComponentId);
        string url = $"{VersionPrefix(Org, targetRepository)}/{layoutNameToPost}?layoutSetName={layoutSetName}";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(jsonPayload, Encoding.UTF8, MediaTypeNames.Application.Json)
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        string layoutFromRepo = TestDataHelper.GetFileFromRepo(Org, targetRepository, Developer, $"App/ui/{layoutSetName}/layouts/{layoutNameThatIsAffected}.json");
        JsonNode layout = JsonNode.Parse(layoutFromRepo);
        JsonNode summaryComponentWithComponentRef = layout["data"]["layout"]?.AsArray()?.FirstOrDefault(item => item["id"]?.ToString() == "summary-1");

        summaryComponentWithComponentRef["componentRef"].ToString().Should().Be(newComponentId);
    }

    [Theory]
    [InlineData("App/ui/likert/layouts/formLayout.json", "layoutSet1", "layoutSet2", "likert-group", "aNewComponentId")]
    // The oldComponentId is present as a componentRef in a summary component formLayout.json
    public async Task SaveFormLayoutWithComponentIdChanges_ShouldSyncComponentIdOccurrencesInAnotherLayoutSet(
        string pathToLayoutWithComponentIdOccurrenceInSummaryComponent, string layoutSetNameToPost, string layoutSetNameForOtherLayout, string oldComponentId, string newComponentId)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);
        string layoutNameToPost = "testLayout";
        string layoutNameThatIsAffected = "formLayout";
        // Add a file to repo that should get an updated componentIdRef when posting another layout with the attached componentIdChanges info
        await AddFileToRepo(pathToLayoutWithComponentIdOccurrenceInSummaryComponent,
            $"App/ui/{layoutSetNameForOtherLayout}/layouts/{layoutNameThatIsAffected}.json");
        // Post a random layout without any componentRefs, and pass inconsistent componentIdChanges to test effect in the other layout in repo
        string jsonPayload = ArrangeApiRequestContent("App/ui/group/layouts/prefill.json", oldComponentId, newComponentId);
        string url = $"{VersionPrefix(Org, targetRepository)}/{layoutNameToPost}?layoutSetName={layoutSetNameToPost}";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(jsonPayload, Encoding.UTF8, MediaTypeNames.Application.Json)
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        string layoutFromRepo = TestDataHelper.GetFileFromRepo(Org, targetRepository, Developer, $"App/ui/{layoutSetNameForOtherLayout}/layouts/{layoutNameThatIsAffected}.json");
        JsonNode layout = JsonNode.Parse(layoutFromRepo);
        JsonNode summaryComponentWithComponentRef = layout["data"]["layout"]?.AsArray()?.FirstOrDefault(item => item["id"]?.ToString() == "summary-1");

        summaryComponentWithComponentRef["componentRef"].ToString().Should().Be(newComponentId);
    }

    private string ArrangeApiRequestContent(string pathToLayoutToPost, string oldComponentId, string newComponentId)
    {
        string layout = SharedResourcesHelper.LoadTestDataAsString(pathToLayoutToPost);

        var payload = new JsonObject
        {
            ["componentIdChange"] = new JsonObject
            {
                ["oldComponentId"] = oldComponentId,
                ["newComponentId"] = newComponentId,
            },

            ["layout"] = JsonNode.Parse(layout)
        };

        return payload.ToJsonString();
    }

    private async Task AddFileToRepo(string fileToCopyPath, string relativeCopyRepoLocation)
    {
        string fileContent = SharedResourcesHelper.LoadTestDataAsString(fileToCopyPath);
        string filePath = Path.Combine(TestRepoPath, relativeCopyRepoLocation);
        string folderPath = Path.GetDirectoryName(filePath);
        if (!Directory.Exists(folderPath))
        {
            Directory.CreateDirectory(folderPath);
        }

        await File.WriteAllTextAsync(filePath, fileContent);
    }

    private bool ContainsValue(JsonNode node, string value)
    {
        if (node is JsonValue jsonValue && jsonValue.TryGetValue(out string stringValue) && stringValue == value)
        {
            return true;
        }
        if (node is JsonArray jsonArray)
        {
            return jsonArray.Any(item => ContainsValue(item, value));
        }
        if (node is JsonObject jsonObject)
        {
            return ((IDictionary<string, JsonNode>)jsonObject).Values.Any(item => ContainsValue(item, value));
        }
        return false;
    }
}
