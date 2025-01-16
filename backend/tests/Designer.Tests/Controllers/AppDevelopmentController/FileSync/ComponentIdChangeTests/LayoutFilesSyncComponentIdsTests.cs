using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController.FileSync.ComponentIdChangeTests;

public class LayoutFilesSyncComponentIdsTests : DesignerEndpointsTestsBase<LayoutFilesSyncComponentIdsTests>,
    IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/app-development/form-layout";

    private const string Org = "ttd";
    private const string App = "app-with-layoutsets";
    private const string Developer = "testUser";

    public LayoutFilesSyncComponentIdsTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Theory]
    [InlineData("App/ui/group/layouts/repeating2.json", "layoutSet1", "sum-all", "aNewComponentId")]
    [InlineData("App/ui/group/layouts/repeating2.json", "layoutSet1", "sum-all", null)]
    // The oldComponentId is present as a componentRef in the array of cells in rowsAfter in the original repeating group component in repeating2.json
    public async Task SaveFormLayoutWithComponentIdChanges_ShouldSyncRepeatingGroupOccurrenceInSameLayout(
        string pathToLayoutWithComponentIdOccurrenceInRepeatingGroup, string layoutSetName, string oldComponentId, string newComponentId)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);
        string layoutName = "testLayout";
        List<ComponentIdChange> componentIdsChange = new List<ComponentIdChange>([
            new ComponentIdChange() { OldComponentId = oldComponentId, NewComponentId = newComponentId },
        ]);
        string jsonPayload = ArrangeApiRequestContent(pathToLayoutWithComponentIdOccurrenceInRepeatingGroup, componentIdsChange);
        string url = $"{VersionPrefix(Org, targetRepository)}/{layoutName}?layoutSetName={layoutSetName}";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(jsonPayload, Encoding.UTF8, MediaTypeNames.Application.Json)
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

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

        Assert.False(containsOldId);
        Assert.True(containsNewId);
    }

    [Theory]
    [InlineData("App/ui/group/layouts/repeating2.json", "layoutSet1", "sum-all", "aNewComponentId")]
    [InlineData("App/ui/group/layouts/repeating2.json", "layoutSet1", "sum-all", null)]
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
        List<ComponentIdChange> componentIdsChange = new List<ComponentIdChange>([
            new ComponentIdChange() { OldComponentId = oldComponentId, NewComponentId = newComponentId },
        ]);
        // Post a random layout without any componentRefs, and pass inconsistent componentIdChanges to test effect in the other layout in repo
        string jsonPayload = ArrangeApiRequestContent("App/ui/group/layouts/prefill.json", componentIdsChange);
        string url = $"{VersionPrefix(Org, targetRepository)}/{layoutNameToPost}?layoutSetName={layoutSetName}";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(jsonPayload, Encoding.UTF8, MediaTypeNames.Application.Json)
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

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

        Assert.False(containsOldId);
        Assert.True(containsNewId);
    }

    [Theory]
    [InlineData("App/ui/group/layouts/repeating2.json", "layoutSet1", "currentValue", "aNewComponentId")]
    [InlineData("App/ui/group/layouts/repeating2.json", "layoutSet1", "currentValue", null)]
    // The oldComponentId is present as a componentRef in both component and layout expression in repeating2.json
    public async Task SaveFormLayoutWithComponentIdChanges_ShouldSyncExpressionOccurrencesInSameLayout(
        string pathToLayoutWithComponentIdOccurrenceInExpression, string layoutSetName, string oldComponentId, string newComponentId)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);
        string layoutName = "testLayout";
        List<ComponentIdChange> componentIdsChange = new List<ComponentIdChange>([
            new ComponentIdChange() { OldComponentId = oldComponentId, NewComponentId = newComponentId },
        ]);
        string jsonPayload = ArrangeApiRequestContent(pathToLayoutWithComponentIdOccurrenceInExpression, componentIdsChange);
        string url = $"{VersionPrefix(Org, targetRepository)}/{layoutName}?layoutSetName={layoutSetName}";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(jsonPayload, Encoding.UTF8, MediaTypeNames.Application.Json)
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string layoutFromRepo = TestDataHelper.GetFileFromRepo(Org, targetRepository, Developer, $"App/ui/{layoutSetName}/layouts/{layoutName}.json");
        JsonNode layout = JsonNode.Parse(layoutFromRepo);
        JsonNode expressionOnLayout = layout["data"]["hidden"]?.AsArray();
        JsonNode componentWithExpression = layout["data"]["layout"]?.AsArray()?.FirstOrDefault(item => item["id"]?.ToString() == "header-rep2");
        JsonArray expressionOnTitle = componentWithExpression?["textResourceBindings"]?["title"].AsArray();

        Assert.False(ContainsValue(expressionOnLayout, oldComponentId));
        Assert.False(ContainsValue(expressionOnTitle, oldComponentId));
        if (string.IsNullOrEmpty(newComponentId))
        {
            Assert.False(ContainsValue(expressionOnLayout, newComponentId));
            Assert.False(ContainsValue(expressionOnTitle, newComponentId));
        }
        else
        {
            Assert.True(ContainsValue(expressionOnLayout, newComponentId));
            Assert.True(ContainsValue(expressionOnTitle, newComponentId));
        }
    }

    [Theory]
    [InlineData("App/ui/group/layouts/repeating2.json", "layoutSet1", "currentValue", "aNewComponentId")]
    [InlineData("App/ui/group/layouts/repeating2.json", "layoutSet1", "currentValue", null)]
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
        List<ComponentIdChange> componentIdsChange = new List<ComponentIdChange>([
            new ComponentIdChange() { OldComponentId = oldComponentId, NewComponentId = newComponentId },
        ]);
        // Post a random layout without any componentRefs, and pass inconsistent componentIdChanges to test effect in the other layout in repo
        string jsonPayload = ArrangeApiRequestContent("App/ui/group/layouts/prefill.json", componentIdsChange);
        string url = $"{VersionPrefix(Org, targetRepository)}/{layoutNameToPost}?layoutSetName={layoutSetName}";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(jsonPayload, Encoding.UTF8, MediaTypeNames.Application.Json)
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string layoutFromRepo = TestDataHelper.GetFileFromRepo(Org, targetRepository, Developer, $"App/ui/{layoutSetName}/layouts/{layoutNameThatIsAffected}.json");
        JsonNode layout = JsonNode.Parse(layoutFromRepo);
        JsonNode expressionOnLayout = layout["data"]["hidden"]?.AsArray();
        JsonNode componentWithExpression = layout["data"]["layout"]?.AsArray()?.FirstOrDefault(item => item["id"]?.ToString() == "header-rep2");
        JsonArray expressionOnTitle = componentWithExpression?["textResourceBindings"]?["title"].AsArray();

        Assert.False(ContainsValue(expressionOnLayout, oldComponentId));
        Assert.False(ContainsValue(expressionOnTitle, oldComponentId));
        if (string.IsNullOrEmpty(newComponentId))
        {
            Assert.False(ContainsValue(expressionOnLayout, newComponentId));
            Assert.False(ContainsValue(expressionOnTitle, newComponentId));
        }
        else
        {
            Assert.True(ContainsValue(expressionOnLayout, newComponentId));
            Assert.True(ContainsValue(expressionOnTitle, newComponentId));
        }
    }

    [Theory]
    [InlineData("App/ui/likert/layouts/formLayout.json", "layoutSet1", "likert-group", "aNewComponentId")]
    [InlineData("App/ui/likert/layouts/formLayout.json", "layoutSet1", "likert-group", null)]
    // The oldComponentId is present as a componentRef in a summary component formLayout.json
    public async Task SaveFormLayoutWithComponentIdChanges_ShouldSyncSummaryRefOccurrencesInSameLayout(
        string pathToLayoutWithComponentIdOccurrenceInSummaryComponent, string layoutSetName, string oldComponentId, string newComponentId)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);
        string layoutName = "testLayout";
        List<ComponentIdChange> componentIdsChange = new List<ComponentIdChange>([
            new ComponentIdChange() { OldComponentId = oldComponentId, NewComponentId = newComponentId },
        ]);
        string jsonPayload = ArrangeApiRequestContent(pathToLayoutWithComponentIdOccurrenceInSummaryComponent, componentIdsChange);
        string url = $"{VersionPrefix(Org, targetRepository)}/{layoutName}?layoutSetName={layoutSetName}";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(jsonPayload, Encoding.UTF8, MediaTypeNames.Application.Json)
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string layoutFromRepo = TestDataHelper.GetFileFromRepo(Org, targetRepository, Developer, $"App/ui/{layoutSetName}/layouts/{layoutName}.json");
        JsonNode layout = JsonNode.Parse(layoutFromRepo);
        JsonNode summaryComponentWithComponentRef = layout["data"]["layout"]?.AsArray()?.FirstOrDefault(item => item["id"]?.ToString() == "summary-1");

        if (string.IsNullOrEmpty(newComponentId))
        {
            Assert.Null(summaryComponentWithComponentRef["componentRef"]);
        }
        else
        {
            Assert.Equal(newComponentId, summaryComponentWithComponentRef["componentRef"].ToString());
        }
    }

    [Theory]
    [InlineData("App/ui/likert/layouts/formLayout.json", "layoutSet1", "likert-group", "aNewComponentId")]
    [InlineData("App/ui/likert/layouts/formLayout.json", "layoutSet1", "likert-group", null)]
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
        List<ComponentIdChange> componentIdsChange = new List<ComponentIdChange>([
            new ComponentIdChange() { OldComponentId = oldComponentId, NewComponentId = newComponentId },
        ]);
        // Post a random layout without any componentRefs, and pass inconsistent componentIdChanges to test effect in the other layout in repo
        string jsonPayload = ArrangeApiRequestContent("App/ui/group/layouts/prefill.json", componentIdsChange);
        string url = $"{VersionPrefix(Org, targetRepository)}/{layoutNameToPost}?layoutSetName={layoutSetName}";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(jsonPayload, Encoding.UTF8, MediaTypeNames.Application.Json)
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string layoutFromRepo = TestDataHelper.GetFileFromRepo(Org, targetRepository, Developer, $"App/ui/{layoutSetName}/layouts/{layoutNameThatIsAffected}.json");
        JsonNode layout = JsonNode.Parse(layoutFromRepo);
        JsonNode summaryComponentWithComponentRef = layout["data"]["layout"]?.AsArray()?.FirstOrDefault(item => item["id"]?.ToString() == "summary-1");

        if (string.IsNullOrEmpty(newComponentId))
        {
            Assert.Null(summaryComponentWithComponentRef["componentRef"]);
        }
        else
        {
            Assert.Equal(newComponentId, summaryComponentWithComponentRef["componentRef"].ToString());
        }
    }

    [Theory]
    [InlineData("App/ui/group/layouts/repeating2.json", "layoutSet1", "currentValue2", "aNewComponentId")]
    [InlineData("App/ui/group/layouts/repeating2.json", "layoutSet1", "currentValue2", null)]
    // The oldComponentId is present as a property name in a repeating group component in repeating2.json
    public async Task SaveFormLayoutWithComponentIdChanges_ShouldSyncPropertyNameOccurrencesInSameLayout(
        string pathToLayoutWithComponentIdOccurrenceAsPropertyName, string layoutSetName, string oldComponentId, string newComponentId)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);
        string layoutName = "testLayout";
        await AddFileToRepo(pathToLayoutWithComponentIdOccurrenceAsPropertyName,
            $"App/ui/{layoutSetName}/layouts/{layoutName}.json");
        List<ComponentIdChange> componentIdsChange = new List<ComponentIdChange>([
            new ComponentIdChange() { OldComponentId = oldComponentId, NewComponentId = newComponentId },
        ]);
        string jsonPayload = ArrangeApiRequestContent(pathToLayoutWithComponentIdOccurrenceAsPropertyName, componentIdsChange);
        string url = $"{VersionPrefix(Org, targetRepository)}/{layoutName}?layoutSetName={layoutSetName}";

        string originalLayoutString = TestDataHelper.GetFileFromRepo(Org, targetRepository, Developer, $"App/ui/{layoutSetName}/layouts/{layoutName}.json");
        JsonNode originalLayout = JsonNode.Parse(originalLayoutString);
        JsonNode originalTableColumns = originalLayout["data"]["layout"]?.AsArray().FirstOrDefault(item => item["id"]?.ToString() == "mainGroup2")["tableColumns"];

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(jsonPayload, Encoding.UTF8, MediaTypeNames.Application.Json)
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string layoutFromRepo = TestDataHelper.GetFileFromRepo(Org, targetRepository, Developer, $"App/ui/{layoutSetName}/layouts/{layoutName}.json");
        JsonNode layout = JsonNode.Parse(layoutFromRepo);
        JsonNode tableColumnsWithIdAsPropertyName = layout["data"]["layout"]?.AsArray()?.FirstOrDefault(item => item["id"]?.ToString() == "mainGroup2")["tableColumns"];

        Assert.Null(tableColumnsWithIdAsPropertyName?[oldComponentId]);
        if (string.IsNullOrEmpty(newComponentId))
        {
            Assert.Equal((originalTableColumns as JsonObject).Count - 1, (tableColumnsWithIdAsPropertyName as JsonObject).Count);
        }
        else
        {
            Assert.NotNull(tableColumnsWithIdAsPropertyName?[newComponentId]);
        }
    }

    [Theory]
    [InlineData("App/ui/group/layouts/repeating2.json", "layoutSet1", "currentValue2", "aNewComponentId")]
    [InlineData("App/ui/group/layouts/repeating2.json", "layoutSet1", "currentValue2", null)]
    // The oldComponentId is present as a property name in a repeating group component in repeating2.json
    public async Task SaveFormLayoutWithComponentIdChanges_ShouldSyncPropertyNameOccurrencesInAnotherLayout(
        string pathToLayoutWithComponentIdOccurrenceAsPropertyName, string layoutSetName, string oldComponentId, string newComponentId)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);
        string layoutNameToPost = "testLayout";
        string layoutNameThatIsAffected = "formLayout";
        // Add a file to repo that should get an updated componentIdRef when posting another layout with the attached componentIdChanges info
        await AddFileToRepo(pathToLayoutWithComponentIdOccurrenceAsPropertyName,
            $"App/ui/{layoutSetName}/layouts/{layoutNameThatIsAffected}.json");
        List<ComponentIdChange> componentIdsChange = new List<ComponentIdChange>([
            new ComponentIdChange() { OldComponentId = oldComponentId, NewComponentId = newComponentId },
        ]);
        // Post a random layout without any componentRefs, and pass inconsistent componentIdChanges to test effect in the other layout in repo
        string jsonPayload = ArrangeApiRequestContent("App/ui/group/layouts/prefill.json", componentIdsChange);
        string url = $"{VersionPrefix(Org, targetRepository)}/{layoutNameToPost}?layoutSetName={layoutSetName}";

        string originalLayoutString = TestDataHelper.GetFileFromRepo(Org, targetRepository, Developer, $"App/ui/{layoutSetName}/layouts/{layoutNameThatIsAffected}.json");
        JsonNode originalLayout = JsonNode.Parse(originalLayoutString);
        JsonNode originalTableColumns = originalLayout["data"]["layout"]?.AsArray().FirstOrDefault(item => item["id"]?.ToString() == "mainGroup2")["tableColumns"];

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(jsonPayload, Encoding.UTF8, MediaTypeNames.Application.Json)
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string layoutFromRepo = TestDataHelper.GetFileFromRepo(Org, targetRepository, Developer, $"App/ui/{layoutSetName}/layouts/{layoutNameThatIsAffected}.json");
        JsonNode layout = JsonNode.Parse(layoutFromRepo);
        JsonNode tableColumnsWithIdAsPropertyName = layout["data"]["layout"]?.AsArray()?.FirstOrDefault(item => item["id"]?.ToString() == "mainGroup2")["tableColumns"];

        Assert.Null(tableColumnsWithIdAsPropertyName?[oldComponentId]);
        if (string.IsNullOrEmpty(newComponentId))
        {
            Assert.Equal((originalTableColumns as JsonObject).Count - 1, (tableColumnsWithIdAsPropertyName as JsonObject).Count);
        }
        else
        {
            Assert.NotNull(tableColumnsWithIdAsPropertyName?[newComponentId]);
        }
    }

    [Theory]
    [InlineData("App/ui/group/layouts/repeating2.json", "layoutSet1", "currentValue2", "aNewComponentId")]
    [InlineData("App/ui/group/layouts/repeating2.json", "layoutSet1", "currentValue2", null)]
    // The oldComponentId is present as a property name in a repeating group component in repeating2.json
    public async Task SaveFormLayoutWithComponentIdChanges_ShouldSyncTableHeaderOccurrencesInSameLayout(
        string pathToLayoutWithComponentIdOccurrenceInTableHeaders, string layoutSetName, string oldComponentId, string newComponentId)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);
        string layoutName = "testLayout";
        List<ComponentIdChange> componentIdsChange = new List<ComponentIdChange>([
            new ComponentIdChange() { OldComponentId = oldComponentId, NewComponentId = newComponentId },
        ]);
        string jsonPayload = ArrangeApiRequestContent(pathToLayoutWithComponentIdOccurrenceInTableHeaders, componentIdsChange);
        string url = $"{VersionPrefix(Org, targetRepository)}/{layoutName}?layoutSetName={layoutSetName}";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(jsonPayload, Encoding.UTF8, MediaTypeNames.Application.Json)
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string layoutFromRepo = TestDataHelper.GetFileFromRepo(Org, targetRepository, Developer, $"App/ui/{layoutSetName}/layouts/{layoutName}.json");
        JsonNode layout = JsonNode.Parse(layoutFromRepo);
        JsonNode repeatingGroupComponentWithIdInTableHeaders = layout["data"]["layout"]?.AsArray()?.FirstOrDefault(item => item["id"]?.ToString() == "mainGroup2");
        JsonArray tableHeaders = repeatingGroupComponentWithIdInTableHeaders["tableHeaders"].AsArray();

        Assert.False(ContainsValue(tableHeaders, oldComponentId));
        if (string.IsNullOrEmpty(newComponentId))
        {
            Assert.False(ContainsValue(tableHeaders, newComponentId));
        }
        else
        {
            Assert.True(ContainsValue(tableHeaders, newComponentId));
        }
    }

    [Theory]
    [InlineData("App/ui/group/layouts/repeating2.json", "layoutSet1", "currentValue2", "aNewComponentId")]
    [InlineData("App/ui/group/layouts/repeating2.json", "layoutSet1", "currentValue2", null)]
    // The oldComponentId is present as a property name in a repeating group component in repeating2.json
    public async Task SaveFormLayoutWithComponentIdChanges_ShouldSyncTableHeaderOccurrencesInAnotherLayout(
        string pathToLayoutWithComponentIdOccurrenceInTableHeaders, string layoutSetName, string oldComponentId, string newComponentId)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);
        string layoutNameToPost = "testLayout";
        string layoutNameThatIsAffected = "formLayout";
        // Add a file to repo that should get an updated componentIdRef when posting another layout with the attached componentIdChanges info
        await AddFileToRepo(pathToLayoutWithComponentIdOccurrenceInTableHeaders,
            $"App/ui/{layoutSetName}/layouts/{layoutNameThatIsAffected}.json");
        List<ComponentIdChange> componentIdsChange = new List<ComponentIdChange>([
            new ComponentIdChange() { OldComponentId = oldComponentId, NewComponentId = newComponentId },
        ]);
        // Post a random layout without any componentRefs, and pass inconsistent componentIdChanges to test effect in the other layout in repo
        string jsonPayload = ArrangeApiRequestContent("App/ui/group/layouts/prefill.json", componentIdsChange);
        string url = $"{VersionPrefix(Org, targetRepository)}/{layoutNameToPost}?layoutSetName={layoutSetName}";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(jsonPayload, Encoding.UTF8, MediaTypeNames.Application.Json)
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string layoutFromRepo = TestDataHelper.GetFileFromRepo(Org, targetRepository, Developer, $"App/ui/{layoutSetName}/layouts/{layoutNameThatIsAffected}.json");
        JsonNode layout = JsonNode.Parse(layoutFromRepo);
        JsonNode repeatingGroupComponentWithIdInTableHeaders = layout["data"]["layout"]?.AsArray()?.FirstOrDefault(item => item["id"]?.ToString() == "mainGroup2");
        JsonArray tableHeaders = repeatingGroupComponentWithIdInTableHeaders["tableHeaders"].AsArray();

        Assert.False(ContainsValue(tableHeaders, oldComponentId));
        if (string.IsNullOrEmpty(newComponentId))
        {
            Assert.False(ContainsValue(tableHeaders, newComponentId));
        }
        else
        {
            Assert.True(ContainsValue(tableHeaders, newComponentId));
        }
    }

    [Theory]
    [InlineData("App/ui/group/layouts/repeating2.json", "layoutSet1", "currentValue2", "aNewComponentId", "newValue2", "aNewComponentId2")]
    [InlineData("App/ui/group/layouts/repeating2.json", "layoutSet1", "currentValue2", null, "newValue2", null)]
    // The oldComponentId is present as a property name in a repeating group component in repeating2.json
    public async Task SaveFormLayoutWithMultipleComponentIdChanges_ShouldSyncSameLayoutWithBoth(
        string pathToLayoutWithComponentIdOccurrenceInTableHeaders, string layoutSetName, string oldComponentId, string newComponentId, string oldComponentId2, string newComponentId2)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);
        string layoutNameToPost = "testLayout";
        string layoutNameThatIsAffected = "formLayout";
        // Add a file to repo that should get an updated componentIdRef when posting another layout with the attached componentIdChanges info
        await AddFileToRepo(pathToLayoutWithComponentIdOccurrenceInTableHeaders,
            $"App/ui/{layoutSetName}/layouts/{layoutNameThatIsAffected}.json");
        List<ComponentIdChange> componentIdsChange = new List<ComponentIdChange>([
            new ComponentIdChange() { OldComponentId = oldComponentId, NewComponentId = newComponentId },
            new ComponentIdChange() { OldComponentId = oldComponentId2, NewComponentId = newComponentId2 }
        ]);
        // Post a random layout without any componentRefs, and pass inconsistent componentIdChanges to test effect in the other layout in repo
        string jsonPayload = ArrangeApiRequestContent("App/ui/group/layouts/prefill.json", componentIdsChange);
        string url = $"{VersionPrefix(Org, targetRepository)}/{layoutNameToPost}?layoutSetName={layoutSetName}";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(jsonPayload, Encoding.UTF8, MediaTypeNames.Application.Json)
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string layoutFromRepo = TestDataHelper.GetFileFromRepo(Org, targetRepository, Developer, $"App/ui/{layoutSetName}/layouts/{layoutNameThatIsAffected}.json");
        JsonNode layout = JsonNode.Parse(layoutFromRepo);
        JsonNode repeatingGroupComponentWithIdInTableHeaders = layout["data"]["layout"]?.AsArray()?.FirstOrDefault(item => item["id"]?.ToString() == "mainGroup2");
        JsonArray tableHeaders = repeatingGroupComponentWithIdInTableHeaders["tableHeaders"].AsArray();

        Assert.False(ContainsValue(tableHeaders, oldComponentId));
        Assert.False(ContainsValue(tableHeaders, oldComponentId2));
        if (string.IsNullOrEmpty(newComponentId))
        {
            Assert.False(ContainsValue(tableHeaders, newComponentId));
            Assert.False(ContainsValue(tableHeaders, newComponentId2));
        }
        else
        {
            Assert.True(ContainsValue(tableHeaders, newComponentId));
            Assert.True(ContainsValue(tableHeaders, newComponentId2));
        }
    }

    [Theory]
    [InlineData("App/ui/likert/layouts/formLayout.json", "layoutSet1", "layoutSet2", "likert-group", "aNewComponentId")]
    [InlineData("App/ui/likert/layouts/formLayout.json", "layoutSet1", "layoutSet2", "likert-group", null)]
    // The oldComponentId is present as a componentRef in a summary component formLayout.json
    public async Task SaveFormLayoutWithComponentIdChanges_ShouldNotSyncComponentIdOccurrencesInAnotherLayoutSet(
        string pathToLayoutWithComponentIdOccurrenceInSummaryComponent, string layoutSetNameToPost, string layoutSetNameForOtherLayout, string oldComponentId, string newComponentId)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);
        string layoutNameToPost = "testLayout";
        string layoutNameThatIsAffected = "formLayout";
        // Add a file to repo that should get an updated componentIdRef when posting another layout with the attached componentIdChanges info
        await AddFileToRepo(pathToLayoutWithComponentIdOccurrenceInSummaryComponent,
            $"App/ui/{layoutSetNameForOtherLayout}/layouts/{layoutNameThatIsAffected}.json");
        List<ComponentIdChange> componentIdsChange = new List<ComponentIdChange>([
            new ComponentIdChange() { OldComponentId = oldComponentId, NewComponentId = newComponentId },
        ]);
        // Post a random layout without any componentRefs, and pass inconsistent componentIdChanges to test effect in the other layout in repo
        string jsonPayload = ArrangeApiRequestContent("App/ui/group/layouts/prefill.json", componentIdsChange);
        string url = $"{VersionPrefix(Org, targetRepository)}/{layoutNameToPost}?layoutSetName={layoutSetNameToPost}";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(jsonPayload, Encoding.UTF8, MediaTypeNames.Application.Json)
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string layoutFromRepo = TestDataHelper.GetFileFromRepo(Org, targetRepository, Developer, $"App/ui/{layoutSetNameForOtherLayout}/layouts/{layoutNameThatIsAffected}.json");
        JsonNode layout = JsonNode.Parse(layoutFromRepo);
        JsonNode summaryComponentWithComponentRef = layout["data"]["layout"]?.AsArray()?.FirstOrDefault(item => item["id"]?.ToString() == "summary-1");

        Assert.Equal(oldComponentId, summaryComponentWithComponentRef["componentRef"].ToString());
    }

    private string ArrangeApiRequestContent(string pathToLayoutToPost, List<ComponentIdChange> componentIdsChanges)
    {
        string layout = SharedResourcesHelper.LoadTestDataAsString(pathToLayoutToPost);

        var componentIdsChangeArray = new JsonArray();

        componentIdsChanges.ForEach(change => componentIdsChangeArray.Add(new JsonObject
        {
            ["oldComponentId"] = change.OldComponentId,
            ["newComponentId"] = change.NewComponentId,
        }));

        var payload = new JsonObject
        {
            ["componentIdsChange"] = componentIdsChangeArray,
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
