using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.Base;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Tests.Internal.Process.TestUtils;
using Altinn.App.PlatformServices.Tests.Internal.Process.StubGatewayFilters;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process;

public class ProcessNavigatorTests
{
    private readonly Mock<IDataClient> _dataClient = new(MockBehavior.Strict);
    private readonly Mock<IInstanceClient> _instanceClient = new(MockBehavior.Strict);
    private readonly Mock<IAppMetadata> _appMetadata = new(MockBehavior.Strict);
    private readonly Mock<IAppModel> _appModel = new(MockBehavior.Strict);

    [Fact]
    public async Task GetNextTask_returns_next_element_if_no_gateway()
    {
        var processNavigator = SetupProcessNavigator("simple-linear.bpmn", []);
        ProcessElement? nextElements = await processNavigator.GetNextTask(new Instance(), "Task1", null);
        nextElements
            .Should()
            .BeEquivalentTo(
                new ProcessTask()
                {
                    Id = "Task2",
                    Name = "Bekreft skjemadata",
                    Incoming = new List<string> { "Flow2" },
                    Outgoing = new List<string> { "Flow3" },
                    ExtensionElements = new ExtensionElements()
                    {
                        TaskExtension = new() { TaskType = "confirmation", AltinnActions = new() },
                    }
                }
            );
    }

    [Fact]
    public async Task GetNextTask_single_sign_to_process_end()
    {
        var processFile = "with-double-sign.bpmn";
        var processNavigator = SetupProcessNavigator(processFile, [new SingleSignGateway()]);
        var instance = new Instance() { Id = $"123/{Guid.NewGuid()}", AppId = "org/app", };
        ProcessElement? nextElements = await processNavigator.GetNextTask(instance, "Task_Sign1", "sign");
        nextElements!.Id.Should().Be("EndEvent_1");
    }

    private sealed class SingleSignGateway : IProcessExclusiveGateway
    {
        public string GatewayId => "AltinnExpressionsExclusiveGateway";

        public Task<List<SequenceFlow>> FilterAsync(
            List<SequenceFlow> outgoingFlows,
            Instance instance,
            IInstanceDataAccessor dataAccessor,
            ProcessGatewayInformation processGatewayInformation
        )
        {
            return Task.FromResult(
                outgoingFlows.Where(f => f.Id == "Flow_sign1_sign" || f.Id == "Flow_SingleSign").ToList()
            );
        }

        Task<List<SequenceFlow>> IProcessExclusiveGateway.FilterAsync(
            List<SequenceFlow> outgoingFlows,
            Instance instance,
            ProcessGatewayInformation processGatewayInformation
        )
        {
            //TODO: Remove legacy method when removed from interface
            throw new NotImplementedException();
        }
    }

    [Fact]
    public async Task GetNextTask_exclusive_gateway_zero_paths_should_fail()
    {
        var processFile = "with-double-sign.bpmn";
        var processNavigator = SetupProcessNavigator(processFile, [new ZeroPathsGateway()]);
        var instance = new Instance() { Id = $"123/{Guid.NewGuid()}", AppId = "org/app", };

        await Assert.ThrowsAsync<ProcessException>(
            async () => await processNavigator.GetNextTask(instance, "Task_Sign1", "sign")
        );
    }

    private sealed class ZeroPathsGateway : IProcessExclusiveGateway
    {
        public string GatewayId => "AltinnExpressionsExclusiveGateway";

        public Task<List<SequenceFlow>> FilterAsync(
            List<SequenceFlow> outgoingFlows,
            Instance instance,
            IInstanceDataAccessor dataAccessor,
            ProcessGatewayInformation processGatewayInformation
        )
        {
            return Task.FromResult(new List<SequenceFlow>());
        }

        Task<List<SequenceFlow>> IProcessExclusiveGateway.FilterAsync(
            List<SequenceFlow> outgoingFlows,
            Instance instance,
            ProcessGatewayInformation processGatewayInformation
        )
        {
            //TODO: Remove legacy method when removed from interface in v9
            throw new NotImplementedException();
        }
    }

    [Fact]
    public async Task NextFollowAndFilterGateways_returns_empty_list_if_no_outgoing_flows()
    {
        var processNavigator = SetupProcessNavigator("simple-linear.bpmn", []);
        ProcessElement? nextElements = await processNavigator.GetNextTask(new Instance(), "EndEvent", null);
        nextElements.Should().BeNull();
    }

    [Fact]
    public async Task GetNextTask_returns_default_if_no_filtering_is_implemented_and_default_set()
    {
        var processNavigator = SetupProcessNavigator("simple-gateway-default.bpmn", []);
        ProcessElement? nextElements = await processNavigator.GetNextTask(new Instance(), "Task1", null);
        nextElements
            .Should()
            .BeEquivalentTo(
                new ProcessTask()
                {
                    Id = "Task2",
                    Name = null!,
                    ExtensionElements = new()
                    {
                        TaskExtension = new()
                        {
                            TaskType = "confirm",
                            AltinnActions = new() { new("confirm"), new("reject") }
                        }
                    },
                    Incoming = new List<string> { "Flow3" },
                    Outgoing = new List<string> { "Flow5" }
                }
            );
    }

    [Fact]
    public async Task GetNextTask_runs_custom_filter_and_returns_result()
    {
        var processNavigator = SetupProcessNavigator(
            "simple-gateway-with-join-gateway.bpmn",
            [new DataValuesFilter("Gateway1", "choose")]
        );
        Instance i = new Instance()
        {
            Id = $"123/{Guid.NewGuid()}",
            AppId = "org/app",
            DataValues = new Dictionary<string, string>() { { "choose", "Flow3" } }
        };

        ProcessElement? nextElements = await processNavigator.GetNextTask(i, "Task1", null);
        nextElements
            .Should()
            .BeEquivalentTo(
                new ProcessTask()
                {
                    Id = "Task2",
                    Name = null!,
                    ExtensionElements = new()
                    {
                        TaskExtension = new()
                        {
                            TaskType = "data",
                            AltinnActions = new() { new("submit") }
                        }
                    },
                    Incoming = new List<string> { "Flow3" },
                    Outgoing = new List<string> { "Flow5" }
                }
            );
    }

    [Fact]
    public async Task GetNextTask_throws_ProcessException_if_multiple_targets_found()
    {
        var processNavigator = SetupProcessNavigator(
            "simple-gateway-with-join-gateway.bpmn",
            new List<IProcessExclusiveGateway>() { new DataValuesFilter("Foobar", "choose") }
        );
        Instance i = new Instance() { DataValues = new Dictionary<string, string>() { { "choose", "Flow3" } } };

        var result = await Assert.ThrowsAsync<ProcessException>(
            async () => await processNavigator.GetNextTask(i, "Task1", null)
        );
        result
            .Message.Should()
            .Be("Multiple next elements found from Task1. Please supply action and filters or define a default flow.");
    }

    [Fact]
    public async Task GetNextTask_follows_downstream_gateways()
    {
        var processNavigator = SetupProcessNavigator(
            "simple-gateway-with-join-gateway.bpmn",
            new List<IProcessExclusiveGateway>() { new DataValuesFilter("Gateway1", "choose1") }
        );
        Instance i = new Instance()
        {
            Id = $"123/{Guid.NewGuid()}",
            AppId = "org/app",
            DataValues = new Dictionary<string, string>() { { "choose1", "Flow4" } }
        };
        ProcessElement? nextElements = await processNavigator.GetNextTask(i, "Task1", null);
        nextElements
            .Should()
            .BeEquivalentTo(
                new EndEvent()
                {
                    Id = "EndEvent",
                    Name = null!,
                    Incoming = new List<string> { "Flow6" },
                    Outgoing = new List<string>()
                }
            );
    }

    [Fact]
    public async Task GetNextTask_runs_custom_filter_and_throws_exception_when_no_paths_are_found()
    {
        var processNavigator = SetupProcessNavigator(
            "simple-gateway-with-join-gateway.bpmn",
            new List<IProcessExclusiveGateway>()
            {
                new DataValuesFilter("Gateway1", "choose1"),
                new DataValuesFilter("Gateway2", "choose2")
            }
        );
        Instance i = new Instance()
        {
            Id = $"123/{Guid.NewGuid()}",
            AppId = "org/app",
            DataValues = new Dictionary<string, string>() { { "choose1", "Flow4" }, { "choose2", "Bar" } }
        };

        await Assert.ThrowsAsync<ProcessException>(async () => await processNavigator.GetNextTask(i, "Task1", null));
    }

    [Fact]
    public async Task GetNextTask_returns_empty_list_if_element_has_no_next()
    {
        var processNavigator = SetupProcessNavigator(
            "simple-gateway-with-join-gateway.bpmn",
            new List<IProcessExclusiveGateway>()
        );
        Instance i = new Instance() { Id = $"123/{Guid.NewGuid()}", AppId = "org/app", };

        ProcessElement? nextElements = await processNavigator.GetNextTask(i, "EndEvent", null);
        nextElements.Should().BeNull();
    }

    private ProcessNavigator SetupProcessNavigator(
        string bpmnfile,
        IEnumerable<IProcessExclusiveGateway> gatewayFilters
    )
    {
        ProcessReader pr = ProcessTestUtils.SetupProcessReader(bpmnfile);
        return new ProcessNavigator(
            pr,
            new ExclusiveGatewayFactory(gatewayFilters),
            new NullLogger<ProcessNavigator>(),
            _dataClient.Object,
            _instanceClient.Object,
            _appMetadata.Object,
            new ModelSerializationService(_appModel.Object)
        );
    }
}
