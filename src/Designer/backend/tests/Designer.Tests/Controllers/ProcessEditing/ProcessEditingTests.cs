using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using System.Xml.Linq;
using Altinn.Studio.Designer.Exceptions.AppDevelopment;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.ProcessEditing;

public sealed class ProcessEditingTests(WebApplicationFactory<Program> factory)
    : DesignerEndpointsTestsBase<ProcessEditingTests>(factory),
        IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<ISyncClient> _syncClient = new();
    private ILayoutReferenceUpdater _layoutReferenceUpdater;
    private string _repository;
    private string Endpoint => $"/designer/api/ttd/{_repository}/process-modelling/process-state";

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        var clients = new Mock<IHubClients<ISyncClient>>();
        clients.Setup(value => value.Group("testUser")).Returns(_syncClient.Object);
        var hub = new Mock<IHubContext<SyncHub, ISyncClient>>();
        hub.Setup(value => value.Clients).Returns(clients.Object);
        services.AddSingleton(hub.Object);
        if (_layoutReferenceUpdater is not null)
        {
            services.AddSingleton(_layoutReferenceUpdater);
        }
    }

    [Fact]
    public async Task Rename_RenamesTheFolderAndUpdatesEveryReference()
    {
        await CreateApp(withPolicy: true);
        string originalLayout = await File.ReadAllTextAsync(AppPath("ui/Task_1/layouts/Side1.json"));
        await File.WriteAllTextAsync(
            AppPath("ui/moreInfoSubform/layouts/Side1.json"),
            """
            { "data": { "layout": [ { "id": "summary", "type": "Summary2", "target": { "type": "page", "id": "Side1", "taskId": "Task_1" } } ] } }
            """
        );
        ProcessState initial = await GetState();
        ProcessEditRequest request = Rename(initial, "Task_1", "RenamedTask");

        ProcessState saved = await Save(request);

        Assert.Equal(request.BpmnXml, saved.BpmnXml);
        Assert.Equal(request.BpmnXml, await File.ReadAllTextAsync(ProcessPath));
        Assert.NotEqual(initial.Version, saved.Version);
        Assert.Equal(saved, await GetState());
        Assert.False(Directory.Exists(AppPath("ui/Task_1")));
        Assert.Equal(originalLayout, await File.ReadAllTextAsync(AppPath("ui/RenamedTask/layouts/Side1.json")));
        string metadata = await File.ReadAllTextAsync(AppPath("config/applicationmetadata.json"));
        Assert.Equal("RenamedTask", JsonNode.Parse(metadata)["dataTypes"][0]["taskId"].GetValue<string>());
        Assert.DoesNotContain("Task_1", metadata);
        string policy = await File.ReadAllTextAsync(PolicyPath);
        Assert.Contains("RenamedTask", policy);
        Assert.DoesNotContain("Task_1", policy);
        JsonNode summary = JsonNode.Parse(
            await File.ReadAllTextAsync(AppPath("ui/moreInfoSubform/layouts/Side1.json"))
        )["data"]["layout"][0];
        Assert.Equal("RenamedTask", summary["target"]["taskId"].GetValue<string>());
        _syncClient.Verify(
            client =>
                client.FileSyncSuccess(
                    It.Is<SyncSuccess>(success =>
                        success.Source.Name == "process-state"
                        && success.Source.Path == "App/config/process/process.bpmn"
                    )
                ),
            Times.Once
        );
        _syncClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Rename_InAnAppWithoutPolicy_RenamesTheFolder()
    {
        await CreateApp(withPolicy: false);
        ProcessState initial = await GetState();

        ProcessState saved = await Save(Rename(initial, "Task_1", "RenamedTask"));

        Assert.Contains("RenamedTask", saved.BpmnXml);
        Assert.False(Directory.Exists(AppPath("ui/Task_1")));
        Assert.True(Directory.Exists(AppPath("ui/RenamedTask")));
        Assert.Contains("RenamedTask", await File.ReadAllTextAsync(AppPath("config/applicationmetadata.json")));
        Assert.False(File.Exists(PolicyPath));
        _syncClient.Verify(client => client.FileSyncSuccess(It.IsAny<SyncSuccess>()), Times.Once);
        _syncClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Save_ADiagramOnlyChange_SavesTheXmlExactlyAsSent()
    {
        // Quotes, attribute spacing and CRLF make unintended XML serialization visible.
        await CreateApp(withPolicy: false);
        await File.WriteAllTextAsync(ProcessPath, ProcessWithDiagram("x=\"100\""));
        ProcessState initial = await GetState();
        string moved = ProcessWithDiagram("x = '250'").ReplaceLineEndings("\r\n");
        var request = new ProcessEditRequest { ExpectedVersion = initial.Version, BpmnXml = moved };

        ProcessState saved = await Save(request);

        Assert.Equal(Encoding.UTF8.GetBytes(moved), await File.ReadAllBytesAsync(ProcessPath));
        Assert.Equal(moved, saved.BpmnXml);
        Assert.Equal(moved, (await GetState()).BpmnXml);
        _syncClient.Verify(
            client =>
                client.FileSyncSuccess(
                    It.Is<SyncSuccess>(success =>
                        success.Source.Name == "process.bpmn"
                        && success.Source.Path == "App/config/process/process.bpmn"
                    )
                ),
            Times.Once
        );
        _syncClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Save_XmlThatDeclaresAnotherEncoding_IsSavedWithAUtf8Declaration()
    {
        await CreateApp(withPolicy: false);
        await File.WriteAllTextAsync(ProcessPath, ProcessWithDiagram("x=\"100\""));
        ProcessState initial = await GetState();
        string moved = ProcessWithDiagram("x=\"250\"")
            .Replace("encoding=\"UTF-8\"", "encoding=\"ISO-8859-1\"")
            .Replace("Utfylling", "Søknad");

        ProcessState saved = await Save(new ProcessEditRequest { ExpectedVersion = initial.Version, BpmnXml = moved });

        byte[] content = await File.ReadAllBytesAsync(ProcessPath);
        XDocument savedDocument = XDocument.Load(new MemoryStream(content));
        Assert.Equal("utf-8", savedDocument.Declaration?.Encoding);
        Assert.Equal(
            "Søknad",
            (string)savedDocument.Descendants().Single(e => e.Name.LocalName == "task").Attribute("name")
        );
        Assert.Equal(Encoding.UTF8.GetString(content), saved.BpmnXml);
    }

    [Fact]
    public async Task Save_ReplayingAnAppliedRequest_ReturnsConflict()
    {
        await CreateApp(withPolicy: true);
        ProcessState initial = await GetState();
        ProcessEditRequest request = Rename(initial, "Task_1", "RenamedTask");
        ProcessState saved = await Save(request);

        using HttpResponseMessage retry = await Put(request);

        Assert.Equal(HttpStatusCode.Conflict, retry.StatusCode);
        using JsonDocument body = JsonDocument.Parse(await retry.Content.ReadAsStringAsync());
        Assert.Equal("process_state_conflict", body.RootElement.GetProperty("code").GetString());
        Assert.Equal(saved, await GetState());
        Assert.True(Directory.Exists(AppPath("ui/RenamedTask")));
    }

    [Fact]
    public async Task Save_WithAStaleVersion_ReturnsConflictAndChangesNothing()
    {
        await CreateApp(withPolicy: false);
        ProcessState initial = await GetState();
        ProcessState saved = await Save(
            new ProcessEditRequest
            {
                ExpectedVersion = initial.Version,
                BpmnXml = initial.BpmnXml.Replace("Utfylling", "Updated name"),
            }
        );

        using HttpResponseMessage response = await Put(
            new ProcessEditRequest
            {
                ExpectedVersion = initial.Version,
                BpmnXml = initial.BpmnXml.Replace("Utfylling", "Another name"),
            }
        );

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        using JsonDocument body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("process_state_conflict", body.RootElement.GetProperty("code").GetString());
        Assert.False(string.IsNullOrWhiteSpace(body.RootElement.GetProperty("message").GetString()));
        Assert.Equal(saved, await GetState());
    }

    [Fact]
    public async Task Save_ARenameWithoutItsTaskIdChange_IsRejectedBeforeWriting()
    {
        await CreateApp(withPolicy: true);
        ProcessState initial = await GetState();
        string metadata = await File.ReadAllTextAsync(AppPath("config/applicationmetadata.json"));

        using HttpResponseMessage response = await Put(
            new ProcessEditRequest
            {
                ExpectedVersion = initial.Version,
                BpmnXml = initial.BpmnXml.Replace("Task_1", "RenamedTask"),
            }
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(
            "A task rename must include the old and new task IDs.",
            await response.Content.ReadAsStringAsync()
        );
        Assert.Equal(initial, await GetState());
        Assert.True(Directory.Exists(AppPath("ui/Task_1")));
        Assert.False(Directory.Exists(AppPath("ui/RenamedTask")));
        Assert.Equal(metadata, await File.ReadAllTextAsync(AppPath("config/applicationmetadata.json")));
    }

    [Theory]
    [InlineData("New.Task")]
    [InlineData("invalid/name")]
    [InlineData("moreInfoSubform")]
    public async Task Rename_ToAnInvalidOrExistingFolderName_IsRejectedBeforeWriting(string newTaskId)
    {
        await CreateApp(withPolicy: true);
        ProcessState initial = await GetState();
        string metadata = await File.ReadAllTextAsync(AppPath("config/applicationmetadata.json"));
        string policy = await File.ReadAllTextAsync(PolicyPath);

        using HttpResponseMessage response = await Put(Rename(initial, "Task_1", newTaskId));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(initial, await GetState());
        Assert.True(Directory.Exists(AppPath("ui/Task_1")));
        Assert.True(Directory.Exists(AppPath("ui/moreInfoSubform")));
        Assert.Equal(metadata, await File.ReadAllTextAsync(AppPath("config/applicationmetadata.json")));
        Assert.Equal(policy, await File.ReadAllTextAsync(PolicyPath));
        _syncClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Rename_OfATaskWithoutAFolderToTheNameOfALayoutSet_IsRejectedBeforeWriting()
    {
        await CreateApp(withPolicy: false);
        ProcessState initial = await GetState();
        ProcessState added = await Save(Snapshot(initial, AddTask(initial.BpmnXml, "Confirmation_1", "confirmation")));

        using HttpResponseMessage response = await Put(Rename(added, "Confirmation_1", "moreInfoSubform"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(
            "The task ID moreInfoSubform is already the name of a layout set.",
            await response.Content.ReadAsStringAsync()
        );
        Assert.Equal(added, await GetState());
    }

    [Theory]
    [InlineData("config/authorization/policy.xml")]
    [InlineData("config/applicationmetadata.json")]
    [InlineData("ui/moreInfoSubform/layouts/Side1.json")]
    public async Task Rename_WhenAFileItUpdatesCannotBeRead_IsRejectedBeforeWriting(string unreadableFile)
    {
        await CreateApp(withPolicy: true);
        await File.WriteAllTextAsync(AppPath(unreadableFile), "<not valid");
        ProcessState initial = await GetState();

        using HttpResponseMessage response = await Put(Rename(initial, "Task_1", "RenamedTask"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(
            $"The file App/{unreadableFile} cannot be read, so the edit cannot be applied.",
            await response.Content.ReadAsStringAsync()
        );
        Assert.Equal(initial, await GetState());
        Assert.True(Directory.Exists(AppPath("ui/Task_1")));
        Assert.False(Directory.Exists(AppPath("ui/RenamedTask")));
        _syncClient.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData(nameof(InvalidOperationException))]
    [InlineData(nameof(ArgumentException))]
    [InlineData(nameof(InvalidLayoutSetIdException))]
    [InlineData(nameof(NonUniqueLayoutSetIdException))]
    public async Task Rename_WhenAnUpdateFailsAfterTheFolderWasRenamed_RenamesTheFolderBack(string exceptionType)
    {
        Exception exception = exceptionType switch
        {
            nameof(InvalidOperationException) => new InvalidOperationException("Failed after writing."),
            nameof(ArgumentException) => new ArgumentException("Failed after writing."),
            nameof(InvalidLayoutSetIdException) => new InvalidLayoutSetIdException("Failed after writing."),
            _ => new NonUniqueLayoutSetIdException("Failed after writing."),
        };
        _layoutReferenceUpdater = new FailingLayoutReferenceUpdater(exception);
        await CreateApp(withPolicy: false);
        string process = await File.ReadAllTextAsync(ProcessPath);
        ProcessState initial = await GetState();

        using HttpResponseMessage response = await Put(Rename(initial, "Task_1", "RenamedTask"));

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.True(Directory.Exists(AppPath("ui/Task_1")));
        Assert.False(Directory.Exists(AppPath("ui/RenamedTask")));
        Assert.Equal(process, await File.ReadAllTextAsync(ProcessPath));
        _syncClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Save_WithEmptyEdit_IsRejected()
    {
        await CreateApp(withPolicy: false);
        ProcessState initial = await GetState();

        using HttpResponseMessage response = await Put(new ProcessEditRequest { ExpectedVersion = initial.Version });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(initial, await GetState());
    }

    [Fact]
    public async Task StateEndpoints_RejectV8AppsWithoutChangingTheirProcess()
    {
        _repository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest("ttd", "app-with-layoutsets", "testUser", _repository);
        string original = await File.ReadAllTextAsync(ProcessPath);

        using HttpResponseMessage read = await HttpClient.GetAsync(Endpoint);
        using HttpResponseMessage write = await Put(
            new ProcessEditRequest { ExpectedVersion = "version", BpmnXml = original.Replace("Task_1", "Task_2") }
        );

        Assert.Equal(HttpStatusCode.BadRequest, read.StatusCode);
        Assert.Equal("This operation requires a v9 app.", await read.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.BadRequest, write.StatusCode);
        Assert.Equal(original, await File.ReadAllTextAsync(ProcessPath));
    }

    private sealed class FailingLayoutReferenceUpdater(Exception exception) : ILayoutReferenceUpdater
    {
        public Task<bool> UpdateLayoutReferences(
            AltinnRepoEditingContext editingContext,
            List<Reference> referencesToUpdate,
            CancellationToken cancellationToken
        ) => throw exception;
    }

    private string AppPath(string relativePath) => Path.Combine(TestRepoPath, "App", relativePath);

    private string ProcessPath => AppPath("config/process/process.bpmn");

    private string PolicyPath => AppPath("config/authorization/policy.xml");

    private async Task CreateApp(bool withPolicy)
    {
        _repository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest("ttd", "app-with-layoutsets-v9", "testUser", _repository);
        if (withPolicy)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(PolicyPath));
            File.Copy(
                Path.Combine(
                    TestDataHelper.GetTestDataRepositoriesRootDirectory(),
                    "testUser/ttd/apps-test/App/config/authorization/policy.xml"
                ),
                PolicyPath
            );
        }
    }

    private static ProcessEditRequest Rename(ProcessState state, string oldId, string newId) =>
        new()
        {
            ExpectedVersion = state.Version,
            BpmnXml = state.BpmnXml.Replace(oldId, newId),
            Metadata = new ProcessDefinitionMetadata
            {
                TaskIdChange = new TaskIdChange { OldId = oldId, NewId = newId },
            },
        };

    private static ProcessEditRequest Snapshot(ProcessState state, string bpmnXml) =>
        new() { ExpectedVersion = state.Version, BpmnXml = bpmnXml };

    private static string AddTask(
        string bpmnXml,
        string id,
        string taskType,
        string config = "",
        string element = "task"
    ) =>
        bpmnXml.Replace(
            "</bpmn:process>",
            $"""
            <bpmn:{element} id="{id}"><bpmn:extensionElements><altinn:taskExtension><altinn:taskType>{taskType}</altinn:taskType>{config}</altinn:taskExtension></bpmn:extensionElements></bpmn:{element}>
              </bpmn:process>
            """
        );

    private async Task<ProcessState> GetState() => await HttpClient.GetFromJsonAsync<ProcessState>(Endpoint);

    private Task<HttpResponseMessage> Put(ProcessEditRequest request) =>
        HttpClient.PutAsJsonAsync(Endpoint, request, JsonSerializerOptions);

    private async Task<ProcessState> Save(ProcessEditRequest request)
    {
        using HttpResponseMessage response = await Put(request);
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        return await response.Content.ReadFromJsonAsync<ProcessState>();
    }

    private static string ProcessWithDiagram(string shapeX) =>
        $"""
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:altinn="http://altinn.no/process" id="Definitions" targetNamespace="http://bpmn.io/schema/bpmn">
              <bpmn:process id="Process" isExecutable="false">
                <bpmn:task id="Task_1" name="Utfylling">
                  <bpmn:extensionElements>
                    <altinn:taskExtension>
                      <altinn:taskType>data</altinn:taskType>
                    </altinn:taskExtension>
                  </bpmn:extensionElements>
                </bpmn:task>
              </bpmn:process>
              <bpmndi:BPMNDiagram id="Diagram">
                <bpmndi:BPMNPlane id="Plane" bpmnElement="Process">
                  <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1">
                    <dc:Bounds {shapeX} y="80" width="100" height="80"/>
                  </bpmndi:BPMNShape>
                </bpmndi:BPMNPlane>
              </bpmndi:BPMNDiagram>
            </bpmn:definitions>

            """;
}
