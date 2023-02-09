using System;
using System.Collections.Generic;
using System.Linq;
using Altinn.App.Core.Features;
using Altinn.App.Core.Implementation;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Pdf;
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
    private readonly Application _application;
    private readonly Mock<IData> _dataMock;
    private readonly Mock<IPrefill> _prefillMock;
    private readonly IAppModel _appModel;
    private readonly Mock<IInstantiationProcessor> _instantiationMock;
    private readonly Mock<IInstance> _instanceMock;
    private IEnumerable<IProcessTaskStart> _taskStarts;
    private IEnumerable<IProcessTaskEnd> _taskEnds;
    private IEnumerable<IProcessTaskAbandon> _taskAbandons;
    private readonly Mock<IPdfService> _pdfMock;
    private readonly Mock<IFeatureManager> _featureManagerMock;
    private readonly LayoutEvaluatorStateInitializer _layoutStateInitializer;

    public DefaultTaskEventsTests()
    {
        _application = new Application();
        _resMock = new Mock<IAppResources>();
        _dataMock = new Mock<IData>();
        _prefillMock = new Mock<IPrefill>();
        _appModel = new DefaultAppModel(NullLogger<DefaultAppModel>.Instance);
        _instantiationMock = new Mock<IInstantiationProcessor>();
        _instanceMock = new Mock<IInstance>();
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
        _resMock.Setup(r => r.GetApplication()).Returns(_application);
        DefaultTaskEvents te = new DefaultTaskEvents(
            _logger,
            _resMock.Object,
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
        _resMock.Setup(r => r.GetApplication()).Returns(_application);
        Mock<IProcessTaskAbandon> abandonOne = new Mock<IProcessTaskAbandon>();
        Mock<IProcessTaskAbandon> abandonTwo = new Mock<IProcessTaskAbandon>();
        _taskAbandons = new List<IProcessTaskAbandon>() { abandonOne.Object, abandonTwo.Object };
        DefaultTaskEvents te = new DefaultTaskEvents(
            _logger,
            _resMock.Object,
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
        _resMock.Setup(r => r.GetApplication()).Returns(_application);
        Mock<IProcessTaskEnd> endOne = new Mock<IProcessTaskEnd>();
        Mock<IProcessTaskEnd> endTwo = new Mock<IProcessTaskEnd>();
        _taskEnds = new List<IProcessTaskEnd>() { endOne.Object, endTwo.Object };
        DefaultTaskEvents te = new DefaultTaskEvents(
            _logger,
            _resMock.Object,
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
        await te.OnEndProcessTask("Task_1", instance);
        endOne.Verify(a => a.End("Task_1", instance));
        endTwo.Verify(a => a.End("Task_1", instance));
        endOne.VerifyNoOtherCalls();
        endTwo.VerifyNoOtherCalls();
    }
    
    [Fact]
    public async void OnEndProcessTask_calls_all_added_implementations_of_IProcessTaskStart()
    {
        _application.DataTypes = new List<DataType>();
        _resMock.Setup(r => r.GetApplication()).Returns(_application);
        Mock<IProcessTaskStart> startOne = new Mock<IProcessTaskStart>();
        Mock<IProcessTaskStart> startTwo = new Mock<IProcessTaskStart>();
        _taskStarts = new List<IProcessTaskStart>() { startOne.Object, startTwo.Object };
        DefaultTaskEvents te = new DefaultTaskEvents(
            _logger,
            _resMock.Object,
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
        startOne.Verify(a => a.Start("Task_1", instance, prefill));
        startTwo.Verify(a => a.Start("Task_1", instance, prefill));
        startOne.VerifyNoOtherCalls();
        startTwo.VerifyNoOtherCalls();
    }

    public void Dispose()
    {
        _resMock.Verify(r => r.GetApplication());
        _resMock.VerifyNoOtherCalls();
        _dataMock.VerifyNoOtherCalls();
        _prefillMock.VerifyNoOtherCalls();
        _instantiationMock.VerifyNoOtherCalls();
        _instanceMock.VerifyNoOtherCalls();
        _pdfMock.VerifyNoOtherCalls();
    }
}