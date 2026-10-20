using System.Reflection;
using System.Runtime.CompilerServices;
using System.Security.Claims;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process;

public class ProcessEngineAuthorizerTests
{
    private readonly Mock<IAuthorizationService> _authServiceMock;
    private readonly Mock<IHttpContextAccessor> _httpContextAccessorMock;
    private readonly ProcessEngineAuthorizer _authorizer;
    private readonly ClaimsPrincipal _user;

    private const string WriteAction = "write";
    private const string ConfirmAction = "confirm";
    private const string SignAction = "sign";
    private const string PayAction = "pay";
    private const string CustomServiceTaskType = "customServiceTask";

    public ProcessEngineAuthorizerTests()
    {
        _authServiceMock = new Mock<IAuthorizationService>(MockBehavior.Strict);
        _httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        var loggerMock = new Mock<ILogger<ProcessEngineAuthorizer>>();

        _user = new ClaimsPrincipal(
            new ClaimsIdentity(
                new List<Claim> { new Claim("sub", "12345"), new Claim("name", "Test User") },
                "TestAuthentication"
            )
        );

        HttpContext httpContext = new DefaultHttpContext { };

        _httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContext);

        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        foreach (IPipelineServiceTask serviceTask in BuiltInServiceTasks())
        {
            services.AddSingleton(serviceTask);
        }
        services.AddSingleton<IServiceTask>(new FakeServiceTask(CustomServiceTaskType));
        AppImplementationFactory appImplementationFactory = services
            .BuildServiceProvider()
            .GetRequiredService<AppImplementationFactory>();

        _authorizer = new ProcessEngineAuthorizer(
            _authServiceMock.Object,
            _httpContextAccessorMock.Object,
            appImplementationFactory,
            loggerMock.Object
        );
    }

    [Fact]
    public async Task AuthorizeProcessNext_WithNullCurrentTask_ReturnsFalse()
    {
        // Arrange
        Instance instance = CreateInstance(null);

        // Act
        bool result = await _authorizer.AuthorizeProcessNext(instance);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task AuthorizeProcessNext_WithSpecificAction_CallsAuthorizationService()
    {
        // Arrange
        Instance instance = CreateInstance("task1", AltinnTaskTypes.Data);

        _authServiceMock
            .Setup(x =>
                x.AuthorizeAction(
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<ClaimsPrincipal>(),
                    WriteAction,
                    instance.Process.CurrentTask.ElementId
                )
            )
            .ReturnsAsync(true)
            .Verifiable();

        // Act
        bool result = await _authorizer.AuthorizeProcessNext(instance, WriteAction);

        // Assert
        Assert.True(result);
        _authServiceMock.Verify();
    }

    [Fact]
    public async Task AuthorizeProcessNext_WithNoAction_DataTask_ChecksWriteAction()
    {
        // Arrange
        Instance instance = CreateInstance("task1", AltinnTaskTypes.Data);

        _authServiceMock
            .Setup(x =>
                x.AuthorizeAction(
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<ClaimsPrincipal>(),
                    WriteAction,
                    instance.Process.CurrentTask.ElementId
                )
            )
            .ReturnsAsync(true)
            .Verifiable();

        // Act
        bool result = await _authorizer.AuthorizeProcessNext(instance);

        // Assert
        Assert.True(result);
        _authServiceMock.Verify();
    }

    [Fact]
    public async Task AuthorizeProcessNext_WithNoAction_PaymentTask_ChecksBothPayAndWriteActions()
    {
        // Arrange
        Instance instance = CreateInstance("task1", "payment");

        _authServiceMock
            .Setup(x =>
                x.AuthorizeAction(
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<ClaimsPrincipal>(),
                    PayAction,
                    instance.Process.CurrentTask.ElementId
                )
            )
            .ReturnsAsync(false)
            .Verifiable();

        _authServiceMock
            .Setup(x =>
                x.AuthorizeAction(
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<ClaimsPrincipal>(),
                    WriteAction,
                    instance.Process.CurrentTask.ElementId
                )
            )
            .ReturnsAsync(true)
            .Verifiable();

        // Act
        bool result = await _authorizer.AuthorizeProcessNext(instance);

        // Assert
        Assert.True(result);
        _authServiceMock.Verify();
    }

    [Fact]
    public async Task AuthorizeProcessNext_WithNoAction_ConfirmationTask_ChecksConfirmAction()
    {
        // Arrange
        Instance instance = CreateInstance("task1", AltinnTaskTypes.Confirmation);

        _authServiceMock
            .Setup(x =>
                x.AuthorizeAction(
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<ClaimsPrincipal>(),
                    ConfirmAction,
                    instance.Process.CurrentTask.ElementId
                )
            )
            .ReturnsAsync(true)
            .Verifiable();

        // Act
        bool result = await _authorizer.AuthorizeProcessNext(instance);

        // Assert
        Assert.True(result);
        _authServiceMock.Verify();
    }

    [Fact]
    public async Task AuthorizeProcessNext_WithNoAction_SigningTask_ChecksSignAndWriteActions()
    {
        // Arrange
        Instance instance = CreateInstance("task1", "signing");

        _authServiceMock
            .Setup(x =>
                x.AuthorizeAction(
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<ClaimsPrincipal>(),
                    SignAction,
                    instance.Process.CurrentTask.ElementId
                )
            )
            .ReturnsAsync(false)
            .Verifiable();

        _authServiceMock
            .Setup(x =>
                x.AuthorizeAction(
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<ClaimsPrincipal>(),
                    WriteAction,
                    instance.Process.CurrentTask.ElementId
                )
            )
            .ReturnsAsync(true)
            .Verifiable();

        // Act
        bool result = await _authorizer.AuthorizeProcessNext(instance);

        // Assert
        Assert.True(result);
        _authServiceMock.Verify();
    }

    [Fact]
    public async Task AuthorizeProcessNext_WithNoAuthorizedActions_ReturnsFalse()
    {
        // Arrange
        Instance instance = CreateInstance("task1", AltinnTaskTypes.Data);

        _authServiceMock
            .Setup(x =>
                x.AuthorizeAction(
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<ClaimsPrincipal>(),
                    WriteAction,
                    instance.Process.CurrentTask.ElementId
                )
            )
            .ReturnsAsync(false);

        // Act
        bool result = await _authorizer.AuthorizeProcessNext(instance);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task AuthorizeProcessNext_NoHttpContext_ThrowsAuthenticationContextException()
    {
        // Arrange
        Instance instance = CreateInstance("task1", AltinnTaskTypes.Data);
        _httpContextAccessorMock.Setup(x => x.HttpContext).Returns((HttpContext?)null);

        // Act & Assert
        await Assert.ThrowsAsync<ProcessException>(async () => await _authorizer.AuthorizeProcessNext(instance));
    }

    [Theory]
    [InlineData(AltinnTaskTypes.Data, new[] { "write" })]
    [InlineData(AltinnTaskTypes.Feedback, new[] { "write" })]
    [InlineData(AltinnTaskTypes.Payment, new[] { "pay", "write" })]
    [InlineData(AltinnTaskTypes.Confirmation, new[] { "confirm" })]
    [InlineData(AltinnTaskTypes.Signing, new[] { "sign", "write" })]
    [InlineData("customUserTask", new[] { "customUserTask" })]
    public async Task AuthorizeProcessNext_WithNoAction_UserTask_ChecksTheTaskTypeActions(
        string taskType,
        string[] expectedActions
    )
    {
        Assert.Equal(expectedActions, await ActionsCheckedWithoutAnAction(taskType));
    }

    [Theory]
    [MemberData(nameof(ServiceTaskTypes))]
    public async Task AuthorizeProcessNext_WithNoAction_ServiceTask_ChecksOnlyWrite(string taskType)
    {
        // The workflow engine runs a service task without user interaction, so the user only ever
        // retries or resumes it - built-in or registered by the app, the task's type is never the action.
        Assert.Equal([WriteAction], await ActionsCheckedWithoutAnAction(taskType));
    }

    public static TheoryData<string> ServiceTaskTypes
    {
        get
        {
            var data = new TheoryData<string>();
            foreach (IPipelineServiceTask serviceTask in BuiltInServiceTasks())
            {
                data.Add(serviceTask.Type);
            }

            data.Add(CustomServiceTaskType);
            return data;
        }
    }

    [Fact]
    public void BuiltInServiceTasks_Are_Discovered()
    {
        // Guards the reflection below: an empty list would make the service-task theory test only
        // the custom task.
        List<string> types = BuiltInServiceTasks().Select(t => t.Type).ToList();
        Assert.Contains(AltinnTaskTypes.Pdf, types);
        Assert.Contains(AltinnTaskTypes.EFormidling, types);
    }

    /// <summary>
    /// Every concrete service task in Altinn.App.Core, created without running its constructor: only
    /// <c>Type</c> is read.
    /// </summary>
    private static IEnumerable<IPipelineServiceTask> BuiltInServiceTasks() =>
        typeof(IPipelineServiceTask)
            .Assembly.GetTypes()
            .Where(t => t is { IsClass: true, IsAbstract: false } && typeof(IPipelineServiceTask).IsAssignableFrom(t))
            .Select(t => (IPipelineServiceTask)RuntimeHelpers.GetUninitializedObject(t));

    /// <summary>
    /// The actions a process next without an action asks about, in order, when none of them is granted.
    /// </summary>
    private async Task<List<string>> ActionsCheckedWithoutAnAction(string taskType)
    {
        Instance instance = CreateInstance("task1", taskType);
        List<string> checkedActions = [];
        _authServiceMock
            .Setup(x =>
                x.AuthorizeAction(
                    It.IsAny<AppIdentifier>(),
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<ClaimsPrincipal>(),
                    It.IsAny<string>(),
                    instance.Process.CurrentTask.ElementId
                )
            )
            .Callback(
                (
                    AppIdentifier _,
                    InstanceIdentifier _,
                    ClaimsPrincipal _,
                    string action,
                    string? _,
                    CancellationToken _
                ) => checkedActions.Add(action)
            )
            .ReturnsAsync(false);

        Assert.False(await _authorizer.AuthorizeProcessNext(instance));
        return checkedActions;
    }

    private sealed class FakeServiceTask(string type) : IServiceTask
    {
        public string Type => type;

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
            Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
    }

    private static Instance CreateInstance(string? taskId, string? taskType = null)
    {
        var instance = new Instance
        {
            Id = "1337/12df57b6-cecf-4e7d-9415-857d93a817b3",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            AppId = "org/app",
            Org = "org",
            Process = new ProcessState(),
        };

        if (taskId != null)
        {
            instance.Process.CurrentTask = new ProcessElementInfo
            {
                ElementId = taskId,
                AltinnTaskType = taskType ?? "unknown",
            };
        }

        return instance;
    }
}
