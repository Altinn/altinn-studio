using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Altinn.App.Api.Controllers;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.InstanceLocking;
using Altinn.App.Core.Internal.Process.ProcessTasks.Signing;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class WorkflowEngineCallbackControllerCommandTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "tdd";
    private const string App = "contributer-restriction";
    private const int OwnerId = 500600;
    private const string CommandKey = "customer-command";

    public WorkflowEngineCallbackControllerCommandTests(
        WebApplicationFactory<Program> factory,
        ITestOutputHelper outputHelper
    )
        : base(factory, outputHelper) { }

    [Theory]
    [InlineData("retry", HttpStatusCode.InternalServerError, "CustomerRetry")]
    [InlineData("permanent", HttpStatusCode.UnprocessableEntity, "CustomerPermanent")]
    [InlineData("exception", HttpStatusCode.InternalServerError, "InvalidOperationException")]
    [InlineData("cancellation", HttpStatusCode.InternalServerError, "OperationCanceledException")]
    [InlineData("null", HttpStatusCode.UnprocessableEntity, "Invalid Command Result")]
    public async Task OrdinaryCommand_ReceivesPersistedInput_AndMapsItsOutcome(
        string outcome,
        HttpStatusCode expectedStatus,
        string expectedTitle
    )
    {
        var probe = new Probe();
        OverrideServicesForThisTest = services =>
            services.AddScoped<IWorkflowEngineCommand>(_ => new CustomerCommand(outcome, probe));

        var instanceGuid = Guid.NewGuid();
        using var client = GetRootedClient(Org, App);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            Services.GetRequiredService<IWorkflowCallbackTokenGenerator>().GenerateToken(instanceGuid)
        );
        string input = JsonSerializer.Serialize(new { TaskId = "Task_Original", Value = "customer data" });
        var payload = CreatePayload(instanceGuid, input);

        using var response = await client.PostAsJsonAsync(
            $"{Org}/{App}/instances/{OwnerId}/{instanceGuid}/workflow-engine-callbacks/{CommandKey}",
            payload
        );

        Assert.Equal(expectedStatus, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal(expectedTitle, problem?.Title);
        Assert.Equal(1, probe.ExecutionCount);
        Assert.Equal(payload.WorkflowId, probe.Context.WorkflowId);
        Assert.Equal(payload.StepId, probe.Context.StepId);
        Assert.Equal(input, probe.Context.CommandPayload);
        Assert.Equal("Task_Current", probe.Context.InstanceDataMutator.Instance.Process.CurrentTask.ElementId);
    }

    [Fact]
    public async Task OrdinaryCommand_PropagatesRequestedCancellation()
    {
        var probe = new Probe();
        OverrideServicesForThisTest = services =>
            services.AddScoped<IWorkflowEngineCommand>(_ => new CustomerCommand("requested-cancellation", probe));
        using var client = GetRootedClient(Org, App);
        await using var scope = Services.CreateAsyncScope();
        var controller = ActivatorUtilities.CreateInstance<WorkflowEngineCallbackController>(scope.ServiceProvider);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { RequestServices = scope.ServiceProvider },
        };
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        Guid instanceGuid = Guid.NewGuid();

        var exception = await Assert.ThrowsAsync<OperationCanceledException>(() =>
            controller.ExecuteCommand(
                Org,
                App,
                OwnerId,
                instanceGuid,
                CommandKey,
                CreatePayload(instanceGuid, "{}"),
                cancellation.Token
            )
        );

        Assert.Equal(1, probe.ExecutionCount);
        Assert.Equal(cancellation.Token, exception.CancellationToken);
    }

    [Theory]
    [InlineData("success", HttpStatusCode.OK)]
    [InlineData("permanent", HttpStatusCode.UnprocessableEntity)]
    public async Task DecoratedNotification_OwnsFreshLockThroughExecution_AndReleasesIt(
        string outcome,
        HttpStatusCode expectedStatus
    )
    {
        bool lockHeld = false;
        var probe = new Probe { WhenExecuting = () => Assert.True(lockHeld) };
        var lease = new Mock<IInstanceLock>(MockBehavior.Strict);
        lease.Setup(x => x.Lock(TimeSpan.FromMinutes(10))).Callback(() => lockHeld = true).Returns(Task.CompletedTask);
        lease.Setup(x => x.DisposeAsync()).Callback(() => lockHeld = false).Returns(ValueTask.CompletedTask);
        var locker = new Mock<IInstanceLocker>(MockBehavior.Strict);
        locker.Setup(x => x.InitLock(OwnerId, It.IsAny<Guid>())).Returns(lease.Object);
        OverrideServicesForThisTest = services =>
        {
            var original = services.Single(x => x.ImplementationType == typeof(NotifySigneeCommand));
            services.Remove(original);
            // Framework command decorators retain their key but no longer have the concrete command type.
            services.AddScoped<IWorkflowEngineCommand>(_ => new CustomerCommand(
                outcome,
                probe,
                NotifySigneeCommand.Key
            ));
            services.AddSingleton(locker.Object);
        };
        Guid instanceGuid = Guid.NewGuid();
        using var client = GetRootedClient(Org, App);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            Services.GetRequiredService<IWorkflowCallbackTokenGenerator>().GenerateToken(instanceGuid)
        );

        using var response = await client.PostAsJsonAsync(
            $"{Org}/{App}/instances/{OwnerId}/{instanceGuid}/workflow-engine-callbacks/{NotifySigneeCommand.Key}",
            CreatePayload(instanceGuid, "{}", NotifySigneeCommand.Key)
        );

        Assert.Equal(expectedStatus, response.StatusCode);
        Assert.Equal(1, probe.ExecutionCount);
        Assert.False(lockHeld);
        locker.Verify(x => x.UseExternalLockToken(It.IsAny<string>()), Times.Never);
        lease.Verify(x => x.DisposeAsync(), Times.Once);
    }

    [Fact]
    public async Task Notification_LockContention_DefersWithoutExecutingOrChangingState()
    {
        var probe = new Probe();
        var lease = new Mock<IInstanceLock>(MockBehavior.Strict);
        using var conflictResponse = new HttpResponseMessage(HttpStatusCode.Conflict);
        var conflict = await PlatformHttpException.Create(conflictResponse);
        lease.Setup(x => x.Lock(TimeSpan.FromMinutes(10))).ThrowsAsync(conflict);
        lease.Setup(x => x.DisposeAsync()).Returns(ValueTask.CompletedTask);
        var locker = new Mock<IInstanceLocker>(MockBehavior.Strict);
        locker.Setup(x => x.InitLock(OwnerId, It.IsAny<Guid>())).Returns(lease.Object);
        OverrideServicesForThisTest = services =>
        {
            services.Remove(services.Single(x => x.ImplementationType == typeof(NotifySigneeCommand)));
            services.AddScoped<IWorkflowEngineCommand>(_ => new CustomerCommand(
                "success",
                probe,
                NotifySigneeCommand.Key
            ));
            services.AddSingleton(locker.Object);
        };
        Guid instanceGuid = Guid.NewGuid();
        using var client = GetRootedClient(Org, App);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            Services.GetRequiredService<IWorkflowCallbackTokenGenerator>().GenerateToken(instanceGuid)
        );
        var payload = CreatePayload(instanceGuid, "{}", NotifySigneeCommand.Key);

        using var response = await client.PostAsJsonAsync(
            $"{Org}/{App}/instances/{OwnerId}/{instanceGuid}/workflow-engine-callbacks/{NotifySigneeCommand.Key}",
            payload
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<AppCallbackResponse>();
        Assert.Equal(payload.State, body!.State);
        Assert.Equal(TimeSpan.FromSeconds(1), body.Defer!.Delay);
        Assert.Equal(0, probe.ExecutionCount);
        locker.Verify(x => x.UseExternalLockToken(It.IsAny<string>()), Times.Never);
        lease.Verify(x => x.DisposeAsync(), Times.Once);
    }

    private AppCallbackPayload CreatePayload(Guid instanceGuid, string input, string key = CommandKey)
    {
        var instance = new Instance
        {
            Id = $"{OwnerId}/{instanceGuid}",
            AppId = $"{Org}/{App}",
            Org = Org,
            InstanceOwner = new InstanceOwner { PartyId = OwnerId.ToString() },
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { ElementId = "Task_Current", AltinnTaskType = "data" },
            },
            Data = [],
        };
        return new AppCallbackPayload
        {
            CommandKey = key,
            Actor = new Actor { Language = "nb" },
            LockToken = "lock-token",
            WorkflowId = Guid.NewGuid(),
            StepId = Guid.NewGuid(),
            ExecutionReferenceTime = DateTimeOffset.UnixEpoch,
            Payload = input,
            State = Services
                .GetRequiredService<WorkflowStateSigner>()
                .Sign(
                    JsonSerializer.Serialize(new WorkflowCallbackState { Instance = instance, FormData = [] }),
                    SigningDomain.CallbackState
                ),
        };
    }

    private sealed class Probe
    {
        internal int ExecutionCount { get; set; }
        internal ProcessEngineCommandContext Context { get; set; }
        internal Action? WhenExecuting { get; init; }
    }

    private sealed class CustomerCommand(string outcome, Probe probe, string key = CommandKey) : IWorkflowEngineCommand
    {
        public string GetKey() => key;

        public Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context)
        {
            probe.ExecutionCount++;
            probe.Context = context;
            probe.WhenExecuting?.Invoke();
            return outcome switch
            {
                "success" => Task.FromResult(ProcessEngineCommandResult.Completed()),
                "retry" => Task.FromResult(ProcessEngineCommandResult.FailedRetryable("Try again", "CustomerRetry")),
                "permanent" => Task.FromResult(
                    ProcessEngineCommandResult.FailedPermanent("Fix input", "CustomerPermanent")
                ),
                "exception" => throw new InvalidOperationException("Dependency failed"),
                // Cancellation that the callback did not request is a dependency failure and must remain retryable.
                "cancellation" => throw new OperationCanceledException("Dependency canceled"),
                "requested-cancellation" => throw new OperationCanceledException(context.CancellationToken),
                "null" => Task.FromResult<ProcessEngineCommandResult>(null!),
                _ => throw new ArgumentException("Unknown test outcome"),
            };
        }
    }
}
