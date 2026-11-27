using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Nodes;
using Altinn.Studio.Preview.Sessions;

namespace Altinn.Studio.Preview.Tests.AppApi;

/// <summary>An app from the v9 template in preview, through the requests its frontend makes.</summary>
public sealed class V9TemplateTests : IDisposable
{
    private const string Org = "ttd";
    private const string App = "my-app";
    private const int PartyId = 51001;

    private static readonly AppApiSpec s_appApi = AppApiSpec.Load();

    private readonly PreviewApplicationFactory _factory = new();
    private readonly List<string> _differences = [];

    public V9TemplateTests()
    {
        string workingCopy = _factory.Root.AddWorkingCopy("developer", Org, App);
        string template = Path.Combine(AppContext.BaseDirectory, "AppTemplate");
        foreach (string file in Directory.EnumerateFiles(template, "*", SearchOption.AllDirectories))
        {
            string target = Path.Combine(workingCopy, Path.GetRelativePath(template, file));
            Directory.CreateDirectory(Path.GetDirectoryName(target) ?? workingCopy);
            File.Copy(file, target);
        }
    }

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task Form_CanChangeTheDataModels_OfTheFirstTask()
    {
        Uri appRoot = await StartSession();
        JsonNode instance = await Send(HttpMethod.Post, appRoot, $"instances?instanceOwnerPartyId={PartyId}");
        string task = Value(instance["process"]?["currentTask"]?["elementId"]);

        JsonNode form = await Send(HttpMethod.Get, appRoot, $"instances/{instance["id"]}/bootstrap-form/{task}");

        JsonObject dataModels = Assert.IsType<JsonObject>(form["dataModels"]);
        Assert.NotEmpty(dataModels);
        Assert.All(dataModels, model => Assert.True((bool?)model.Value?["writable"], $"{model.Key} is not writable."));
    }

    [Fact]
    public async Task Answers_MatchTheAppApi()
    {
        Uri appRoot = await StartSession();

        await Send(HttpMethod.Get, appRoot, "api/authentication/keepAlive");
        await Send(HttpMethod.Get, appRoot, "api/v1/parties?allowedToInstantiateFilter=true");
        await Send(HttpMethod.Put, appRoot, $"api/v1/parties/{PartyId}");
        await Send(HttpMethod.Get, appRoot, "api/v1/texts/nb");
        await Send(HttpMethod.Get, appRoot, $"instances/{PartyId}/active");
        JsonNode instance = await Send(HttpMethod.Post, appRoot, $"instances?instanceOwnerPartyId={PartyId}");
        string instancePath = $"instances/{instance["id"]}";
        await Send(HttpMethod.Get, appRoot, instancePath);
        await Send(HttpMethod.Get, appRoot, $"{instancePath}/enriched");
        string task = Value(instance["process"]?["currentTask"]?["elementId"]);
        await Send(HttpMethod.Get, appRoot, $"{instancePath}/bootstrap-form/{task}");
        await Send(HttpMethod.Patch, appRoot, $"{instancePath}/data", """{"patches":[],"ignoredValidators":[]}""");
        await Send(HttpMethod.Put, appRoot, $"{instancePath}/process/next?returnInstance=true");
        await Send(HttpMethod.Get, appRoot, $"{instancePath}/enriched");

        Assert.True(
            _differences.Count == 0,
            "Preview's mock of the app API in AppApiEndpoints answers otherwise than the app API:"
                + Environment.NewLine
                + string.Join(Environment.NewLine, _differences)
        );
    }

    private static string Value(JsonNode? node) => (string?)node ?? throw new InvalidOperationException("No value.");

    private async Task<Uri> StartSession()
    {
        using HttpResponseMessage response = await SessionApiTests.Start(
            _factory.CreateInternalClient(),
            "developer",
            Org,
            App
        );
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<StartSessionResponse>(
            TestContext.Current.CancellationToken
        );
        return body?.Url ?? throw new InvalidOperationException("No session URL.");
    }

    private async Task<JsonNode> Send(HttpMethod method, Uri appRoot, string path, string? body = null)
    {
        var url = new Uri(appRoot, path);
        using var request = new HttpRequestMessage(method, url);
        if (body is not null)
        {
            request.Content = new StringContent(body, Encoding.UTF8, "application/json");
        }

        using HttpResponseMessage response = await _factory
            .CreatePublicClient()
            .SendAsync(request, TestContext.Current.CancellationToken);
        Assert.True(response.IsSuccessStatusCode, $"{method} {path} answered {(int)response.StatusCode}.");
        JsonNode? answer =
            response.Content.Headers.ContentType?.MediaType == "application/json"
                ? await response.Content.ReadFromJsonAsync<JsonNode>(TestContext.Current.CancellationToken)
                : null;

        // The session's ID is the first segment, and the app's root follows it.
        string appPath =
            "/" + string.Join('/', url.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries)[1..]);
        _differences.AddRange(s_appApi.Differences(method, appPath, response.StatusCode, answer));
        return answer ?? new JsonObject();
    }
}
