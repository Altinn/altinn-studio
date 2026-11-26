using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Nodes;
using Altinn.Studio.Preview.Sessions;

namespace Altinn.Studio.Preview.Tests.AppApi;

public sealed class V8AppTests : IDisposable
{
    private const string FrontendScript =
        """<script src="https://altinncdn.no/toolkits/altinn-app-frontend/4/altinn-app-frontend.js"></script>""";

    private const string StartPage = $$"""
        <!DOCTYPE html>
        <html lang="no">
        <head>
          <meta charset="utf-8">
          <title>@ViewBag.Org - @ViewBag.App</title>
          <style>@@media print { body { margin: 0; } }</style>
        </head>
        <body>
          <div id="root"></div>
          <script>
            const appId = window.location.pathname.split('/');
            window.org = appId[1];
            window.app = appId[2];
          </script>
          {{FrontendScript}}
        </body>
        </html>
        """;

    private const string DataThenConfirmation = """
        <?xml version="1.0" encoding="utf-8"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process">
          <bpmn:process id="Process_1">
            <bpmn:startEvent id="StartEvent_1" />
            <bpmn:task id="Task_1" name="Utfylling">
              <bpmn:extensionElements>
                <altinn:taskExtension><altinn:taskType>data</altinn:taskType></altinn:taskExtension>
              </bpmn:extensionElements>
            </bpmn:task>
            <bpmn:task id="Task_2" name="Bekreftelse">
              <bpmn:extensionElements>
                <altinn:taskExtension><altinn:taskType>confirmation</altinn:taskType></altinn:taskExtension>
              </bpmn:extensionElements>
            </bpmn:task>
            <bpmn:endEvent id="EndEvent_1" />
            <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
            <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Task_2" />
            <bpmn:sequenceFlow id="Flow_3" sourceRef="Task_2" targetRef="EndEvent_1" />
          </bpmn:process>
        </bpmn:definitions>
        """;

    private readonly PreviewApplicationFactory _factory = new();
    private readonly string _workingCopy;

    public V8AppTests()
    {
        _workingCopy = _factory.Root.AddWorkingCopy("developer", "ttd", "my-app");
        AddV8App(_workingCopy);
    }

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task Page_IsTheAppsOwn_WithTheSessionInTheFrontendsPaths()
    {
        Uri appRoot = await StartSession();

        using HttpResponseMessage response = await Get(appRoot);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        string page = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        string sessionId = appRoot.Segments[1].TrimEnd('/');
        Assert.StartsWith("<!DOCTYPE html><script>", page, StringComparison.Ordinal);
        Assert.Contains($"pin(\"org\", \"{sessionId}/ttd\");", page, StringComparison.Ordinal);
        Assert.Contains("pin(\"app\", \"my-app\");", page, StringComparison.Ordinal);
        Assert.Contains(FrontendScript, page, StringComparison.Ordinal);
        Assert.True(
            page.IndexOf("pin(\"org\"", StringComparison.Ordinal)
                < page.IndexOf("window.org = appId[1];", StringComparison.Ordinal),
            "The page's own script must run after preview's."
        );
    }

    [Fact]
    public async Task Page_GetsTheOrgAndAppThatRazorWouldWrite_AndKeepsOtherRazorAsText()
    {
        RepositoryRoot.AddFile(
            _workingCopy,
            "App/views/Home/Index.cshtml",
            StartPage.Replace(
                "<div id=\"root\"></div>",
                "<div id=\"root\">@Html.Raw(Model.Banner)</div>",
                StringComparison.Ordinal
            )
        );
        Uri appRoot = await StartSession();

        using HttpResponseMessage response = await Get(appRoot);

        string page = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        Assert.Contains("<title>ttd - my-app</title>", page, StringComparison.Ordinal);
        Assert.Contains("<style>@media print", page, StringComparison.Ordinal);
        Assert.Contains("@Html.Raw(Model.Banner)", page, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Page_StartsWithPreviewsScript_WhenTheAppsPageHasNoDoctype()
    {
        RepositoryRoot.AddFile(
            _workingCopy,
            "App/views/Home/Index.cshtml",
            $"<html><body>{FrontendScript}</body></html>"
        );
        Uri appRoot = await StartSession();

        using HttpResponseMessage response = await Get(appRoot);

        string page = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        Assert.StartsWith("<script>", page, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("instance/51001/0b0c6d0f-8ad4-4d7f-bd38-4b2c6f8bd3a0/Task_1/Side1")]
    [InlineData("Side1")]
    [InlineData("missing.png")]
    [InlineData("api/v1/missing")]
    public async Task Page_IsServedAtTheAppsRootOnly(string route)
    {
        Uri appRoot = await StartSession();

        using HttpResponseMessage response = await Get(new Uri(appRoot, route));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Page_IsNotFound_WhenTheAppHasNone()
    {
        File.Delete(Path.Combine(_workingCopy, "App/views/Home/Index.cshtml"));
        Uri appRoot = await StartSession();

        using HttpResponseMessage response = await Get(appRoot);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task ApplicationMetadata_NamesTheAppLibrary_AndLetsAnyPartyIn()
    {
        Uri appRoot = await StartSession();

        JsonObject metadata = await Send(HttpMethod.Get, new Uri(appRoot, "api/v1/applicationmetadata"));

        Assert.Equal("ttd/my-app", (string?)metadata["id"]);
        Assert.Equal("8.6.4.0", (string?)metadata["altinnNugetVersion"]);
        Assert.False((bool?)metadata["partyTypesAllowed"]?["person"]);
        Assert.False((bool?)metadata["partyTypesAllowed"]?["organisation"]);
    }

    [Fact]
    public async Task Frontend_ReadsTheAppsFilesOneByOne()
    {
        Uri appRoot = await StartSession();

        JsonObject layoutSets = await Send(HttpMethod.Get, new Uri(appRoot, "api/layoutsets"));
        Assert.Equal("form", (string?)layoutSets["sets"]?[0]?["id"]);

        JsonObject layouts = await Send(HttpMethod.Get, new Uri(appRoot, "api/layouts/form"));
        Assert.Equal("name", (string?)layouts["Side1"]?["data"]?["layout"]?[0]?["id"]);

        JsonObject settings = await Send(HttpMethod.Get, new Uri(appRoot, "api/layoutsettings/form"));
        Assert.Equal("Side1", (string?)settings["pages"]?["order"]?[0]);

        JsonObject schema = await Send(HttpMethod.Get, new Uri(appRoot, "api/jsonschema/model"));
        Assert.Equal("object", (string?)schema["type"]);

        JsonObject texts = await Send(HttpMethod.Get, new Uri(appRoot, "api/v1/texts/nb"));
        Assert.Equal("appName", (string?)texts["resources"]?[0]?["id"]);

        JsonArray languages = await SendForArray(new Uri(appRoot, "api/v1/applicationlanguages"));
        Assert.Equal("nb", (string?)Assert.Single(languages)?["language"]);

        JsonArray countries = await SendForArray(new Uri(appRoot, "api/options/countries"));
        Assert.Equal("NO", (string?)Assert.Single(countries)?["value"]);
    }

    [Fact]
    public async Task Frontend_GetsTheMockUserAndParty()
    {
        Uri appRoot = await StartSession();

        JsonObject profile = await Send(HttpMethod.Get, new Uri(appRoot, "api/v1/profile/user"));
        Assert.Equal(51001, (int?)profile["partyId"]);
        Assert.Equal("nb", (string?)profile["profileSettingPreference"]?["language"]);

        JsonObject party = await Send(
            HttpMethod.Get,
            new Uri(appRoot, "api/authorization/parties/current?returnPartyObject=true")
        );
        Assert.Equal(51001, (int?)party["partyId"]);
    }

    [Theory]
    [InlineData("api/v1/footer")]
    [InlineData("api/layoutsettings/missing")]
    [InlineData("api/ruleconfiguration/form")]
    [InlineData("api/rulehandler/form")]
    [InlineData("api/validationconfig/model")]
    public async Task Frontend_GetsNoContent_ForAFileTheAppDoesNotHave(string route)
    {
        Uri appRoot = await StartSession();

        using HttpResponseMessage response = await Get(new Uri(appRoot, route));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Frontend_GetsTheLayoutSetsRulesAndValidation_WhenTheAppHasThem()
    {
        RepositoryRoot.AddFile(_workingCopy, "App/ui/form/RuleHandler.js", "var ruleHandlerObject = {};");
        RepositoryRoot.AddFile(
            _workingCopy,
            "App/ui/form/RuleConfiguration.json",
            """{"data":{"ruleConnection":{}}}"""
        );
        RepositoryRoot.AddFile(_workingCopy, "App/models/model.validation.json", """{"validations":{}}""");
        Uri appRoot = await StartSession();

        using HttpResponseMessage ruleHandler = await Get(new Uri(appRoot, "api/rulehandler/form"));
        Assert.Equal(
            "var ruleHandlerObject = {};",
            await ruleHandler.Content.ReadAsStringAsync(TestContext.Current.CancellationToken)
        );

        JsonObject ruleConfiguration = await Send(HttpMethod.Get, new Uri(appRoot, "api/ruleconfiguration/form"));
        Assert.NotNull(ruleConfiguration["data"]?["ruleConnection"]);

        JsonObject validation = await Send(HttpMethod.Get, new Uri(appRoot, "api/validationconfig/model"));
        Assert.NotNull(validation["validations"]);
    }

    [Fact]
    public async Task Options_AreEmpty_ForACodeListTheAppMakesInCode()
    {
        Uri appRoot = await StartSession();

        JsonArray options = await SendForArray(new Uri(appRoot, "api/options/from-code"));

        Assert.Empty(options);
    }

    [Fact]
    public async Task Instance_GoesThroughTheProcess()
    {
        Uri appRoot = await StartSession();

        JsonObject instance = await Send(HttpMethod.Post, new Uri(appRoot, "instances?instanceOwnerPartyId=51001"));
        string instanceId = Value(instance["id"]);
        string dataElementId = Value(instance["data"]?[0]?["id"]);
        Uri instanceUrl = new(appRoot, $"instances/{instanceId}/");

        JsonObject process = await Send(HttpMethod.Get, new Uri(instanceUrl, "process"));
        Assert.Equal("Task_1", (string?)process["currentTask"]?["elementId"]);
        Assert.True((bool?)process["currentTask"]?["write"]);
        Assert.Equal(
            ["Task_1:data", "Task_2:confirmation"],
            (process["processTasks"]?.AsArray() ?? []).Select(task => $"{task?["elementId"]}:{task?["altinnTaskType"]}")
        );

        Uri dataElementUrl = new(instanceUrl, $"data/{dataElementId}");
        JsonObject formData = await Send(HttpMethod.Get, new Uri($"{dataElementUrl}?includeRowId=true&language=nb"));
        Assert.Empty(formData);

        JsonObject patched = await Send(
            HttpMethod.Patch,
            dataElementUrl,
            """{"patch":[{"op":"add","path":"/name","value":"Kari"}],"ignoredValidators":[]}"""
        );
        Assert.Equal("Kari", (string?)patched["newDataModel"]?["name"]);
        Assert.Empty(patched["validationIssues"]?.AsObject() ?? throw new InvalidOperationException("No issues."));
        Assert.Equal(instanceId, (string?)patched["instance"]?["id"]);

        JsonObject multiPatched = await Send(
            HttpMethod.Patch,
            new Uri(instanceUrl, "data"),
            $$"""{"patches":[{"dataElementId":"{{dataElementId}}","patch":[{"op":"add","path":"/age","value":42}]}],"ignoredValidators":[]}"""
        );
        Assert.Equal("Kari", (string?)multiPatched["newDataModels"]?[0]?["data"]?["name"]);

        JsonObject saved = await Send(HttpMethod.Get, dataElementUrl);
        Assert.Equal(42, (int?)saved["age"]);

        Assert.Empty(await SendForArray(new Uri(instanceUrl, "validate?language=nb")));
        Assert.Empty(await SendForArray(new Uri($"{dataElementUrl}/validate")));

        JsonObject atConfirmation = await Send(HttpMethod.Put, new Uri(instanceUrl, "process/next?language=nb"));
        Assert.Equal("Task_2", (string?)atConfirmation["currentTask"]?["elementId"]);

        JsonObject ended = await Send(HttpMethod.Put, new Uri(instanceUrl, "process/next"));
        Assert.Null(ended["currentTask"]);
        Assert.Equal("EndEvent_1", (string?)ended["endEvent"]);

        JsonObject archived = await Send(HttpMethod.Get, instanceUrl);
        Assert.True((bool?)archived["data"]?[0]?["locked"]);
    }

    [Fact]
    public async Task FormData_IsNotFound_ForADataElementTheInstanceLacks()
    {
        Uri appRoot = await StartSession();
        JsonObject instance = await Send(HttpMethod.Post, new Uri(appRoot, "instances?instanceOwnerPartyId=51001"));

        using HttpResponseMessage response = await Get(
            new Uri(appRoot, $"instances/{instance["id"]}/data/0b0c6d0f-8ad4-4d7f-bd38-4b2c6f8bd3a0")
        );

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task EditorInstance_StartsAtTheTask()
    {
        Uri appRoot = await StartSession();

        using HttpResponseMessage response = await _factory
            .CreateInternalClient()
            .PostAsJsonAsync(
                "/sessions/instances",
                new
                {
                    developer = "developer",
                    org = "ttd",
                    app = "my-app",
                    sessionUrl = appRoot,
                    taskId = "Task_2",
                },
                TestContext.Current.CancellationToken
            );

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonObject>(TestContext.Current.CancellationToken);
        JsonObject process = await Send(HttpMethod.Get, new Uri(appRoot, $"instances/{body?["instanceId"]}/process"));
        Assert.Equal("Task_2", (string?)process["currentTask"]?["elementId"]);
        Assert.Equal("confirmation", (string?)process["currentTask"]?["altinnTaskType"]);
    }

    private static void AddV8App(string workingCopy)
    {
        RepositoryRoot.AddFile(
            workingCopy,
            "App/App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="8.6.4" />
              </ItemGroup>
            </Project>
            """
        );
        RepositoryRoot.AddFile(workingCopy, "App/views/Home/Index.cshtml", StartPage);
        RepositoryRoot.AddFile(
            workingCopy,
            "App/config/applicationmetadata.json",
            """
            {
              "id": "ttd/my-app",
              "org": "ttd",
              "partyTypesAllowed": { "bankruptcyEstate": false, "organisation": true, "person": false, "subUnit": false },
              "dataTypes": [
                { "id": "model", "taskId": "Task_1", "appLogic": { "autoCreate": true, "classRef": "Altinn.App.Models.Model" } }
              ]
            }
            """
        );
        RepositoryRoot.AddFile(
            workingCopy,
            "App/config/texts/resource.nb.json",
            """{"language":"nb","resources":[{"id":"appName","value":"Min app"}]}"""
        );
        RepositoryRoot.AddFile(workingCopy, "App/config/process/process.bpmn", DataThenConfirmation);
        RepositoryRoot.AddFile(
            workingCopy,
            "App/ui/layout-sets.json",
            """{"sets":[{"id":"form","dataType":"model","tasks":["Task_1"]}]}"""
        );
        RepositoryRoot.AddFile(workingCopy, "App/ui/form/Settings.json", """{"pages":{"order":["Side1"]}}""");
        RepositoryRoot.AddFile(
            workingCopy,
            "App/ui/form/layouts/Side1.json",
            """{"data":{"layout":[{"id":"name","type":"Input","dataModelBindings":{"simpleBinding":"name"}}]}}"""
        );
        RepositoryRoot.AddFile(
            workingCopy,
            "App/models/model.schema.json",
            """{"type":"object","properties":{"name":{"type":"string"},"age":{"type":"integer"}}}"""
        );
        RepositoryRoot.AddFile(workingCopy, "App/options/countries.json", """[{"value":"NO","label":"Norge"}]""");
    }

    private static string Value(JsonNode? node) => (string?)node ?? throw new InvalidOperationException("No value.");

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

    private Task<HttpResponseMessage> Get(Uri url) =>
        _factory.CreatePublicClient().GetAsync(url, TestContext.Current.CancellationToken);

    private async Task<JsonObject> Send(HttpMethod method, Uri url, string? body = null)
    {
        using var request = new HttpRequestMessage(method, url);
        if (body is not null)
        {
            request.Content = new StringContent(body, Encoding.UTF8, "application/json");
        }

        using HttpResponseMessage response = await _factory
            .CreatePublicClient()
            .SendAsync(request, TestContext.Current.CancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonObject>(TestContext.Current.CancellationToken)
            ?? throw new InvalidOperationException("No response body.");
    }

    private async Task<JsonArray> SendForArray(Uri url)
    {
        using HttpResponseMessage response = await Get(url);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonArray>(TestContext.Current.CancellationToken)
            ?? throw new InvalidOperationException("No response body.");
    }
}
