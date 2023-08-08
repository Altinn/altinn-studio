using Altinn.App.Core.Features;
using Altinn.App.Core.Implementation;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Prefill;
using Altinn.App.Core.Models;
using Altinn.App.Core.Tests.Implementation.TestData.AppDataModel;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.FeatureManagement;
using Moq;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Implementation;

public class DefaultTaskEventsTests: IDisposable
{
    private readonly ILogger<DefaultTaskEvents> _logger = NullLogger<DefaultTaskEvents>.Instance;
    private readonly Mock<IAppResources> _resMock;
    private readonly Mock<IAppMetadata> _metaMock;
    private readonly ApplicationMetadata _application;
    private readonly Mock<IDataClient> _dataMock;
    private readonly Mock<IPrefill> _prefillMock;
    private readonly IAppModel _appModel;
    private readonly Mock<IAppModel> _appModelMock;
    private readonly Mock<IInstantiationProcessor> _instantiationMock;
    private readonly Mock<IInstanceClient> _instanceMock;
    private IEnumerable<IProcessTaskStart> _taskStarts;
    private IEnumerable<IProcessTaskEnd> _taskEnds;
    private IEnumerable<IProcessTaskAbandon> _taskAbandons;
    private readonly Mock<IPdfService> _pdfMock;
    private readonly Mock<IFeatureManager> _featureManagerMock;
    private readonly LayoutEvaluatorStateInitializer _layoutStateInitializer;

    public DefaultTaskEventsTests()
    {
        _application = new ApplicationMetadata("ttd/test");
        _resMock = new Mock<IAppResources>();
        _metaMock = new Mock<IAppMetadata>();
        _dataMock = new Mock<IDataClient>();
        _prefillMock = new Mock<IPrefill>();
        _appModel = new DefaultAppModel(NullLogger<DefaultAppModel>.Instance);
        _appModelMock = new Mock<IAppModel>();
        _instantiationMock = new Mock<IInstantiationProcessor>();
        _instanceMock = new Mock<IInstanceClient>();
        _taskStarts = new List<IProcessTaskStart>();
        _taskEnds = new List<IProcessTaskEnd>();
        _taskAbandons = new List<IProcessTaskAbandon>();
        _pdfMock = new Mock<IPdfService>();
        _featureManagerMock = new Mock<IFeatureManager>();
        _layoutStateInitializer = new LayoutEvaluatorStateInitializer(_resMock.Object, Microsoft.Extensions.Options.Options.Create(new Core.Configuration.FrontEndSettings()));
    }

    [Fact]
    public async void OnAbandonProcessTask_handles_no_IProcessTaskAbandon_injected()
    {
        _metaMock.Setup(r => r.GetApplicationMetadata()).ReturnsAsync(_application);
        DefaultTaskEvents te = new DefaultTaskEvents(
            _logger,
            _resMock.Object,
            _metaMock.Object,
            _dataMock.Object,
            _prefillMock.Object,
            _appModel,
            _instantiationMock.Object,
            _instanceMock.Object,
            _taskStarts,
            _taskEnds,
            _taskAbandons,
            _pdfMock.Object,
            _featureManagerMock.Object,
            _layoutStateInitializer);
        await te.OnAbandonProcessTask("Task_1", new Instance());
    }
    
    [Fact]
    public async void OnAbandonProcessTask_calls_all_added_implementations()
    {
        _metaMock.Setup(r => r.GetApplicationMetadata()).ReturnsAsync(_application);
        Mock<IProcessTaskAbandon> abandonOne = new Mock<IProcessTaskAbandon>();
        Mock<IProcessTaskAbandon> abandonTwo = new Mock<IProcessTaskAbandon>();
        _taskAbandons = new List<IProcessTaskAbandon>() { abandonOne.Object, abandonTwo.Object };
        DefaultTaskEvents te = new DefaultTaskEvents(
            _logger,
            _resMock.Object,
            _metaMock.Object,
            _dataMock.Object,
            _prefillMock.Object,
            _appModel,
            _instantiationMock.Object,
            _instanceMock.Object,
            _taskStarts,
            _taskEnds,
            _taskAbandons,
            _pdfMock.Object,
            _featureManagerMock.Object,
            _layoutStateInitializer);
        var instance = new Instance();
        await te.OnAbandonProcessTask("Task_1", instance);
        abandonOne.Verify(a => a.Abandon("Task_1", instance));
        abandonTwo.Verify(a => a.Abandon("Task_1", instance));
        abandonOne.VerifyNoOtherCalls();
        abandonTwo.VerifyNoOtherCalls();
    }

    [Fact]
    public async void OnEndProcessTask_calls_all_added_implementations_of_IProcessTaskEnd()
    {
        _application.DataTypes = new List<DataType>();
        _metaMock.Setup(r => r.GetApplicationMetadata()).ReturnsAsync(_application);
        Mock<IProcessTaskEnd> endOne = new Mock<IProcessTaskEnd>();
        Mock<IProcessTaskEnd> endTwo = new Mock<IProcessTaskEnd>();
        _taskEnds = new List<IProcessTaskEnd>() { endOne.Object, endTwo.Object };
        DefaultTaskEvents te = new DefaultTaskEvents(
            _logger,
            _resMock.Object,
            _metaMock.Object,
            _dataMock.Object,
            _prefillMock.Object,
            _appModel,
            _instantiationMock.Object,
            _instanceMock.Object,
            _taskStarts,
            _taskEnds,
            _taskAbandons,
            _pdfMock.Object,
            _featureManagerMock.Object,
            _layoutStateInitializer);
        var instance = new Instance()
        {
            Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
            AppId = "ttd/test",
        };
        await te.OnEndProcessTask("Task_1", instance);
        _metaMock.Verify(r => r.GetApplicationMetadata());
        endOne.Verify(a => a.End("Task_1", instance));
        endTwo.Verify(a => a.End("Task_1", instance));
        endOne.VerifyNoOtherCalls();
        endTwo.VerifyNoOtherCalls();
    }

    [Fact]
    public async void OnEndProcessTask_removes_all_shadow_fields_and_saves_to_specified_datatype()
    {
        var application = GetApplicationMetadataForShadowFields();
        var instance = new Instance()
        {
            Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
            AppId = "ttd/shadow-fields-test",
            Data = new List<DataElement>()
            {
                { 
                    new()
                    {
                        DataType = "model",
                        Id = "03ea848c-64f0-40f4-b5b4-30e1642d09b5",
                    }
                }
            },
            InstanceOwner = new InstanceOwner()
            {
                PartyId = "1000"
            },
            Org = "ttd"
        };
        _metaMock.Setup(r => r.GetApplicationMetadata()).ReturnsAsync(application);
        _appModelMock.Setup(r => r.GetModelType("Altinn.App.Core.Tests.Implementation.TestData.AppDataModel.ModelWithShadowFields")).Returns(typeof(Altinn.App.Core.Tests.Implementation.TestData.AppDataModel.ModelWithShadowFields));
        var instanceGuid = Guid.Parse("fa0678ad-960d-4307-aba2-ba29c9804c9d");
        var dataElementId = Guid.Parse("03ea848c-64f0-40f4-b5b4-30e1642d09b5");
        Type modelType = typeof(ModelWithShadowFields);
        _dataMock.Setup(r => r.GetFormData(instanceGuid, modelType, "ttd", "shadow-fields-test", 1000, dataElementId))
            .ReturnsAsync(GetDataElementForShadowFields());

        DefaultTaskEvents te = new DefaultTaskEvents(
            _logger,
            _resMock.Object,
            _metaMock.Object,
            _dataMock.Object,
            _prefillMock.Object,
            _appModelMock.Object,
            _instantiationMock.Object,
            _instanceMock.Object,
            _taskStarts,
            _taskEnds,
            _taskAbandons,
            _pdfMock.Object,
            _featureManagerMock.Object,
            _layoutStateInitializer);

        await te.OnEndProcessTask("Task_1", instance);
        _metaMock.Verify(r => r.GetApplicationMetadata());
        _dataMock.Verify(r => r.InsertFormData<object>(It.IsAny<ModelWithShadowFields>(), instanceGuid, modelType, "ttd", "shadow-fields-test", 1000, "model-clean"));
        _dataMock.Verify(r => r.GetFormData(instanceGuid, modelType, "ttd", "shadow-fields-test", 1000, dataElementId));
        _dataMock.Verify(r => r.LockDataElement(It.Is<InstanceIdentifier>(i => i.InstanceOwnerPartyId == 1337 && i.InstanceGuid == instanceGuid), new Guid(instance.Data[0].Id)));
    }

    [Fact]
    public async void OnEndProcessTask_removes_all_shadow_fields_and_saves_to_current_datatype_when_saveToDataType_not_specified()
    {
        var application = GetApplicationMetadataForShadowFields(false);
        var instance = new Instance()
        {
            Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
            AppId = "ttd/shadow-fields-test",
            Data = new List<DataElement>()
            {
                { 
                    new()
                    {
                        DataType = "model",
                        Id = "03ea848c-64f0-40f4-b5b4-30e1642d09b5",
                    }
                }
            },
            InstanceOwner = new InstanceOwner()
            {
                PartyId = "1000"
            },
            Org = "ttd"
        };
        _metaMock.Setup(r => r.GetApplicationMetadata()).ReturnsAsync(application);
        _appModelMock.Setup(r => r.GetModelType("Altinn.App.Core.Tests.Implementation.TestData.AppDataModel.ModelWithShadowFields")).Returns(typeof(Altinn.App.Core.Tests.Implementation.TestData.AppDataModel.ModelWithShadowFields));
        var instanceGuid = Guid.Parse("fa0678ad-960d-4307-aba2-ba29c9804c9d");
        var dataElementId = Guid.Parse("03ea848c-64f0-40f4-b5b4-30e1642d09b5");
        Type modelType = typeof(Altinn.App.Core.Tests.Implementation.TestData.AppDataModel.ModelWithShadowFields);
        _dataMock.Setup(r => r.GetFormData(instanceGuid, modelType, "ttd", "shadow-fields-test", 1000, dataElementId))
            .ReturnsAsync(GetDataElementForShadowFields());

        DefaultTaskEvents te = new DefaultTaskEvents(
            _logger,
            _resMock.Object,
            _metaMock.Object,
            _dataMock.Object,
            _prefillMock.Object,
            _appModelMock.Object,
            _instantiationMock.Object,
            _instanceMock.Object,
            _taskStarts,
            _taskEnds,
            _taskAbandons,
            _pdfMock.Object,
            _featureManagerMock.Object,
            _layoutStateInitializer);

        await te.OnEndProcessTask("Task_1", instance);
        _metaMock.Verify(r => r.GetApplicationMetadata());
        _dataMock.Verify(r => r.UpdateData<object>(It.IsAny<Altinn.App.Core.Tests.Implementation.TestData.AppDataModel.ModelWithShadowFields>(), instanceGuid, modelType, "ttd", "shadow-fields-test", 1000, dataElementId));
        _dataMock.Verify(r => r.GetFormData(instanceGuid, modelType, "ttd", "shadow-fields-test", 1000, dataElementId));
        _dataMock.Verify(r => r.LockDataElement(It.Is<InstanceIdentifier>(i => i.InstanceOwnerPartyId == 1337 && i.InstanceGuid == instanceGuid), new Guid(instance.Data[0].Id)));
    }

    [Fact]
    public async void OnEndProcessTask_throws_exception_when_saveToDataType_is_specified_but_does_not_exist()
    {
        var application = GetApplicationMetadataForShadowFields(true, saveToDataType: "does-not-exist");
        var instance = new Instance()
        {
            Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
            AppId = "ttd/shadow-fields-test",
            Data = new List<DataElement>()
            {
                { 
                    new()
                    {
                        DataType = "model",
                        Id = "03ea848c-64f0-40f4-b5b4-30e1642d09b5",
                    }
                }
            },
            InstanceOwner = new InstanceOwner()
            {
                PartyId = "1000"
            },
            Org = "ttd"
        };
        _metaMock.Setup(r => r.GetApplicationMetadata()).ReturnsAsync(application);
        _appModelMock.Setup(r => r.GetModelType("Altinn.App.Core.Tests.Implementation.TestData.AppDataModel.ModelWithShadowFields")).Returns(typeof(Altinn.App.Core.Tests.Implementation.TestData.AppDataModel.ModelWithShadowFields));
        var instanceGuid = Guid.Parse("fa0678ad-960d-4307-aba2-ba29c9804c9d");
        var dataElementId = Guid.Parse("03ea848c-64f0-40f4-b5b4-30e1642d09b5");
        Type modelType = typeof(Altinn.App.Core.Tests.Implementation.TestData.AppDataModel.ModelWithShadowFields);
        _dataMock.Setup(r => r.GetFormData(instanceGuid, modelType, "ttd", "shadow-fields-test", 1000, dataElementId))
            .ReturnsAsync(GetDataElementForShadowFields());

        DefaultTaskEvents te = new DefaultTaskEvents(
            _logger,
            _resMock.Object,
            _metaMock.Object,
            _dataMock.Object,
            _prefillMock.Object,
            _appModelMock.Object,
            _instantiationMock.Object,
            _instanceMock.Object,
            _taskStarts,
            _taskEnds,
            _taskAbandons,
            _pdfMock.Object,
            _featureManagerMock.Object,
            _layoutStateInitializer);

        await Assert.ThrowsAsync<System.Exception>(async () => await te.OnEndProcessTask("Task_1", instance));
        _metaMock.Verify(r => r.GetApplicationMetadata());
        _dataMock.Verify(r => r.GetFormData(instanceGuid, modelType, "ttd", "shadow-fields-test", 1000, dataElementId));
    }
    
    [Fact]
    public async void OnEndProcessTask_calls_all_added_implementations_of_IProcessTaskStart()
    {
        _application.DataTypes = new List<DataType>();
        _metaMock.Setup(r => r.GetApplicationMetadata()).ReturnsAsync(_application);
        Mock<IProcessTaskStart> startOne = new Mock<IProcessTaskStart>();
        Mock<IProcessTaskStart> startTwo = new Mock<IProcessTaskStart>();
        _taskStarts = new List<IProcessTaskStart>() { startOne.Object, startTwo.Object };
        DefaultTaskEvents te = new DefaultTaskEvents(
            _logger,
            _resMock.Object,
            _metaMock.Object,
            _dataMock.Object,
            _prefillMock.Object,
            _appModel,
            _instantiationMock.Object,
            _instanceMock.Object,
            _taskStarts,
            _taskEnds,
            _taskAbandons,
            _pdfMock.Object,
            _featureManagerMock.Object,
            _layoutStateInitializer);
        var instance = new Instance()
        {
            Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d"
        };
        var prefill = new Dictionary<string, string>()
        {
            {
                "aa",
                "bb"
            }
        };
        await te.OnStartProcessTask("Task_1", instance, prefill);
        _metaMock.Verify(r => r.GetApplicationMetadata());
        startOne.Verify(a => a.Start("Task_1", instance, prefill));
        startTwo.Verify(a => a.Start("Task_1", instance, prefill));
        startOne.VerifyNoOtherCalls();
        startTwo.VerifyNoOtherCalls();
    }

    [Fact]
    public async void OnEndProcessTask_does_not_sets_hard_soft_delete_if_process_ended_and_autoDeleteOnProcessEnd_false()
    {
        _application.DataTypes = new List<DataType>();
        _application.AutoDeleteOnProcessEnd = false;
        _metaMock.Setup(r => r.GetApplicationMetadata()).ReturnsAsync(_application);
        DefaultTaskEvents te = new DefaultTaskEvents(
            _logger,
            _resMock.Object,
            _metaMock.Object,
            _dataMock.Object,
            _prefillMock.Object,
            _appModel,
            _instantiationMock.Object,
            _instanceMock.Object,
            _taskStarts,
            _taskEnds,
            _taskAbandons,
            _pdfMock.Object,
            _featureManagerMock.Object,
            _layoutStateInitializer);
        var instance = new Instance()
        {
            Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
            AppId = "ttd/test",
            InstanceOwner = new()
            {
                PartyId = "1000"
            },
            Process = new()
            {
                Ended = DateTime.Now
            }
        };
        await te.OnEndProcessTask("EndEvent_1", instance);
        _metaMock.Verify(r => r.GetApplicationMetadata());
        _instanceMock.Verify(i => i.DeleteInstance(1000, Guid.Parse("fa0678ad-960d-4307-aba2-ba29c9804c9d"), true), Times.Never);
    }
    
    [Fact]
    public async void OnEndProcessTask_deletes_old_datatypes_generated_from_task_beeing_ended()
    {
        _application.DataTypes = new List<DataType>();
        _application.AutoDeleteOnProcessEnd = false;
        _metaMock.Setup(r => r.GetApplicationMetadata()).ReturnsAsync(_application);
        DefaultTaskEvents te = new DefaultTaskEvents(
            _logger,
            _resMock.Object,
            _metaMock.Object,
            _dataMock.Object,
            _prefillMock.Object,
            _appModel,
            _instantiationMock.Object,
            _instanceMock.Object,
            _taskStarts,
            _taskEnds,
            _taskAbandons,
            _pdfMock.Object,
            _featureManagerMock.Object,
            _layoutStateInitializer);
        var instance = new Instance()
        {
            Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
            AppId = "ttd/test",
            InstanceOwner = new()
            {
                PartyId = "1000"
            },
            Process = new()
            {
                Ended = DateTime.Now
            },
            Data = new()
            {
                new()
                {
                    Id = "ba0678ad-960d-4307-aba2-ba29c9804c9d",
                    References = new()
                    {
                        new()
                        {
                            Relation = RelationType.GeneratedFrom,
                            Value = "Task_1",
                            ValueType = ReferenceType.Task
                        },
                        new()
                        {
                            Relation = RelationType.GeneratedFrom,
                            Value = "EndEvent_1",
                            ValueType = ReferenceType.Task
                        }
                    }
                }
            }
        };
        await te.OnEndProcessTask("EndEvent_1", instance);
        _metaMock.Verify(r => r.GetApplicationMetadata());
        _instanceMock.Verify(i => i.DeleteInstance(1000, Guid.Parse("fa0678ad-960d-4307-aba2-ba29c9804c9d"), true), Times.Never);
        _dataMock.Verify(d => d.DeleteData("ttd", "test", 1337, Guid.Parse("fa0678ad-960d-4307-aba2-ba29c9804c9d"), Guid.Parse("ba0678ad-960d-4307-aba2-ba29c9804c9d"), false), Times.Once);
    }
    
    [Fact]
    public async void OnEndProcessTask_sets_hard_soft_delete_if_process_ended_and_autoDeleteOnProcessEnd_true()
    {
        _application.DataTypes = new List<DataType>();
        _application.AutoDeleteOnProcessEnd = true;
        _metaMock.Setup(r => r.GetApplicationMetadata()).ReturnsAsync(_application);
        DefaultTaskEvents te = new DefaultTaskEvents(
            _logger,
            _resMock.Object,
            _metaMock.Object,
            _dataMock.Object,
            _prefillMock.Object,
            _appModel,
            _instantiationMock.Object,
            _instanceMock.Object,
            _taskStarts,
            _taskEnds,
            _taskAbandons,
            _pdfMock.Object,
            _featureManagerMock.Object,
            _layoutStateInitializer);
        var instance = new Instance()
        {
            Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
            AppId = "ttd/test",
            InstanceOwner = new()
            {
                PartyId = "1000"
            },
            Process = new()
            {
                Ended = DateTime.Now
            }
        };
        await te.OnEndProcessTask("EndEvent_1", instance);
        _metaMock.Verify(r => r.GetApplicationMetadata());
        _instanceMock.Verify(i => i.DeleteInstance(1000, Guid.Parse("fa0678ad-960d-4307-aba2-ba29c9804c9d"), true), Times.Once);
    }
    
    [Fact]
    public async void OnEndProcessTask_does_not_sets_hard_soft_delete_if_process_not_ended_and_autoDeleteOnProcessEnd_true()
    {
        _application.DataTypes = new List<DataType>();
        _application.AutoDeleteOnProcessEnd = true;
        _metaMock.Setup(r => r.GetApplicationMetadata()).ReturnsAsync(_application);
        DefaultTaskEvents te = new DefaultTaskEvents(
            _logger,
            _resMock.Object,
            _metaMock.Object,
            _dataMock.Object,
            _prefillMock.Object,
            _appModel,
            _instantiationMock.Object,
            _instanceMock.Object,
            _taskStarts,
            _taskEnds,
            _taskAbandons,
            _pdfMock.Object,
            _featureManagerMock.Object,
            _layoutStateInitializer);
        var instance = new Instance()
        {
            Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
            AppId = "ttd/test",            
            InstanceOwner = new()
            {
                PartyId = "1000"
            },
            Process = new()
        };
        await te.OnEndProcessTask("EndEvent_1", instance);
        _metaMock.Verify(r => r.GetApplicationMetadata());
        _instanceMock.Verify(i => i.DeleteInstance(1000, Guid.Parse("fa0678ad-960d-4307-aba2-ba29c9804c9d"), true), Times.Never);
    }
    
    [Fact]
    public async void OnEndProcessTask_does_not_sets_hard_soft_delete_if_process_null_and_autoDeleteOnProcessEnd_true()
    {
        _application.DataTypes = new List<DataType>();
        _application.AutoDeleteOnProcessEnd = true;
        _metaMock.Setup(r => r.GetApplicationMetadata()).ReturnsAsync(_application);
        DefaultTaskEvents te = new DefaultTaskEvents(
            _logger,
            _resMock.Object,
            _metaMock.Object,
            _dataMock.Object,
            _prefillMock.Object,
            _appModel,
            _instantiationMock.Object,
            _instanceMock.Object,
            _taskStarts,
            _taskEnds,
            _taskAbandons,
            _pdfMock.Object,
            _featureManagerMock.Object,
            _layoutStateInitializer);
        var instance = new Instance()
        {
            Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
            AppId = "ttd/test",
            InstanceOwner = new()
            {
                PartyId = "1000"
            }
        };
        await te.OnEndProcessTask("EndEvent_1", instance);
        _metaMock.Verify(r => r.GetApplicationMetadata());
        _instanceMock.Verify(i => i.DeleteInstance(1000, Guid.Parse("fa0678ad-960d-4307-aba2-ba29c9804c9d"), true), Times.Never);
    }

    public void Dispose()
    {
        _metaMock.VerifyNoOtherCalls();
        _resMock.VerifyNoOtherCalls();
        _dataMock.VerifyNoOtherCalls();
        _prefillMock.VerifyNoOtherCalls();
        _instantiationMock.VerifyNoOtherCalls();
        _instanceMock.VerifyNoOtherCalls();
        _pdfMock.VerifyNoOtherCalls();
    }

    private ApplicationMetadata GetApplicationMetadataForShadowFields(bool useSaveToDataType = true, string saveToDataType = "model-clean")
    {
        return new ApplicationMetadata("tdd/bestilling")
        {
            Id = "tdd/bestilling",
            Org = "tdd",
            Created = DateTime.Parse("2019-09-16T22:22:22"),
            CreatedBy = "username",
            Title = new Dictionary<string, string>()
            {
                { "nb", "Bestillingseksempelapp" }
            },
            DataTypes = new List<DataType>()
            {
                new()
                {
                    Id = "ref-data-as-pdf",
                    AllowedContentTypes = new List<string>() { "application/pdf" },
                    MinCount = 1,
                    TaskId = "Task_1"
                },
                new()
                {
                    Id = "model",
                    AllowedContentTypes = new List<string>() { "application/xml" },
                    MinCount = 1,
                    MaxCount = 1,
                    TaskId = "Task_1",
                    EnablePdfCreation = false,
                    AppLogic = new ApplicationLogic()
                    {
                        AllowAnonymousOnStateless = false,
                        AutoCreate = true,
                        ClassRef = "Altinn.App.Core.Tests.Implementation.TestData.AppDataModel.ModelWithShadowFields",
                        AutoDeleteOnProcessEnd = false,
                        ShadowFields = new ShadowFields()
                        {
                            Prefix = "AltinnSF_",
                            SaveToDataType = useSaveToDataType ? saveToDataType : null,
                        }
                    }
                },
                new()
                {
                    Id = "model-clean",
                    AllowedContentTypes = new List<string>() { "application/xml" },
                    MinCount = 0,
                    MaxCount = 1,
                    TaskId = "Task_1",
                    AppLogic = new ApplicationLogic()
                    {
                        AllowAnonymousOnStateless = false,
                        AutoCreate = false,
                        ClassRef = "Altinn.App.Core.Tests.Implementation.TestData.AppDataModel.ModelWithShadowFields",
                        AutoDeleteOnProcessEnd = false,
                    }
                }
            },
            PartyTypesAllowed = new PartyTypesAllowed()
            {
                BankruptcyEstate = true,
                Organisation = true,
                Person = true,
                SubUnit = true
            },
            OnEntry = new OnEntry()
            {
                Show = "select-instance"
            }
        };
    }

    private ModelWithShadowFields GetDataElementForShadowFields()
    {
            return new ModelWithShadowFields()
        {
            AltinnSF_hello = "hello",
            AltinnSF_test = "test",
            Property1 = 1,
            Property2 = 2,
            AltinnSF_gruppeish = new AltinnSF_gruppeish()
            {
                F1 = "f1",
                F2 = "f2",
            },
            Gruppe = new List<Gruppe>()
            {
                new()
                {
                    AltinnSF_gfhjelpefelt = "gfhjelpefelt",
                    Gf1 = "gf1",
                },
                new()
                {
                    AltinnSF_gfhjelpefelt = "gfhjelpefelt2",
                    Gf1 = "gf1-v2",
                }
            }
        };
    }
}