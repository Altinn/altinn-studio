using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Tests.Internal.Process.TestUtils;
using Altinn.App.PlatformServices.Tests.Internal.Process.StubGatewayFilters;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process;

public class ProcessNavigatorTests
{
    [Fact]
    public async Task GetNextTask_returns_next_element_if_no_gateway()
    {
        using var fixture = SetupProcessNavigator("simple-linear.bpmn", []);
        var (_, processNavigator) = fixture;
        var nextElements = await processNavigator.GetNextTask(new Instance(), "Task1", null);
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
                    },
                }
            );
    }

    [Fact]
    public async Task GetNextTask_single_sign_to_process_end()
    {
        var processFile = "with-double-sign.bpmn";
        using var fixture = SetupProcessNavigator(processFile, [new SingleSignGateway()]);
        var instance = new Instance() { Id = $"123/{Guid.NewGuid()}", AppId = "org/app" };
        var (_, processNavigator) = fixture;
        var nextElements = await processNavigator.GetNextTask(instance, "Task_Sign1", "sign");
        Assert.NotNull(nextElements);
        nextElements.Id.Should().Be("EndEvent_1");
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
        var instance = new Instance() { Id = $"123/{Guid.NewGuid()}", AppId = "org/app" };
        using var fixture = SetupProcessNavigator(processFile, [new ZeroPathsGateway()]);
        var (_, processNavigator) = fixture;
        await Assert.ThrowsAsync<ProcessException>(async () =>
            await processNavigator.GetNextTask(instance, "Task_Sign1", "sign")
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
        using var fixture = SetupProcessNavigator("simple-linear.bpmn", []);
        var (_, processNavigator) = fixture;
        var nextElements = await processNavigator.GetNextTask(new Instance(), "EndEvent", null);
        nextElements.Should().BeNull();
    }

    [Fact]
    public async Task GetNextTask_returns_default_if_no_filtering_is_implemented_and_default_set()
    {
        using var fixture = SetupProcessNavigator("simple-gateway-default.bpmn", []);
        var (_, processNavigator) = fixture;
        var nextElements = await processNavigator.GetNextTask(new Instance(), "Task1", null);
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
                            AltinnActions = new() { new("confirm"), new("reject") },
                        },
                    },
                    Incoming = new List<string> { "Flow3" },
                    Outgoing = new List<string> { "Flow5" },
                }
            );
    }

    [Fact]
    public async Task GetNextTask_runs_custom_filter_and_returns_result()
    {
        using var fixture = SetupProcessNavigator(
            "simple-gateway-with-join-gateway.bpmn",
            [new DataValuesFilter("Gateway1", "choose")]
        );
        var (_, processNavigator) = fixture;
        Instance i = new Instance()
        {
            Id = $"123/{Guid.NewGuid()}",
            AppId = "org/app",
            DataValues = new Dictionary<string, string>() { { "choose", "Flow3" } },
        };

        var nextElements = await processNavigator.GetNextTask(i, "Task1", null);
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
                            AltinnActions = new() { new("submit") },
                        },
                    },
                    Incoming = new List<string> { "Flow3" },
                    Outgoing = new List<string> { "Flow5" },
                }
            );
    }

    [Fact]
    public async Task GetNextTask_throws_ProcessException_if_multiple_targets_found()
    {
        using var fixture = SetupProcessNavigator(
            "simple-gateway-with-join-gateway.bpmn",
            new List<IProcessExclusiveGateway>() { new DataValuesFilter("Foobar", "choose") }
        );
        var (_, processNavigator) = fixture;
        Instance i = new Instance() { DataValues = new Dictionary<string, string>() { { "choose", "Flow3" } } };

        var result = await Assert.ThrowsAsync<ProcessException>(async () =>
            await processNavigator.GetNextTask(i, "Task1", null)
        );
        result
            .Message.Should()
            .Be("Multiple next elements found from Task1. Please supply action and filters or define a default flow.");
    }

    [Fact]
    public async Task GetNextTask_follows_downstream_gateways()
    {
        using var fixture = SetupProcessNavigator(
            "simple-gateway-with-join-gateway.bpmn",
            new List<IProcessExclusiveGateway>() { new DataValuesFilter("Gateway1", "choose1") }
        );
        var (_, processNavigator) = fixture;
        Instance i = new Instance()
        {
            Id = $"123/{Guid.NewGuid()}",
            AppId = "org/app",
            DataValues = new Dictionary<string, string>() { { "choose1", "Flow4" } },
        };
        var nextElements = await processNavigator.GetNextTask(i, "Task1", null);
        nextElements
            .Should()
            .BeEquivalentTo(
                new EndEvent()
                {
                    Id = "EndEvent",
                    Name = null!,
                    Incoming = new List<string> { "Flow6" },
                    Outgoing = new List<string>(),
                }
            );
    }

    [Fact]
    public async Task GetNextTask_runs_custom_filter_and_throws_exception_when_no_paths_are_found()
    {
        using var fixture = SetupProcessNavigator(
            "simple-gateway-with-join-gateway.bpmn",
            new List<IProcessExclusiveGateway>()
            {
                new DataValuesFilter("Gateway1", "choose1"),
                new DataValuesFilter("Gateway2", "choose2"),
            }
        );
        var (_, processNavigator) = fixture;
        Instance i = new Instance()
        {
            Id = $"123/{Guid.NewGuid()}",
            AppId = "org/app",
            DataValues = new Dictionary<string, string>() { { "choose1", "Flow4" }, { "choose2", "Bar" } },
        };

        await Assert.ThrowsAsync<ProcessException>(async () => await processNavigator.GetNextTask(i, "Task1", null));
    }

    [Fact]
    public async Task GetNextTask_returns_empty_list_if_element_has_no_next()
    {
        using var fixture = SetupProcessNavigator("simple-gateway-with-join-gateway.bpmn", []);
        var (_, processNavigator) = fixture;

        Instance i = new Instance() { Id = $"123/{Guid.NewGuid()}", AppId = "org/app" };

        var nextElements = await processNavigator.GetNextTask(i, "EndEvent", null);
        nextElements.Should().BeNull();
    }

    private static Fixture SetupProcessNavigator(string bpmnfile, IEnumerable<IProcessExclusiveGateway> gatewayFilters)
    {
        var services = new ServiceCollection();

        services.AddLogging(builder => builder.AddProvider(NullLoggerProvider.Instance));
        services.AddAppImplementationFactory();

        foreach (var filter in gatewayFilters)
            services.AddSingleton<IProcessExclusiveGateway>(_ => filter);
        services.AddSingleton<IProcessReader>(sp => ProcessTestUtils.SetupProcessReader(bpmnfile));
        services.AddTransient<IProcessNavigator, ProcessNavigator>();
        services.AddTransient<ExclusiveGatewayFactory>();
        services.AddSingleton(new Mock<IInstanceClient>(MockBehavior.Strict).Object);
        var appMetadata = new Mock<IAppMetadata>(MockBehavior.Strict);
        appMetadata.Setup(a => a.GetApplicationMetadata()).ReturnsAsync(new ApplicationMetadata("org/app"));
        services.AddSingleton(appMetadata.Object);
        services.AddSingleton(new Mock<IDataClient>(MockBehavior.Strict).Object);
        services.AddSingleton(new Mock<IAppModel>(MockBehavior.Strict).Object);
        services.AddSingleton(new Mock<IAppResources>(MockBehavior.Strict).Object);
        services.AddSingleton<ModelSerializationService>();
        services.AddTransient<InstanceDataUnitOfWorkInitializer>();

        var sp = services.BuildStrictServiceProvider();
        return new(sp);
    }

    private sealed record Fixture(IServiceProvider ServiceProvider) : IDisposable
    {
        public IProcessNavigator ProcessNavigator => ServiceProvider.GetRequiredService<IProcessNavigator>();

        public void Dispose() => (ServiceProvider as IDisposable)?.Dispose();

        public void Deconstruct(out IServiceProvider sp, out IProcessNavigator n)
        {
            sp = ServiceProvider;
            n = ProcessNavigator;
        }
    }
}
