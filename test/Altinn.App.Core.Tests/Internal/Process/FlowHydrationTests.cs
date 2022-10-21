using System.Collections.Generic;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.Base;
using Altinn.App.PlatformServices.Tests.Internal.Process.StubGatewayFilters;
using Altinn.App.PlatformServices.Tests.Internal.Process.TestUtils;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Internal.Process;

public class FlowHydrationTests
{
    [Fact]
    public async void NextFollowAndFilterGateways_returns_next_element_if_no_gateway()
    {
        IFlowHydration flowHydrator = SetupFlowHydration("simple-linear.bpmn", new List<IProcessExclusiveGateway>());
        List<ProcessElement> nextElements = await flowHydrator.NextFollowAndFilterGateways(new Instance(), "Task1");
        nextElements.Should().BeEquivalentTo(new List<ProcessElement>()
        {
            new ProcessTask()
            {
                Id = "Task2",
                Name = "Bekreft skjemadata",
                TaskType = "confirmation",
                Incoming = new List<string> { "Flow2" },
                Outgoing = new List<string> { "Flow3" }
            }
        });
    }

    [Fact]
    public async void NextFollowAndFilterGateways_returns_empty_list_if_no_outgoing_flows()
    {
        IFlowHydration flowHydrator = SetupFlowHydration("simple-linear.bpmn", new List<IProcessExclusiveGateway>());
        List<ProcessElement> nextElements = await flowHydrator.NextFollowAndFilterGateways(new Instance(), "EndEvent");
        nextElements.Should().BeEmpty();
    }

    [Fact]
    public async void NextFollowAndFilterGateways_returns_default_if_no_filtering_is_implemented_and_default_set()
    {
        IFlowHydration flowHydrator = SetupFlowHydration("simple-gateway-default.bpmn", new List<IProcessExclusiveGateway>());
        List<ProcessElement> nextElements = await flowHydrator.NextFollowAndFilterGateways(new Instance(), "Task1");
        nextElements.Should().BeEquivalentTo(new List<ProcessElement>()
        {
            new ProcessTask()
            {
                Id = "Task2",
                Name = null!,
                TaskType = null!,
                Incoming = new List<string> { "Flow3" },
                Outgoing = new List<string> { "Flow5" }
            }
        });
    }
    
    [Fact]
    public async void NextFollowAndFilterGateways_returns_all_if_no_filtering_is_implemented_and_default_set_but_followDefaults_false()
    {
        IFlowHydration flowHydrator = SetupFlowHydration("simple-gateway-default.bpmn", new List<IProcessExclusiveGateway>());
        List<ProcessElement> nextElements = await flowHydrator.NextFollowAndFilterGateways(new Instance(), "Task1", false);
        nextElements.Should().BeEquivalentTo(new List<ProcessElement>()
        {
            new ProcessTask()
            {
                Id = "Task2",
                Name = null!,
                TaskType = null!,
                Incoming = new List<string> { "Flow3" },
                Outgoing = new List<string> { "Flow5" }
            },
            new EndEvent()
            {
                Id = "EndEvent", 
                Incoming = new List<string> { "Flow5", "Flow4" }, 
                Name = null!, 
                Outgoing = new List<string>()
            }
        });
    }

    [Fact]
    public async void NextFollowAndFilterGateways_returns_all_gateway_target_tasks_if_no_filter_and_default()
    {
        IFlowHydration flowHydrator = SetupFlowHydration("simple-gateway.bpmn", new List<IProcessExclusiveGateway>());
        List<ProcessElement> nextElements = await flowHydrator.NextFollowAndFilterGateways(new Instance(), "Task1");
        nextElements.Should().BeEquivalentTo(new List<ProcessElement>()
        {
            new ProcessTask()
            {
                Id = "Task2",
                Name = null!,
                TaskType = null!,
                Incoming = new List<string> { "Flow3" },
                Outgoing = new List<string> { "Flow5" }
            },
            new ProcessTask()
            {
                Id = "EndEvent",
                Name = null!,
                TaskType = null!,
                Incoming = new List<string> { "Flow4", "Flow5" },
                Outgoing = new List<string>()
            }
        });
    }
    
    [Fact]
    public async void NextFollowAndFilterGateways_returns_all_gateway_target_tasks_if_no_filter_and_default_folowDefaults_false()
    {
        IFlowHydration flowHydrator = SetupFlowHydration("simple-gateway.bpmn", new List<IProcessExclusiveGateway>());
        List<ProcessElement> nextElements = await flowHydrator.NextFollowAndFilterGateways(new Instance(), "Task1", false);
        nextElements.Should().BeEquivalentTo(new List<ProcessElement>()
        {
            new ProcessTask()
            {
                Id = "Task2",
                Name = null!,
                TaskType = null!,
                Incoming = new List<string> { "Flow3" },
                Outgoing = new List<string> { "Flow5" }
            },
            new ProcessTask()
            {
                Id = "EndEvent",
                Name = null!,
                TaskType = null!,
                Incoming = new List<string> { "Flow4", "Flow5" },
                Outgoing = new List<string>()
            }
        });
    }

    [Fact]
    public async void NextFollowAndFilterGateways_runs_custom_filter_and_returns_result()
    {
        IFlowHydration flowHydrator = SetupFlowHydration("simple-gateway-with-join-gateway.bpmn", new List<IProcessExclusiveGateway>()
        {
            new DataValuesFilter("Gateway1", "choose")
        });
        Instance i = new Instance()
        {
            DataValues = new Dictionary<string, string>()
            {
                { "choose", "Flow3" }
            }
        };
        
        List<ProcessElement> nextElements = await flowHydrator.NextFollowAndFilterGateways(i, "Task1");
        nextElements.Should().BeEquivalentTo(new List<ProcessElement>()
        {
            new ProcessTask()
            {
                Id = "Task2",
                Name = null!,
                TaskType = null!,
                Incoming = new List<string> { "Flow3" },
                Outgoing = new List<string> { "Flow5" }
            }
        });
    }
    
    [Fact]
    public async void NextFollowAndFilterGateways_does_not_run_filter_with_non_matchin_ids()
    {
        IFlowHydration flowHydrator = SetupFlowHydration("simple-gateway-with-join-gateway.bpmn", new List<IProcessExclusiveGateway>()
        {
            new DataValuesFilter("Foobar", "choose")
        });
        Instance i = new Instance()
        {
            DataValues = new Dictionary<string, string>()
            {
                { "choose", "Flow3" }
            }
        };
        
        List<ProcessElement> nextElements = await flowHydrator.NextFollowAndFilterGateways(i, "Task1");
        nextElements.Should().BeEquivalentTo(new List<ProcessElement>()
        {
            new ProcessTask()
            {
                Id = "Task2",
                Name = null!,
                TaskType = null!,
                Incoming = new List<string> { "Flow3" },
                Outgoing = new List<string> { "Flow5" }
            },
            new ProcessTask()
            {
                Id = "EndEvent",
                Name = null!,
                TaskType = null!,
                Incoming = new List<string> { "Flow6" },
                Outgoing = new List<string>()
            }
        });
    }

    [Fact]
    public async void NextFollowAndFilterGateways_follows_downstream_gateways()
    {
        IFlowHydration flowHydrator = SetupFlowHydration("simple-gateway-with-join-gateway.bpmn", new List<IProcessExclusiveGateway>());
        List<ProcessElement> nextElements = await flowHydrator.NextFollowAndFilterGateways(new Instance(), "Task1");
        nextElements.Should().BeEquivalentTo(new List<ProcessElement>()
        {
            new ProcessTask()
            {
                Id = "Task2",
                Name = null!,
                TaskType = null!,
                Incoming = new List<string> { "Flow3" },
                Outgoing = new List<string> { "Flow5" }
            },
            new ProcessTask()
            {
                Id = "EndEvent",
                Name = null!,
                TaskType = null!,
                Incoming = new List<string> { "Flow6" },
                Outgoing = new List<string>()
            }
        });
    }
    
    [Fact]
    public async void NextFollowAndFilterGateways_runs_custom_filter_and_returns_empty_list_if_all_filtered_out()
    {
        IFlowHydration flowHydrator = SetupFlowHydration("simple-gateway-with-join-gateway.bpmn", new List<IProcessExclusiveGateway>()
        {
            new DataValuesFilter("Gateway1", "choose1"),
            new DataValuesFilter("Gateway2", "choose2")
        });
        Instance i = new Instance()
        {
            DataValues = new Dictionary<string, string>()
            {
                { "choose1", "Flow4" },
                { "choose2", "Foobar" }
            }
        };
        
        List<ProcessElement> nextElements = await flowHydrator.NextFollowAndFilterGateways(i, "Task1");
        nextElements.Should().BeEmpty();
    }
    
    [Fact]
    public async void NextFollowAndFilterGateways_returns_empty_list_if_element_has_no_next()
    {
        IFlowHydration flowHydrator = SetupFlowHydration("simple-gateway-with-join-gateway.bpmn", new List<IProcessExclusiveGateway>());
        Instance i = new Instance();
        
        List<ProcessElement> nextElements = await flowHydrator.NextFollowAndFilterGateways(i, "EndEvent");
        nextElements.Should().BeEmpty();
    }

    private static IFlowHydration SetupFlowHydration(string bpmnfile, IEnumerable<IProcessExclusiveGateway> gatewayFilters)
    {
        ProcessReader pr = ProcessTestUtils.SetupProcessReader(bpmnfile);
        return new FlowHydration(pr, new ExclusiveGatewayFactory(gatewayFilters));
    }
}
