using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.App.Tests.Common.Fixtures;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.LayoutExpressions.RemoveHiddenData;

public class FileUploadTests
{
    private const string TaskId = "Task_1";
    private const int PartyId = 123456;

    private readonly MockedServiceCollection _collection;
    private readonly DataType _dataType;

    public class SkjemaModel
    {
        [JsonPropertyName("hasDispensation")]
        public bool HasDispensation { get; set; }

        [JsonPropertyName("hideContract")]
        public bool HideContract { get; set; }

        [JsonPropertyName("contractId")]
        public string? ContractId { get; set; }

        [JsonPropertyName("hidePage2")]
        public bool HidePage2 { get; set; }

        [JsonPropertyName("rows")]
        public List<Row>? Rows { get; set; }
    }

    public class Row
    {
        [JsonPropertyName("hideRow")]
        public bool HideRow { get; set; }

        [JsonPropertyName("hideUpload")]
        public bool HideUpload { get; set; }

        [JsonPropertyName("attachmentIds")]
        public List<string>? AttachmentIds { get; set; }
    }

    public FileUploadTests(ITestOutputHelper outputHelper)
    {
        _collection = new MockedServiceCollection { OutputHelper = outputHelper };
        _dataType = _collection.AddDataType<SkjemaModel>();
        foreach (
            var id in new[]
            {
                "dispensation",
                "photo",
                "alwaysShown",
                "keptWhenHidden",
                "contract",
                "rowUpload",
                "unboundRowUpload",
                "page2Upload",
            }
        )
        {
            _collection.AddDataType(new DataType { Id = id, TaskId = TaskId });
        }
        _collection.AddDataType(new DataType { Id = "noTask" });
        _collection.AddDataType(new DataType { Id = "otherTask", TaskId = "Task_2" });
        _collection.AddDataType(new DataType { Id = "ref-data-as-pdf" });
        _collection.AddDataType(
            new DataType
            {
                Id = "appOwned",
                TaskId = TaskId,
                AllowedContributors = ["app:owned"],
            }
        );
#pragma warning disable CS0618 // Type or member is obsolete
        _collection.AddDataType(
            new DataType
            {
                Id = "appOwnedOldSpelling",
                TaskId = TaskId,
                AllowedContributers = ["app:owned"],
            }
        );
#pragma warning restore CS0618 // Type or member is obsolete
        _collection.AddDataType(
            new DataType
            {
                Id = "actionRequiredToRead",
                TaskId = TaskId,
                ActionRequiredToRead = "approve",
            }
        );
        _collection.AddDataType(
            new DataType
            {
                Id = "actionRequiredToWrite",
                TaskId = TaskId,
                ActionRequiredToWrite = "sign",
            }
        );
        _collection.AddDataType(
            new DataType
            {
                Id = "disallowUserDelete",
                TaskId = TaskId,
                AppLogic = new ApplicationLogic { DisallowUserDelete = true },
            }
        );

        _collection.AddLayoutSet(
            _dataType,
            [
                ParsePage(
                    "page1",
                    $$"""
                    {
                        "data": {
                            "layout": [
                                {
                                    "id": "dispensation",
                                    "type": "FileUpload",
                                    "hidden": ["equals", ["dataModel", "hasDispensation"], false]
                                },
                                {
                                    "id": "photo",
                                    "type": "ImageUpload",
                                    "hidden": ["equals", ["dataModel", "hasDispensation"], false]
                                },
                                {
                                    "id": "alwaysShown",
                                    "type": "FileUpload"
                                },
                                {
                                    "id": "keptWhenHidden",
                                    "type": "FileUpload",
                                    "hidden": true,
                                    "removeWhenHidden": false
                                },
                                {
                                    "id": "noTask",
                                    "type": "FileUpload",
                                    "hidden": true
                                },
                                {
                                    "id": "otherTask",
                                    "type": "FileUpload",
                                    "hidden": true
                                },
                                {
                                    "id": "withoutDataType",
                                    "type": "FileUpload",
                                    "hidden": true
                                },
                                {
                                    "id": "{{_dataType.Id}}",
                                    "type": "FileUpload",
                                    "hidden": true
                                },
                                {
                                    "id": "ref-data-as-pdf",
                                    "type": "FileUpload",
                                    "hidden": true
                                },
                                {
                                    "id": "appOwned",
                                    "type": "FileUpload",
                                    "hidden": true
                                },
                                {
                                    "id": "appOwnedOldSpelling",
                                    "type": "FileUpload",
                                    "hidden": true
                                },
                                {
                                    "id": "actionRequiredToRead",
                                    "type": "FileUpload",
                                    "hidden": true
                                },
                                {
                                    "id": "actionRequiredToWrite",
                                    "type": "FileUpload",
                                    "hidden": true
                                },
                                {
                                    "id": "disallowUserDelete",
                                    "type": "FileUpload",
                                    "hidden": true
                                },
                                {
                                    "id": "contract",
                                    "type": "FileUpload",
                                    "dataModelBindings": {
                                        "simpleBinding": "contractId"
                                    },
                                    "hidden": ["dataModel", "hideContract"]
                                },
                                {
                                    "id": "rows",
                                    "type": "RepeatingGroup",
                                    "dataModelBindings": {
                                        "group": "rows"
                                    },
                                    "hiddenRow": ["dataModel", "rows.hideRow"],
                                    "children": ["rowUpload", "unboundRowUpload"]
                                },
                                {
                                    "id": "rowUpload",
                                    "type": "FileUpload",
                                    "dataModelBindings": {
                                        "list": "rows.attachmentIds"
                                    },
                                    "hidden": ["dataModel", "rows.hideUpload"]
                                },
                                {
                                    "id": "unboundRowUpload",
                                    "type": "FileUpload"
                                }
                            ]
                        }
                    }
                    """
                ),
                ParsePage(
                    "page2",
                    """
                    {
                        "data": {
                            "hidden": ["dataModel", "hidePage2"],
                            "layout": [
                                {
                                    "id": "page2Upload",
                                    "type": "FileUpload"
                                }
                            ]
                        }
                    }
                    """
                ),
            ]
        );
    }

    private static PageComponent ParsePage(string pageId, string pageJson)
    {
        using var document = JsonDocument.Parse(pageJson);
        return PageComponent.Parse(document.RootElement, pageId, TaskId);
    }

    private static DataElement CreateAttachment(string dataType) =>
        new()
        {
            Id = Guid.NewGuid().ToString(),
            DataType = dataType,
            ContentType = "application/pdf",
        };

    /// <summary>
    /// Store an instance with the form data and the attachments, and return a unit of work for it as the app reads it
    /// </summary>
    private async Task<InstanceDataUnitOfWork> CreateInstanceDataUnitOfWork(
        WrappedServiceProvider provider,
        SkjemaModel model,
        DataElement[] attachments
    )
    {
        var formData = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = _dataType.Id,
            ContentType = "application/xml",
        };
        var instance = new Instance
        {
            Id = $"{PartyId}/{Guid.NewGuid()}",
            AppId = $"{MockedServiceCollection.Org}/{MockedServiceCollection.App}",
            InstanceOwner = new InstanceOwner { PartyId = PartyId.ToString() },
            Data = [formData, .. attachments],
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = TaskId } },
        };

        var serializer = provider.GetRequiredService<ModelSerializationService>();
        _collection.Storage.AddInstance(instance);
        _collection.Storage.AddDataRaw(
            Guid.Parse(formData.Id),
            serializer.SerializeToStorage(model, _dataType, formData).data.ToArray()
        );
        foreach (var attachment in attachments)
        {
            _collection.Storage.AddDataRaw(Guid.Parse(attachment.Id), [0x25, 0x50, 0x44, 0x46]);
        }

        var instanceCopy = JsonSerializer.Deserialize<Instance>(JsonSerializer.SerializeToUtf8Bytes(instance))!;
        return await provider
            .GetRequiredService<InstanceDataUnitOfWorkInitializer>()
            .Init(instanceCopy, StorageVersionMetadata.Empty, TaskId, null);
    }

    private async Task<List<string>> GetHiddenAttachmentIds(SkjemaModel model, params DataElement[] attachments)
    {
        await using var provider = _collection.BuildServiceProvider();
        var dataMutator = await CreateInstanceDataUnitOfWork(provider, model, attachments);

        var state = dataMutator.GetLayoutEvaluatorState();
        var hiddenAttachments = await LayoutEvaluator.GetHiddenAttachmentsForRemoval(state, TaskId);
        return hiddenAttachments.Select(a => a.Id).Order().ToList();
    }

    private static List<string> SortedIds(params DataElement[] dataElements) =>
        dataElements.Select(d => d.Id).Order().ToList();

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Upload_RemovesAllItsAttachments_OnlyWhenHidden(bool hasDispensation)
    {
        var dispensation1 = CreateAttachment("dispensation");
        var dispensation2 = CreateAttachment("dispensation");
        var photo = CreateAttachment("photo");
        var alwaysShown = CreateAttachment("alwaysShown");

        var actual = await GetHiddenAttachmentIds(
            new SkjemaModel { HasDispensation = hasDispensation },
            dispensation1,
            dispensation2,
            photo,
            alwaysShown
        );

        Assert.Equal(hasDispensation ? [] : SortedIds(dispensation1, dispensation2, photo), actual);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task UploadOnPage_RemovesItsAttachments_OnlyWhenThePageIsHidden(bool hidePage2)
    {
        var page2Upload = CreateAttachment("page2Upload");

        var actual = await GetHiddenAttachmentIds(
            new SkjemaModel { HasDispensation = true, HidePage2 = hidePage2 },
            page2Upload
        );

        Assert.Equal(hidePage2 ? SortedIds(page2Upload) : [], actual);
    }

    [Fact]
    public async Task UploadInRepeatingGroup_RemovesTheAttachmentsInHiddenRowsAndHiddenUploads()
    {
        var visible = CreateAttachment("rowUpload");
        var uploadHidden = CreateAttachment("rowUpload");
        var rowHidden = CreateAttachment("rowUpload");
        var notInAnyRow = CreateAttachment("rowUpload");

        var actual = await GetHiddenAttachmentIds(
            new SkjemaModel
            {
                HasDispensation = true,
                Rows =
                [
                    new Row { AttachmentIds = [visible.Id] },
                    new Row { HideUpload = true, AttachmentIds = [uploadHidden.Id] },
                    new Row { HideRow = true, AttachmentIds = [rowHidden.Id, visible.Id] },
                    new Row { HideRow = true, AttachmentIds = [] },
                ],
            },
            visible,
            uploadHidden,
            rowHidden,
            notInAnyRow
        );

        // visible is also in a hidden row, but a visible row has it too. No row has notInAnyRow in its binding, so
        // it belongs to no component
        Assert.Equal(SortedIds(uploadHidden, rowHidden), actual);
    }

    [Fact]
    public async Task UploadWithoutBindingInRepeatingGroup_RemovesNothing_EvenInAHiddenRow()
    {
        // As in app-frontend, an attachment belongs to an upload in a repeating group only through its binding value
        var actual = await GetHiddenAttachmentIds(
            new SkjemaModel { HasDispensation = true, Rows = [new Row { HideRow = true }] },
            CreateAttachment("unboundRowUpload")
        );

        Assert.Empty(actual);
    }

    [Theory]
    [InlineData("bound")]
    [InlineData(null)]
    [InlineData("")]
    public async Task HiddenUploadWithSimpleBinding_RemovesOnlyTheBoundAttachment(string? contractId)
    {
        var contract = CreateAttachment("contract");
        var otherContract = CreateAttachment("contract");
        bool bound = contractId == "bound";

        var actual = await GetHiddenAttachmentIds(
            new SkjemaModel
            {
                HasDispensation = true,
                HideContract = true,
                ContractId = bound ? contract.Id : contractId,
            },
            contract,
            otherContract
        );

        // As in app-frontend, an empty binding value gives the component no attachments
        Assert.Equal(bound ? SortedIds(contract) : [], actual);
    }

    [Fact]
    public async Task HiddenUpload_WithDataTypeInNoTask_RemovesItsAttachments()
    {
        var noTask = CreateAttachment("noTask");

        var actual = await GetHiddenAttachmentIds(new SkjemaModel { HasDispensation = true }, noTask);

        Assert.Equal(SortedIds(noTask), actual);
    }

    [Fact]
    public async Task HiddenUpload_WithRemoveWhenHiddenFalseOrDataTypeInAnotherTask_RemovesNothing()
    {
        var actual = await GetHiddenAttachmentIds(
            new SkjemaModel { HasDispensation = true },
            CreateAttachment("keptWhenHidden"),
            CreateAttachment("otherTask")
        );

        Assert.Empty(actual);
    }

    [Fact]
    public async Task HiddenUpload_WithoutDataTypeOrWithTheFormDataOrPdfDataTypeId_RemovesNothing()
    {
        // "withoutDataType" has no data type, and the uploads with the form data and PDF data type ids must not
        // return the form data or the PDF
        var actual = await GetHiddenAttachmentIds(
            new SkjemaModel { HasDispensation = true },
            CreateAttachment("ref-data-as-pdf")
        );

        Assert.Empty(actual);
    }

    [Fact]
    public async Task TaskWithoutLayouts_RemovesNothing()
    {
        await using var provider = _collection.BuildServiceProvider();
        var dataMutator = await CreateInstanceDataUnitOfWork(
            provider,
            new SkjemaModel(),
            [CreateAttachment("dispensation")]
        );
        var state = new LayoutEvaluatorState(
            dataMutator,
            componentModel: null,
            provider.GetRequiredService<ITranslationService>(),
            new FrontEndSettings()
        );

        Assert.Empty(await LayoutEvaluator.GetHiddenAttachmentsForRemoval(state, TaskId));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Execute_DeletesAttachmentsInHiddenUploads_OnlyWithRemoveHiddenData(bool removeHiddenData)
    {
        _collection.AppSettings.RemoveHiddenData = removeHiddenData;
        var dispensation = CreateAttachment("dispensation");
        var alwaysShown = CreateAttachment("alwaysShown");
        var rowHidden = CreateAttachment("rowUpload");

        await using var provider = _collection.BuildServiceProvider();
        var dataMutator = await CreateInstanceDataUnitOfWork(
            provider,
            new SkjemaModel
            {
                HasDispensation = false,
                Rows = [new Row { HideRow = true, AttachmentIds = [rowHidden.Id] }],
            },
            [dispensation, alwaysShown, rowHidden]
        );

        var result = await CreateCommand(provider).Execute(CreateContext(dataMutator));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Equal(removeHiddenData ? SortedIds(dispensation, rowHidden) : [], GetDeletedIds(dataMutator));

        // The hidden row is removed with its binding, after the attachment in it was found
        var data = await dataMutator.GetFormData<SkjemaModel>();
        Assert.NotNull(data);
        Assert.Equal(removeHiddenData ? 0 : 1, data.Rows?.Count ?? 0);
    }

    [Fact]
    public async Task Execute_KeepsAttachmentsTheUserCannotDelete()
    {
        _collection.AppSettings.RemoveHiddenData = true;
        var noTask = CreateAttachment("noTask");

        await using var provider = _collection.BuildServiceProvider();
        var dataMutator = await CreateInstanceDataUnitOfWork(
            provider,
            new SkjemaModel { HasDispensation = true },
            [
                noTask,
                CreateAttachment("appOwned"),
                CreateAttachment("appOwnedOldSpelling"),
                CreateAttachment("actionRequiredToRead"),
                CreateAttachment("actionRequiredToWrite"),
                CreateAttachment("disallowUserDelete"),
            ]
        );

        var result = await CreateCommand(provider).Execute(CreateContext(dataMutator));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Equal(SortedIds(noTask), GetDeletedIds(dataMutator));
    }

    private CommonTaskFinalization CreateCommand(WrappedServiceProvider provider)
    {
        _collection
            .Mock<IAppResources>()
            .Setup(x => x.GetLayoutSettingsForFolder(TaskId))
            .Returns(new LayoutSettings());
        var accessChecker = new Mock<IDataElementAccessChecker>();
        accessChecker.Setup(x => x.CanRead(It.IsAny<Instance>(), It.IsAny<DataType>())).ReturnsAsync(true);

        return new CommonTaskFinalization(
            provider.GetRequiredService<IAppMetadata>(),
            provider.GetRequiredService<IAppModel>(),
            provider.GetRequiredService<IAppResources>(),
            new LayoutEvaluatorStateInitializer(
                provider.GetRequiredService<IAppResources>(),
                provider.GetRequiredService<ITranslationService>(),
                provider.GetRequiredService<IAppMetadata>(),
                Options.Create(new FrontEndSettings())
            ),
            Options.Create(_collection.AppSettings),
            accessChecker.Object
        );
    }

    private static ProcessEngineCommandContext CreateContext(InstanceDataUnitOfWork dataMutator) =>
        new()
        {
            StateCarry = new(),
            AppId = new AppIdentifier(MockedServiceCollection.Org, MockedServiceCollection.App),
            InstanceId = new InstanceIdentifier(dataMutator.Instance),
            InstanceDataMutator = dataMutator,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = CommonTaskFinalization.Key,
                Actor = new Actor { UserId = 1337 },
                State = "{}",
                WorkflowId = Guid.Empty,
                StepId = Guid.NewGuid(),
                ExecutionReferenceTime = new DateTimeOffset(2025, 3, 14, 9, 26, 53, TimeSpan.Zero),
            },
        };

    private static List<string> GetDeletedIds(InstanceDataUnitOfWork dataMutator) =>
        dataMutator
            .GetDataElementChanges(initializeAltinnRowId: false)
            .BinaryDataChanges.Where(change => change.Type == ChangeType.Deleted)
            .Select(change => change.DataElementIdentifier.Id)
            .Order()
            .ToList();
}
