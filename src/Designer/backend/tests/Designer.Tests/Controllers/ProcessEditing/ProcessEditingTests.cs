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
        using HttpResponseMessage operation = await Put(
            new ProcessEditRequest
            {
                ExpectedVersion = "version",
                LayoutSetDeletion = new ProcessLayoutSetDeletion("layoutSet1"),
            }
        );

        Assert.Equal(HttpStatusCode.BadRequest, read.StatusCode);
        Assert.Equal("This operation requires a v9 app.", await read.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.BadRequest, write.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, operation.StatusCode);
        Assert.Equal(original, await File.ReadAllTextAsync(ProcessPath));
        Assert.True(Directory.Exists(AppPath("ui/layoutSet1")));
    }

    [Fact]
    public async Task CreateLayoutSet_CreatesTheFolderWithoutChangingTheProcess()
    {
        // Exercise the editor's camelCase JSON against LayoutSetPayload's PascalCase property.
        await CreateApp(withPolicy: false);
        ProcessState initial = await GetState();
        string body = $$"""
            {
              "expectedVersion": "{{initial.Version}}",
              "layoutSetCreation": {
                "layoutSetConfig": { "id": "CustomReceipt", "dataType": "model", "taskId": "CustomReceipt" }
              }
            }
            """;

        using HttpResponseMessage response = await HttpClient.PutAsync(
            Endpoint,
            new StringContent(body, Encoding.UTF8, "application/json")
        );

        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        ProcessState saved = await response.Content.ReadFromJsonAsync<ProcessState>();
        Assert.Equal(initial.BpmnXml, saved.BpmnXml);
        Assert.NotEqual(initial.Version, saved.Version);
        Assert.Equal(saved, await GetState());
        JsonNode settings = JsonNode.Parse(await File.ReadAllTextAsync(AppPath("ui/CustomReceipt/Settings.json")));
        Assert.Equal("model", settings["defaultDataType"].GetValue<string>());
        VerifyOneNotification();
    }

    [Fact]
    public async Task CreateLayoutSet_ThatAlreadyExists_IsRejected()
    {
        await CreateApp(withPolicy: false);
        ProcessState initial = await GetState();
        string settings = await File.ReadAllTextAsync(AppPath("ui/Task_1/Settings.json"));

        using HttpResponseMessage response = await Put(CreateLayoutSet(initial, "Task_1"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(initial, await GetState());
        Assert.Equal(settings, await File.ReadAllTextAsync(AppPath("ui/Task_1/Settings.json")));
        _syncClient.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData("moreInfoSubform")]
    [InlineData("New.Task")]
    [InlineData("../Task_1")]
    public async Task CreateLayoutSet_WithTheNameOfASubformOrAnInvalidName_IsRejected(string layoutSetId)
    {
        await CreateApp(withPolicy: false);
        ProcessState initial = await GetState();
        string subformSettings = await File.ReadAllTextAsync(AppPath("ui/moreInfoSubform/Settings.json"));

        using HttpResponseMessage response = await Put(CreateLayoutSet(initial, layoutSetId));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(initial, await GetState());
        Assert.Equal(subformSettings, await File.ReadAllTextAsync(AppPath("ui/moreInfoSubform/Settings.json")));
        _syncClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task DeleteLayoutSet_DeletesTheFolderAndTheReferencesToItsTask()
    {
        await CreateApp(withPolicy: false);
        await File.WriteAllTextAsync(AppPath("ui/moreInfoSubform/layouts/Side1.json"), SummaryOfTask1);
        ProcessState initial = await GetState();

        ProcessState saved = await Save(
            new ProcessEditRequest
            {
                ExpectedVersion = initial.Version,
                LayoutSetDeletion = new ProcessLayoutSetDeletion("Task_1"),
            }
        );

        Assert.Equal(initial.BpmnXml, saved.BpmnXml);
        Assert.NotEqual(initial.Version, saved.Version);
        Assert.False(Directory.Exists(AppPath("ui/Task_1")));
        string metadata = await File.ReadAllTextAsync(AppPath("config/applicationmetadata.json"));
        Assert.Null(JsonNode.Parse(metadata)["dataTypes"][0]["taskId"]);
        JsonNode subformLayout = JsonNode.Parse(
            await File.ReadAllTextAsync(AppPath("ui/moreInfoSubform/layouts/Side1.json"))
        );
        Assert.Empty(subformLayout["data"]["layout"].AsArray());
        VerifyOneNotification();
    }

    [Fact]
    public async Task DeleteLayoutSet_ThatDoesNotExist_IsRejected()
    {
        await CreateApp(withPolicy: false);
        ProcessState initial = await GetState();

        using HttpResponseMessage response = await Put(
            new ProcessEditRequest
            {
                ExpectedVersion = initial.Version,
                LayoutSetDeletion = new ProcessLayoutSetDeletion("CustomReceipt"),
            }
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("The layout set to delete does not exist.", await response.Content.ReadAsStringAsync());
        Assert.Equal(initial, await GetState());
        Assert.True(Directory.Exists(AppPath("ui/Task_1")));
        _syncClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task RenameLayoutSet_OfTheCustomReceipt_RenamesOnlyTheFolder()
    {
        await CreateApp(withPolicy: false);
        CopyDirectory(AppPath("ui/Task_1"), AppPath("ui/CustomReceipt"));
        ProcessState initial = await GetState();
        string metadata = await File.ReadAllTextAsync(AppPath("config/applicationmetadata.json"));

        ProcessState saved = await Save(RenameLayoutSet(initial, "CustomReceipt", "RenamedReceipt"));

        Assert.Equal(initial.BpmnXml, saved.BpmnXml);
        Assert.NotEqual(initial.Version, saved.Version);
        Assert.False(Directory.Exists(AppPath("ui/CustomReceipt")));
        Assert.True(File.Exists(AppPath("ui/RenamedReceipt/layouts/Side1.json")));
        Assert.True(Directory.Exists(AppPath("ui/Task_1")));
        Assert.Equal(metadata, await File.ReadAllTextAsync(AppPath("config/applicationmetadata.json")));
        VerifyOneNotification();
    }

    [Fact]
    public async Task RenameLayoutSet_OfASubform_UpdatesTheSubformComponentsThatUseIt()
    {
        await CreateApp(withPolicy: false);
        await File.WriteAllTextAsync(AppPath("ui/Task_1/layouts/Side1.json"), SubformComponentLayout);
        ProcessState initial = await GetState();

        ProcessState saved = await Save(RenameLayoutSet(initial, "moreInfoSubform", "renamedSubform"));

        Assert.Equal(initial.BpmnXml, saved.BpmnXml);
        Assert.True(Directory.Exists(AppPath("ui/renamedSubform")));
        JsonNode component = JsonNode.Parse(await File.ReadAllTextAsync(AppPath("ui/Task_1/layouts/Side1.json")))[
            "data"
        ]["layout"][0];
        Assert.Equal("renamedSubform", component["layoutSet"].GetValue<string>());
        VerifyOneNotification();
    }

    [Fact]
    public async Task RenameLayoutSet_OfATask_RenamesTheTaskAndEveryReference()
    {
        await CreateApp(withPolicy: true);
        await File.WriteAllTextAsync(ProcessPath, ProcessWithSequenceFlow);
        await File.WriteAllTextAsync(AppPath("ui/moreInfoSubform/layouts/Side1.json"), SummaryOfTask1);
        string originalLayout = await File.ReadAllTextAsync(AppPath("ui/Task_1/layouts/Side1.json"));
        ProcessState initial = await GetState();

        ProcessState saved = await Save(RenameLayoutSet(initial, "Task_1", "RenamedTask"));

        string expectedProcess = ProcessWithSequenceFlow.Replace("\"Task_1\"", "\"RenamedTask\"");
        Assert.Equal(Encoding.UTF8.GetBytes(expectedProcess), await File.ReadAllBytesAsync(ProcessPath));
        Assert.Equal(expectedProcess, saved.BpmnXml);
        Assert.NotEqual(initial.Version, saved.Version);
        Assert.Equal(saved, await GetState());
        Assert.False(Directory.Exists(AppPath("ui/Task_1")));
        Assert.Equal(originalLayout, await File.ReadAllTextAsync(AppPath("ui/RenamedTask/layouts/Side1.json")));
        string metadata = await File.ReadAllTextAsync(AppPath("config/applicationmetadata.json"));
        Assert.Equal("RenamedTask", JsonNode.Parse(metadata)["dataTypes"][0]["taskId"].GetValue<string>());
        string policy = await File.ReadAllTextAsync(PolicyPath);
        Assert.Contains("RenamedTask", policy);
        Assert.DoesNotContain("Task_1", policy);
        JsonNode summary = JsonNode.Parse(
            await File.ReadAllTextAsync(AppPath("ui/moreInfoSubform/layouts/Side1.json"))
        )["data"]["layout"][0];
        Assert.Equal("RenamedTask", summary["target"]["taskId"].GetValue<string>());
        VerifyOneNotification();
    }

    [Theory]
    [InlineData("Task_1", "StartEvent_1")]
    [InlineData("Task_1", "New.Task")]
    [InlineData("Task_1", "moreInfoSubform")]
    [InlineData("CustomReceipt", "RenamedReceipt")]
    public async Task RenameLayoutSet_WithUsedOrInvalidName_IsRejectedBeforeWriting(string oldName, string newName)
    {
        await CreateApp(withPolicy: true);
        await File.WriteAllTextAsync(ProcessPath, ProcessWithSequenceFlow);
        ProcessState initial = await GetState();
        string metadata = await File.ReadAllTextAsync(AppPath("config/applicationmetadata.json"));
        string policy = await File.ReadAllTextAsync(PolicyPath);

        using HttpResponseMessage response = await Put(RenameLayoutSet(initial, oldName, newName));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(initial, await GetState());
        Assert.True(Directory.Exists(AppPath("ui/Task_1")));
        Assert.Equal(metadata, await File.ReadAllTextAsync(AppPath("config/applicationmetadata.json")));
        Assert.Equal(policy, await File.ReadAllTextAsync(PolicyPath));
        _syncClient.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData("StartEvent_1")]
    [InlineData("Confirmation_1")]
    public async Task RenameLayoutSet_OfTheCustomReceiptToTheIdOfAProcessElement_IsRejectedBeforeWriting(string newName)
    {
        await CreateApp(withPolicy: false);
        CopyDirectory(AppPath("ui/Task_1"), AppPath("ui/CustomReceipt"));
        ProcessState initial = await GetState();
        ProcessState added = await Save(Snapshot(initial, AddTask(initial.BpmnXml, "Confirmation_1", "confirmation")));

        using HttpResponseMessage response = await Put(RenameLayoutSet(added, "CustomReceipt", newName));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal($"The name {newName} is already used in the process.", await response.Content.ReadAsStringAsync());
        Assert.Equal(added, await GetState());
        Assert.True(Directory.Exists(AppPath("ui/CustomReceipt")));
    }

    [Fact]
    public async Task RenameLayoutSet_WhenUpdatingTheReferencesFails_RenamesTheFolderBack()
    {
        _layoutReferenceUpdater = new FailingLayoutReferenceUpdater(
            new InvalidOperationException("Failed after writing.")
        );
        await CreateApp(withPolicy: false);
        CopyDirectory(AppPath("ui/Task_1"), AppPath("ui/CustomReceipt"));
        ProcessState initial = await GetState();

        using HttpResponseMessage response = await Put(RenameLayoutSet(initial, "CustomReceipt", "RenamedReceipt"));

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal(initial, await GetState());
        Assert.True(Directory.Exists(AppPath("ui/CustomReceipt")));
        Assert.False(Directory.Exists(AppPath("ui/RenamedReceipt")));
        _syncClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ChangeDataTypes_ConnectsTheDataTypeToTheTask()
    {
        await CreateApp(withPolicy: false);
        ProcessState initial = await GetState();

        ProcessState saved = await Save(ChangeDataTypes(initial, "subform-model"));

        Assert.Equal(initial.BpmnXml, saved.BpmnXml);
        Assert.NotEqual(initial.Version, saved.Version);
        JsonNode dataTypes = JsonNode.Parse(await File.ReadAllTextAsync(AppPath("config/applicationmetadata.json")))[
            "dataTypes"
        ];
        Assert.Null(dataTypes[0]["taskId"]);
        Assert.Equal("Task_1", dataTypes[1]["taskId"].GetValue<string>());
        JsonNode settings = JsonNode.Parse(await File.ReadAllTextAsync(AppPath("ui/Task_1/Settings.json")));
        Assert.Equal("subform-model", settings["defaultDataType"].GetValue<string>());
        VerifyOneNotification();
    }

    [Fact]
    public async Task ChangeDataTypes_WhenAHandlerFails_ReturnsAnInternalServerErrorWithoutNotifying()
    {
        await CreateApp(withPolicy: false);
        await File.WriteAllTextAsync(AppPath("ui/Task_1/Settings.json"), "{ not json");
        ProcessState initial = await GetState();

        using HttpResponseMessage response = await Put(ChangeDataTypes(initial, "subform-model"));

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        _syncClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task SubformPdfComponentChange_WithoutASnapshot_CopiesTheComponent()
    {
        await CreateApp(withPolicy: false);
        await File.WriteAllTextAsync(AppPath("ui/Task_1/layouts/Side1.json"), SubformComponentLayout);
        ProcessState initial = await GetState();
        ProcessState taskAdded = await Save(
            new ProcessEditRequest
            {
                ExpectedVersion = initial.Version,
                BpmnXml = initial.BpmnXml.Replace(
                    "<bpmn:endEvent",
                    """
                    <bpmn:task id="SubformPdfTask">
                          <bpmn:extensionElements>
                            <altinn:taskExtension>
                              <altinn:taskType>subformPdf</altinn:taskType>
                            </altinn:taskExtension>
                          </bpmn:extensionElements>
                        </bpmn:task>
                        <bpmn:endEvent
                    """
                ),
            }
        );

        ProcessState saved = await Save(
            new ProcessEditRequest
            {
                ExpectedVersion = taskAdded.Version,
                Metadata = new ProcessDefinitionMetadata
                {
                    SubformPdfComponentChange = new SubformPdfComponentChange
                    {
                        TaskId = "SubformPdfTask",
                        ComponentId = "subform-component",
                        SourceLayoutSetId = "Task_1",
                    },
                },
            }
        );

        Assert.Equal(taskAdded.BpmnXml, saved.BpmnXml);
        Assert.NotEqual(taskAdded.Version, saved.Version);
        string copy = Assert.Single(Directory.GetFiles(AppPath("ui/SubformPdfTask/layouts")));
        Assert.Contains("subform-component", await File.ReadAllTextAsync(copy));
        _syncClient.Verify(client => client.FileSyncSuccess(It.IsAny<SyncSuccess>()), Times.Exactly(2));
        _syncClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task SubformPdfComponentChange_ForAMissingComponent_IsRejectedBeforeWriting()
    {
        await CreateApp(withPolicy: false);
        ProcessState initial = await GetState();
        ProcessState taskAdded = await Save(
            Snapshot(initial, AddTask(initial.BpmnXml, "SubformPdfTask", "subformPdf", element: "serviceTask"))
        );
        _syncClient.Invocations.Clear();

        using HttpResponseMessage response = await Put(
            new ProcessEditRequest
            {
                ExpectedVersion = taskAdded.Version,
                Metadata = new ProcessDefinitionMetadata
                {
                    SubformPdfComponentChange = new SubformPdfComponentChange
                    {
                        TaskId = "SubformPdfTask",
                        ComponentId = "missing-component",
                        SourceLayoutSetId = "Task_1",
                    },
                },
            }
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(taskAdded, await GetState());
        Assert.False(Directory.Exists(AppPath("ui/SubformPdfTask")));
        _syncClient.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData(
        "snapshotAndOperation",
        "A layout set or data type operation must be sent without a BPMN snapshot or metadata."
    )]
    [InlineData("twoOperations", "A process edit can contain only one layout set or data type operation.")]
    [InlineData(
        "taskIdChangeWithoutSnapshot",
        "A task ID change must be sent with the BPMN snapshot that contains it."
    )]
    public async Task Save_WithInvalidOperationCombination_IsRejectedBeforeWriting(string kind, string message)
    {
        await CreateApp(withPolicy: false);
        ProcessState initial = await GetState();
        ProcessEditRequest request = kind switch
        {
            "snapshotAndOperation" => new ProcessEditRequest
            {
                ExpectedVersion = initial.Version,
                BpmnXml = initial.BpmnXml.Replace("Utfylling", "Updated name"),
                LayoutSetCreation = CreateLayoutSet(initial, "CustomReceipt").LayoutSetCreation,
            },
            "twoOperations" => new ProcessEditRequest
            {
                ExpectedVersion = initial.Version,
                LayoutSetCreation = CreateLayoutSet(initial, "CustomReceipt").LayoutSetCreation,
                LayoutSetDeletion = new ProcessLayoutSetDeletion("Task_1"),
            },
            _ => new ProcessEditRequest
            {
                ExpectedVersion = initial.Version,
                Metadata = Rename(initial, "Task_1", "RenamedTask").Metadata,
            },
        };

        using HttpResponseMessage response = await Put(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(message, await response.Content.ReadAsStringAsync());
        Assert.Equal(initial, await GetState());
        Assert.False(Directory.Exists(AppPath("ui/CustomReceipt")));
        Assert.True(Directory.Exists(AppPath("ui/Task_1")));
        _syncClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Operation_WithAStaleVersion_ReturnsConflictAndChangesNothing()
    {
        await CreateApp(withPolicy: false);
        ProcessState initial = await GetState();
        ProcessState saved = await Save(CreateLayoutSet(initial, "CustomReceipt"));

        using HttpResponseMessage response = await Put(
            new ProcessEditRequest
            {
                ExpectedVersion = initial.Version,
                LayoutSetDeletion = new ProcessLayoutSetDeletion("CustomReceipt"),
            }
        );

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(saved, await GetState());
        Assert.True(Directory.Exists(AppPath("ui/CustomReceipt")));
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

    private static ProcessEditRequest CreateLayoutSet(ProcessState state, string layoutSetId) =>
        new()
        {
            ExpectedVersion = state.Version,
            LayoutSetCreation = new LayoutSetPayload
            {
                LayoutSetConfigDto = new LayoutSetConfigDto
                {
                    Id = layoutSetId,
                    DataType = "model",
                    TaskId = layoutSetId,
                },
            },
        };

    private static ProcessEditRequest RenameLayoutSet(ProcessState state, string oldName, string newName) =>
        new() { ExpectedVersion = state.Version, LayoutSetRename = new ProcessLayoutSetRename(oldName, newName) };

    private static ProcessEditRequest ChangeDataTypes(ProcessState state, string dataType) =>
        new()
        {
            ExpectedVersion = state.Version,
            DataTypesChange = new DataTypesChange { ConnectedTaskId = "Task_1", NewDataTypes = [dataType] },
        };

    private void VerifyOneNotification()
    {
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

    private static void CopyDirectory(string source, string target)
    {
        foreach (string file in Directory.GetFiles(source, "*", SearchOption.AllDirectories))
        {
            string copy = Path.Combine(target, Path.GetRelativePath(source, file));
            Directory.CreateDirectory(Path.GetDirectoryName(copy));
            File.Copy(file, copy);
        }
    }

    private const string SummaryOfTask1 = """
        { "data": { "layout": [ { "id": "summary", "type": "Summary2", "target": { "type": "page", "id": "Side1", "taskId": "Task_1" } } ] } }
        """;

    private const string SubformComponentLayout = """
        { "data": { "layout": [ { "id": "subform-component", "type": "Subform", "layoutSet": "moreInfoSubform" } ] } }
        """;

    private const string ProcessWithSequenceFlow = """
        <?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:altinn="http://altinn.no/process" id="Definitions" targetNamespace="http://bpmn.io/schema/bpmn">
          <bpmn:process id="Process" isExecutable="false">
            <bpmn:startEvent id="StartEvent_1">
              <bpmn:outgoing>Flow_1</bpmn:outgoing>
            </bpmn:startEvent>
            <bpmn:task id="Task_1" name="Utfylling">
              <bpmn:extensionElements>
                <altinn:taskExtension>
                  <altinn:taskType>data</altinn:taskType>
                </altinn:taskExtension>
              </bpmn:extensionElements>
              <bpmn:incoming>Flow_1</bpmn:incoming>
            </bpmn:task>
            <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
          </bpmn:process>
          <bpmndi:BPMNDiagram id="Diagram">
            <bpmndi:BPMNPlane id="Plane" bpmnElement="Process">
              <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1">
                <dc:Bounds x="100" y="80" width="100" height="80" />
              </bpmndi:BPMNShape>
            </bpmndi:BPMNPlane>
          </bpmndi:BPMNDiagram>
        </bpmn:definitions>

        """;

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
