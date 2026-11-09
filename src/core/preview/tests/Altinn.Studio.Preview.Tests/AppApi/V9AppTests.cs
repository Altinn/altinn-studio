using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Nodes;
using Altinn.Studio.Preview.Sessions;

namespace Altinn.Studio.Preview.Tests.AppApi;

/// <summary>A v9 app in preview, as its frontend uses it: the page, then an instance through its process.</summary>
public sealed class V9AppTests : IDisposable
{
    private const string AppLibVersion = "9.0.0-preview.8";

    private readonly PreviewApplicationFactory _factory = new();
    private readonly string _workingCopy;

    public V9AppTests()
    {
        _workingCopy = _factory.Root.AddWorkingCopy("developer", "ttd", "my-app");
        AddV9App(_workingCopy, AppLibVersion);
    }

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task Page_StartsTheFrontendWithTheSessionInItsPaths()
    {
        Uri appRoot = await StartSession();

        using HttpResponseMessage response = await Get(appRoot);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        string page = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        string sessionId = appRoot.Segments[1].TrimEnd('/');
        Assert.Contains($"window.org = \"{sessionId}/ttd\";", page, StringComparison.Ordinal);
        Assert.Contains("window.app = \"my-app\";", page, StringComparison.Ordinal);
        Assert.Contains(
            $"src=\"{PreviewApplicationFactory.StudioOrigin}/designer/app-dist/{AppLibVersion}/altinn-app-frontend.js\"",
            page,
            StringComparison.Ordinal
        );
        Assert.Contains("\"onEntry\":{\"show\":\"new-instance\"}", page, StringComparison.Ordinal);
        Assert.Contains("\"orgName\":{\"nb\":\"ttd\",\"nn\":\"ttd\",\"en\":\"ttd\"}", page, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("instance/51001/0b0c6d0f-8ad4-4d7f-bd38-4b2c6f8bd3a0/Task_1/Side1")]
    [InlineData("instance-selection")]
    [InlineData("party-selection/403")]
    [InlineData("Side1")]
    public async Task Page_IsServedForTheFrontendsRoutes(string route)
    {
        Uri appRoot = await StartSession();

        using HttpResponseMessage response = await Get(new Uri(appRoot, route));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
    }

    [Theory]
    [InlineData("missing.png")]
    [InlineData("api/v1/missing")]
    [InlineData("instances/51001/0b0c6d0f-8ad4-4d7f-bd38-4b2c6f8bd3a0/missing")]
    public async Task Page_IsNotServedForFilesOrTheApi(string route)
    {
        Uri appRoot = await StartSession();

        using HttpResponseMessage response = await Get(new Uri(appRoot, route));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Page_EscapesTheAppsTexts()
    {
        RepositoryRoot.AddFile(
            _workingCopy,
            "App/config/texts/resource.nb.json",
            """{"language":"nb","resources":[{"id":"title","value":"</script><script>alert(1)</script>"}]}"""
        );
        Uri appRoot = await StartSession();

        using HttpResponseMessage response = await Get(appRoot);

        string page = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        Assert.DoesNotContain("<script>alert", page, StringComparison.Ordinal);
        Assert.Contains("\\u003C/script\\u003E\\u003Cscript\\u003Ealert(1)", page, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Page_IsNotFound_ForAnAppBeforeV9()
    {
        RepositoryRoot.AddFile(_workingCopy, "App/App.csproj", Project("8.12.15"));
        Uri appRoot = await StartSession();

        using HttpResponseMessage response = await Get(appRoot);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Instance_GoesThroughTheProcess()
    {
        Uri appRoot = await StartSession();

        JsonObject instance = await Send(HttpMethod.Post, new Uri(appRoot, "instances?instanceOwnerPartyId=51001"));
        string instanceId = Value(instance["id"]);
        Assert.StartsWith("51001/", instanceId, StringComparison.Ordinal);
        Uri instanceUrl = new(appRoot, $"instances/{instanceId}/");

        JsonObject enriched = await Send(HttpMethod.Get, new Uri(instanceUrl, "enriched"));
        Assert.Equal("Task_1", (string?)enriched["process"]?["currentTask"]?["elementId"]);
        Assert.True((bool?)enriched["process"]?["currentTask"]?["write"]);
        Assert.Equal(
            ["Task_1:data:Task", "PdfTask:pdf:ServiceTask"],
            (enriched["process"]?["processTasks"]?.AsArray() ?? []).Select(task =>
                $"{task?["elementId"]}:{task?["altinnTaskType"]}:{task?["elementType"]}"
            )
        );

        JsonObject form = await Send(HttpMethod.Get, new Uri(instanceUrl, "bootstrap-form/Task_1"));
        Assert.NotNull(form["layouts"]?["Side1"]);
        string dataElementId = Value(form["dataModels"]?["model"]?["dataElementId"]);
        Assert.Equal("object", (string?)form["dataModels"]?["model"]?["schema"]?["type"]);

        JsonObject patched = await Send(
            HttpMethod.Patch,
            new Uri(instanceUrl, "data"),
            $$"""{"patches":[{"dataElementId":"{{dataElementId}}","patch":[{"op":"add","path":"/name","value":"Kari"}]}],"ignoredValidators":[]}"""
        );
        Assert.Equal("Kari", (string?)patched["newDataModels"]?[0]?["data"]?["name"]);

        JsonObject reloaded = await Send(HttpMethod.Get, new Uri(instanceUrl, "bootstrap-form/Task_1"));
        Assert.Equal("Kari", (string?)reloaded["dataModels"]?["model"]?["initialData"]?["name"]);

        // The PDF is a service task, which the process runs without the user, on to the end.
        JsonObject next = await Send(HttpMethod.Put, new Uri(instanceUrl, "process/next?returnInstance=true"));
        Assert.Null(next["process"]?["currentTask"]);
        Assert.Equal("EndEvent_1", (string?)next["process"]?["endEvent"]);
        Assert.True((bool?)next["data"]?[0]?["locked"]);
    }

    [Fact]
    public async Task Patch_ChangesNothing_WhenOnePatchFails()
    {
        Uri appRoot = await StartSession();
        JsonObject instance = await Send(HttpMethod.Post, new Uri(appRoot, "instances?instanceOwnerPartyId=51001"));
        Uri instanceUrl = new(appRoot, $"instances/{instance["id"]}/");
        string dataElementId = Value(instance["data"]?[0]?["id"]);

        using HttpResponseMessage response = await SendRaw(
            HttpMethod.Patch,
            new Uri(instanceUrl, "data"),
            $$"""{"patches":[{"dataElementId":"{{dataElementId}}","patch":[{"op":"add","path":"/name","value":"Kari"},{"op":"test","path":"/name","value":"Ola"}]}],"ignoredValidators":[]}"""
        );

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        JsonObject form = await Send(HttpMethod.Get, new Uri(instanceUrl, "bootstrap-form/Task_1"));
        Assert.Null(form["dataModels"]?["model"]?["initialData"]?["name"]);
    }

    [Fact]
    public async Task Instance_BelongsToItsSession()
    {
        Uri appRoot = await StartSession();
        JsonObject instance = await Send(HttpMethod.Post, new Uri(appRoot, "instances?instanceOwnerPartyId=51001"));
        Uri otherSession = await StartSession();

        using HttpResponseMessage response = await Get(new Uri(otherSession, $"instances/{instance["id"]}/enriched"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData("Task_1", "data")]
    [InlineData("PdfTask", "pdf")]
    [InlineData("TaskTheProcessLacks", "data")]
    public async Task EditorInstance_StartsAtTheTask(string taskId, string taskType)
    {
        Uri appRoot = await StartSession();

        using HttpResponseMessage response = await CreateEditorInstance("developer", appRoot, taskId);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonObject>(TestContext.Current.CancellationToken);
        string instanceId = Value(body?["instanceId"]);
        JsonObject enriched = await Send(HttpMethod.Get, new Uri(appRoot, $"instances/{instanceId}/enriched"));
        Assert.Equal(taskId, (string?)enriched["process"]?["currentTask"]?["elementId"]);
        Assert.Equal(taskType, (string?)enriched["process"]?["currentTask"]?["altinnTaskType"]);
    }

    [Fact]
    public async Task EditorInstance_IsNotFound_InAnotherDevelopersSession()
    {
        _factory.Root.AddWorkingCopy("other-developer", "ttd", "my-app");
        Uri appRoot = await StartSession();

        using HttpResponseMessage response = await CreateEditorInstance("other-developer", appRoot, "Task_1");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData(true, "Task_1")]
    [InlineData(false, "../Task_1")]
    public async Task EditorInstance_RefusesAUrlOfAnotherSiteOrAnUnsafeTask(bool anotherSite, string taskId)
    {
        Uri appRoot = await StartSession();
        Uri sessionUrl = anotherSite ? new Uri($"https://elsewhere.test{appRoot.AbsolutePath}") : appRoot;

        using HttpResponseMessage response = await CreateEditorInstance("developer", sessionUrl, taskId);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task EditorInstance_IsNotServedOnThePublicPort()
    {
        Uri appRoot = await StartSession();

        using HttpResponseMessage response = await CreateEditorInstance(
            "developer",
            appRoot,
            "Task_1",
            _factory.CreatePublicClient()
        );

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    internal static void AddV9App(string workingCopy, string appLibVersion)
    {
        RepositoryRoot.AddFile(workingCopy, "App/App.csproj", Project(appLibVersion));
        RepositoryRoot.AddFile(
            workingCopy,
            "App/config/applicationmetadata.json",
            """
            {
              "id": "ttd/my-app",
              "org": "ttd",
              "dataTypes": [
                { "id": "model", "taskId": "Task_1", "appLogic": { "autoCreate": true, "classRef": "Altinn.App.Models.Model" } },
                { "id": "ref-data-as-pdf", "allowedContentTypes": ["application/pdf"] }
              ]
            }
            """
        );
        RepositoryRoot.AddFile(
            workingCopy,
            "App/config/texts/resource.nb.json",
            """{"language":"nb","resources":[{"id":"appName","value":"Min app"}]}"""
        );
        RepositoryRoot.AddFile(workingCopy, "App/config/process/process.bpmn", ProcessDefinitionTests.DataThenPdf);
        RepositoryRoot.AddFile(workingCopy, "App/ui/Task_1/Settings.json", """{"pages":{"order":["Side1"]}}""");
        RepositoryRoot.AddFile(
            workingCopy,
            "App/ui/Task_1/layouts/Side1.json",
            """{"data":{"layout":[{"id":"name","type":"Input","dataModelBindings":{"simpleBinding":"name"}}]}}"""
        );
        RepositoryRoot.AddFile(
            workingCopy,
            "App/models/model.schema.json",
            """{"type":"object","properties":{"name":{"type":"string"}}}"""
        );
    }

    private static string Value(JsonNode? node) => (string?)node ?? throw new InvalidOperationException("No value.");

    private static string Project(string appLibVersion) =>
        $"""
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="{appLibVersion}" />
              </ItemGroup>
            </Project>
            """;

    private async Task<Uri> StartSession()
    {
        using HttpResponseMessage response = await SessionApiTests.Start(
            _factory.CreateInternalClient(),
            "developer",
            "ttd",
            "my-app"
        );
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<StartSessionResponse>(
            TestContext.Current.CancellationToken
        );
        return body?.Url ?? throw new InvalidOperationException("No session URL.");
    }

    private Task<HttpResponseMessage> CreateEditorInstance(
        string developer,
        Uri sessionUrl,
        string taskId,
        HttpClient? client = null
    ) =>
        (client ?? _factory.CreateInternalClient()).PostAsJsonAsync(
            "/sessions/instances",
            new
            {
                developer,
                org = "ttd",
                app = "my-app",
                sessionUrl,
                taskId,
            },
            TestContext.Current.CancellationToken
        );

    private Task<HttpResponseMessage> Get(Uri url) =>
        _factory.CreatePublicClient().GetAsync(url, TestContext.Current.CancellationToken);

    private async Task<JsonObject> Send(HttpMethod method, Uri url, string? body = null)
    {
        using HttpResponseMessage response = await SendRaw(method, url, body);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonObject>(TestContext.Current.CancellationToken)
            ?? throw new InvalidOperationException("No response body.");
    }

    private async Task<HttpResponseMessage> SendRaw(HttpMethod method, Uri url, string? body)
    {
        using var request = new HttpRequestMessage(method, url);
        if (body is not null)
        {
            request.Content = new StringContent(body, Encoding.UTF8, "application/json");
        }

        return await _factory.CreatePublicClient().SendAsync(request, TestContext.Current.CancellationToken);
    }
}
