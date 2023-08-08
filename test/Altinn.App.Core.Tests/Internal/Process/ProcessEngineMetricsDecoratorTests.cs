using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Tests.TestHelpers;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Moq;
using Prometheus;
using Xunit;

namespace Altinn.App.Core.Tests.Internal.Process;

public class ProcessEngineMetricsDecoratorTests
{
    public ProcessEngineMetricsDecoratorTests()
    {
        Metrics.SuppressDefaultMetrics();
    }

    [Fact]
    public async Task StartProcess_calls_decorated_service_and_increments_success_counter_when_successful()
    {
        // Arrange
        var processEngine = new Mock<IProcessEngine>();
        processEngine.Setup(p => p.StartProcess(It.IsAny<ProcessStartRequest>())).ReturnsAsync(new ProcessChangeResult { Success = true });
        var decorator = new ProcessEngineMetricsDecorator(processEngine.Object);
        (await ReadPrometheusMetricsToString()).Should().NotContain("altinn_app_process_start_count{result=\"success\"}");

        var result = decorator.StartProcess(new ProcessStartRequest());

        (await ReadPrometheusMetricsToString()).Should().Contain("altinn_app_process_start_count{result=\"success\"} 1");
        result.Result.Success.Should().BeTrue();
        result = decorator.StartProcess(new ProcessStartRequest());
        (await ReadPrometheusMetricsToString()).Should().Contain("altinn_app_process_start_count{result=\"success\"} 2");
        result.Result.Success.Should().BeTrue();
        processEngine.Verify(p => p.StartProcess(It.IsAny<ProcessStartRequest>()), Times.Exactly(2));
        processEngine.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task StartProcess_calls_decorated_service_and_increments_failure_counter_when_unsuccessful()
    {
        // Arrange
        var processEngine = new Mock<IProcessEngine>();
        processEngine.Setup(p => p.StartProcess(It.IsAny<ProcessStartRequest>())).ReturnsAsync(new ProcessChangeResult { Success = false });
        var decorator = new ProcessEngineMetricsDecorator(processEngine.Object);
        (await ReadPrometheusMetricsToString()).Should().NotContain("altinn_app_process_start_count{result=\"failure\"}");

        var result = decorator.StartProcess(new ProcessStartRequest());

        (await ReadPrometheusMetricsToString()).Should().Contain("altinn_app_process_start_count{result=\"failure\"} 1");
        result.Result.Success.Should().BeFalse();
        result = decorator.StartProcess(new ProcessStartRequest());
        (await ReadPrometheusMetricsToString()).Should().Contain("altinn_app_process_start_count{result=\"failure\"} 2");
        result.Result.Success.Should().BeFalse();
        processEngine.Verify(p => p.StartProcess(It.IsAny<ProcessStartRequest>()), Times.Exactly(2));
        processEngine.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Next_calls_decorated_service_and_increments_success_counter_when_successful()
    {
        // Arrange
        var processEngine = new Mock<IProcessEngine>();
        processEngine.Setup(p => p.Next(It.IsAny<ProcessNextRequest>())).ReturnsAsync(new ProcessChangeResult { Success = true });
        var decorator = new ProcessEngineMetricsDecorator(processEngine.Object);
        (await ReadPrometheusMetricsToString()).Should().NotContain("altinn_app_process_task_next_count{result=\"success\",action=\"write\",task=\"Task_1\"}");

        var result = decorator.Next(new ProcessNextRequest()
        {
            Instance = new()
            {
                Process = new()
                {
                    CurrentTask = new()
                    {
                        ElementId = "Task_1"
                    }
                }
            },
            Action = "write"
        });

        (await ReadPrometheusMetricsToString()).Should().Contain("altinn_app_process_task_next_count{result=\"success\",action=\"write\",task=\"Task_1\"} 1");
        result.Result.Success.Should().BeTrue();
        result = decorator.Next(new ProcessNextRequest()
        {
            Instance = new()
            {
                Process = new()
                {
                    CurrentTask = new()
                    {
                        ElementId = "Task_1"
                    }
                }
            },
            Action = "write"
        });
        var prometheusMetricsToString = await ReadPrometheusMetricsToString();
        prometheusMetricsToString.Should().Contain("altinn_app_process_task_next_count{result=\"success\",action=\"write\",task=\"Task_1\"} 2");
        result.Result.Success.Should().BeTrue();
        processEngine.Verify(p => p.Next(It.IsAny<ProcessNextRequest>()), Times.Exactly(2));
        processEngine.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Next_calls_decorated_service_and_increments_failure_counter_when_unsuccessful()
    {
        // Arrange
        var processEngine = new Mock<IProcessEngine>();
        processEngine.Setup(p => p.Next(It.IsAny<ProcessNextRequest>())).ReturnsAsync(new ProcessChangeResult { Success = false });
        var decorator = new ProcessEngineMetricsDecorator(processEngine.Object);
        (await ReadPrometheusMetricsToString()).Should().NotContain("altinn_app_process_task_next_count{result=\"failure\",action=\"write\",task=\"Task_1\"}");

        var result = decorator.Next(new ProcessNextRequest()
        {
            Instance = new()
            {
                Process = new()
                {
                    CurrentTask = new()
                    {
                        ElementId = "Task_1"
                    }
                }
            },
            Action = "write"
        });

        (await ReadPrometheusMetricsToString()).Should().Contain("altinn_app_process_task_next_count{result=\"failure\",action=\"write\",task=\"Task_1\"} 1");
        result.Result.Success.Should().BeFalse();
        result = decorator.Next(new ProcessNextRequest()
        {
            Instance = new()
            {
                Process = new()
                {
                    CurrentTask = new()
                    {
                        ElementId = "Task_1"
                    }
                }
            },
            Action = "write"
        });
        var prometheusMetricsToString = await ReadPrometheusMetricsToString();
        prometheusMetricsToString.Should().Contain("altinn_app_process_task_next_count{result=\"failure\",action=\"write\",task=\"Task_1\"} 2");
        result.Result.Success.Should().BeFalse();
        processEngine.Verify(p => p.Next(It.IsAny<ProcessNextRequest>()), Times.Exactly(2));
        processEngine.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Next_calls_decorated_service_and_increments_success_and_end_counters_when_successful_and_process_ended()
    {
        // Arrange
        var processEngine = new Mock<IProcessEngine>();
        var ended = DateTime.Now;
        var started = ended.AddSeconds(-20);
        processEngine.Setup(p => p.Next(It.IsAny<ProcessNextRequest>())).ReturnsAsync(new ProcessChangeResult
        {
            Success = true,
            ProcessStateChange = new()
            {
                NewProcessState = new()
                {
                    Ended = ended,
                    Started = started
                }
            }
        });
        var decorator = new ProcessEngineMetricsDecorator(processEngine.Object);
        (await ReadPrometheusMetricsToString()).Should().NotContain("altinn_app_process_task_next_count{result=\"success\",action=\"confirm\",task=\"Task_2\"}");
        (await ReadPrometheusMetricsToString()).Should().NotContain("altinn_app_process_end_count{result=\"success\"}");
        (await ReadPrometheusMetricsToString()).Should().NotContain("altinn_app_process_end_time_total{result=\"success\"}");

        var result = decorator.Next(new ProcessNextRequest()
        {
            Instance = new()
            {
                Process = new()
                {
                    CurrentTask = new()
                    {
                        ElementId = "Task_2"
                    }
                }
            },
            Action = "confirm"
        });

        (await ReadPrometheusMetricsToString()).Should().Contain("altinn_app_process_task_next_count{result=\"success\",action=\"confirm\",task=\"Task_2\"} 1");
        (await ReadPrometheusMetricsToString()).Should().Contain("altinn_app_process_end_count{result=\"success\"} 1");
        (await ReadPrometheusMetricsToString()).Should().Contain("altinn_app_process_end_time_total{result=\"success\"} 20");
        result.Result.Success.Should().BeTrue();
        result = decorator.Next(new ProcessNextRequest()
        {
            Instance = new()
            {
                Process = new()
                {
                    CurrentTask = new()
                    {
                        ElementId = "Task_2"
                    }
                }
            },
            Action = "confirm"
        });
        var prometheusMetricsToString = await ReadPrometheusMetricsToString();
        prometheusMetricsToString.Should().Contain("altinn_app_process_task_next_count{result=\"success\",action=\"confirm\",task=\"Task_2\"} 2");
        (await ReadPrometheusMetricsToString()).Should().Contain("altinn_app_process_end_count{result=\"success\"} 2");
        (await ReadPrometheusMetricsToString()).Should().Contain("altinn_app_process_end_time_total{result=\"success\"} 40");
        result.Result.Success.Should().BeTrue();
        processEngine.Verify(p => p.Next(It.IsAny<ProcessNextRequest>()), Times.Exactly(2));
        processEngine.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Next_calls_decorated_service_and_increments_failure_and_end_counters_when_unsuccessful_and_process_ended_no_time_added_if_started_null()
    {
        // Arrange
        var processEngine = new Mock<IProcessEngine>();
        var ended = DateTime.Now;
        processEngine.Setup(p => p.Next(It.IsAny<ProcessNextRequest>())).ReturnsAsync(new ProcessChangeResult
        {
            Success = false,
            ProcessStateChange = new()
            {
                NewProcessState = new()
                {
                    Ended = ended
                }
            }
        });
        var decorator = new ProcessEngineMetricsDecorator(processEngine.Object);
        var prometheusMetricsToString = await ReadPrometheusMetricsToString();
        prometheusMetricsToString.Should().NotContain("altinn_app_process_task_next_count{result=\"failure\",action=\"confirm\",task=\"Task_3\"}");
        prometheusMetricsToString.Should().NotContain("altinn_app_process_end_count{result=\"failure\"}");
        prometheusMetricsToString.Should().NotContain("altinn_app_process_end_time_total{result=\"failure\"}");

        var result = decorator.Next(new ProcessNextRequest()
        {
            Instance = new()
            {
                Process = new()
                {
                    CurrentTask = new()
                    {
                        ElementId = "Task_3"
                    }
                }
            },
            Action = "confirm"
        });

        prometheusMetricsToString = await ReadPrometheusMetricsToString();
        prometheusMetricsToString.Should().Contain("altinn_app_process_task_next_count{result=\"failure\",action=\"confirm\",task=\"Task_3\"} 1");
        prometheusMetricsToString.Should().Contain("altinn_app_process_end_count{result=\"failure\"} 1");
        prometheusMetricsToString.Should().NotContain("altinn_app_process_end_time_total{result=\"failure\"}");
        result.Result.Success.Should().BeFalse();
        result = decorator.Next(new ProcessNextRequest()
        {
            Instance = new()
            {
                Process = new()
                {
                    CurrentTask = new()
                    {
                        ElementId = "Task_3"
                    }
                }
            },
            Action = "confirm"
        });
        prometheusMetricsToString = await ReadPrometheusMetricsToString();
        prometheusMetricsToString.Should().Contain("altinn_app_process_task_next_count{result=\"failure\",action=\"confirm\",task=\"Task_3\"} 2");
        prometheusMetricsToString.Should().Contain("altinn_app_process_end_count{result=\"failure\"} 2");
        prometheusMetricsToString.Should().NotContain("altinn_app_process_end_time_total{result=\"failure\"}");
        result.Result.Success.Should().BeFalse();
        processEngine.Verify(p => p.Next(It.IsAny<ProcessNextRequest>()), Times.Exactly(2));
        processEngine.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UpdateInstanceAndRerunEvents_calls_decorated_service()
    {
        // Arrange
        var processEngine = new Mock<IProcessEngine>();
        processEngine.Setup(p => p.UpdateInstanceAndRerunEvents(It.IsAny<ProcessStartRequest>(), It.IsAny<List<InstanceEvent>>())).ReturnsAsync(new Instance { });
        var decorator = new ProcessEngineMetricsDecorator(processEngine.Object);
        (await ReadPrometheusMetricsToString()).Should().NotContain("altinn_app_process_start_count{result=\"success\"}");

        await decorator.UpdateInstanceAndRerunEvents(new ProcessStartRequest(), new List<InstanceEvent>());

        processEngine.Verify(p => p.UpdateInstanceAndRerunEvents(It.IsAny<ProcessStartRequest>(), It.IsAny<List<InstanceEvent>>()), Times.Once);
        processEngine.VerifyNoOtherCalls();
    }

    private static async Task<string> ReadPrometheusMetricsToString()
    {
        return await PrometheusTestHelper.ReadPrometheusMetricsToString();
    }
}
