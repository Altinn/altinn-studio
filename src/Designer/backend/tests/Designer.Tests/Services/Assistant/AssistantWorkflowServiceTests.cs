using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Evaluators;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.ApiKey;
using Altinn.Studio.Designer.Models.Assistant;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Implementation.Assistant;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Assistant;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Moq;
using Xunit;

namespace Designer.Tests.Services.Assistant;

public class AssistantWorkflowServiceTests
{
    private const string Developer = "testUser";
    private const string Org = "ttd";
    private const string App = "test-app";
    private const string StartCommand = "start";
    private const string CancelCommand = "cancel";
    private const string PermissionCommand = "permission";

    private static readonly DateTimeOffset s_now = new(2026, 11, 12, 10, 0, 0, TimeSpan.Zero);

    private readonly Guid _threadId = Guid.NewGuid();
    private readonly Mock<IChatService> _chatServiceMock = new();
    private readonly Mock<ICanUseAiAssistantEvaluator> _canUseAiAssistantEvaluatorMock = new();
    private readonly Mock<IAssistantWebSocketService> _webSocketServiceMock = new();
    private readonly Mock<IApiKeyService> _apiKeyServiceMock = new();
    private readonly Mock<IAssistantServiceClient> _assistantClientMock = new();
    private readonly List<string> _calls = [];

    private AssistantWorkflowStartRequest _sentStartRequest;

    public AssistantWorkflowServiceTests()
    {
        SetupCostOrg(Org, resolvedCostOrg: Org);
        SetupThreadOwnership(Org, App, Developer);
        _webSocketServiceMock
            .Setup(ws => ws.RegisterSessionAsync(It.IsAny<string>(), It.IsAny<string>()))
            .Callback(() => _calls.Add("register"))
            .Returns(Task.CompletedTask);
        _apiKeyServiceMock
            .Setup(a =>
                a.CreateAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<ApiKeyType>(),
                    It.IsAny<DateTimeOffset>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(("test-api-key", new ApiKey()));
        _assistantClientMock
            .Setup(c =>
                c.StartWorkflow(
                    It.IsAny<AssistantWorkflowStartRequest>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<AssistantWorkflowStartRequest, string, string, CancellationToken>(
                (request, _, _, _) =>
                {
                    _sentStartRequest = request;
                    _calls.Add("start");
                }
            )
            .Returns(Task.CompletedTask);
    }

    [Fact]
    public async Task StartWorkflow_SendsTheMessageAndItsAttachmentsToTheAssistant()
    {
        var request = CreateStartRequest(CreateFile("krav.pdf", [1, 2, 3, 4], "application/pdf"));

        var status = await CreateService().StartWorkflow(EditingContext(), _threadId, request, CancellationToken.None);

        Assert.Equal(AssistantWorkflowStatus.Success, status);
        Assert.NotNull(_sentStartRequest);
        Assert.Equal(_threadId.ToString(), _sentStartRequest.SessionId);
        Assert.Equal("Lag et skjema fra vedlegget", _sentStartRequest.Goal);
        Assert.Equal("master", _sentStartRequest.Branch);
        Assert.True(_sentStartRequest.AllowAppChanges);
        Assert.Equal(Org, _sentStartRequest.CostOrg);
        Assert.Equal($"http://test-repos/{Org}/{App}.git", _sentStartRequest.RepoUrl);
        AssistantWorkflowAttachment attachment = Assert.Single(_sentStartRequest.Attachments);
        Assert.Equal("krav.pdf", attachment.Name);
        Assert.Equal("application/pdf", attachment.MimeType);
        Assert.Equal(4, attachment.Size);
        Assert.Equal([1, 2, 3, 4], attachment.Content);
        _assistantClientMock.Verify(
            c =>
                c.StartWorkflow(
                    It.IsAny<AssistantWorkflowStartRequest>(),
                    Developer,
                    "test-api-key",
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task StartWorkflow_SendsTheResolvedCostOrg_ForADevelopersOwnRepository()
    {
        // In a developer's own repository, org is the username, which can contain a dot. The usage is recorded on
        // the organization that the evaluator resolves.
        const string OwnOrg = "test.user";
        SetupCostOrg(OwnOrg, resolvedCostOrg: "nfk");
        SetupThreadOwnership(OwnOrg, App, OwnOrg);
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(OwnOrg, App, OwnOrg);

        var status = await CreateService()
            .StartWorkflow(editingContext, _threadId, CreateStartRequest(), CancellationToken.None);

        Assert.Equal(AssistantWorkflowStatus.Success, status);
        Assert.Equal("nfk", _sentStartRequest.CostOrg);
        Assert.Equal($"http://test-repos/{OwnOrg}/{App}.git", _sentStartRequest.RepoUrl);
    }

    [Fact]
    public async Task StartWorkflow_GivesTheAssistantASystemKeyThatExpiresAfterTwentyMinutes()
    {
        await CreateService().StartWorkflow(EditingContext(), _threadId, CreateStartRequest(), CancellationToken.None);

        _apiKeyServiceMock.Verify(
            a =>
                a.CreateAsync(
                    Developer,
                    It.Is<string>(name => name.StartsWith("assistant-")),
                    ApiKeyType.System,
                    s_now.AddMinutes(20),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task StartWorkflow_RegistersTheSessionBeforeTheAssistantStarts()
    {
        await CreateService().StartWorkflow(EditingContext(), _threadId, CreateStartRequest(), CancellationToken.None);

        // The assistant service sends the events of the run only on a connection with a session frame.
        Assert.Equal(["register", "start"], _calls);
    }

    [Fact]
    public async Task CancelWorkflow_CancelsTheSessionAsTheDeveloper()
    {
        var status = await CreateService().CancelWorkflow(EditingContext(), _threadId, CancellationToken.None);

        Assert.Equal(AssistantWorkflowStatus.Success, status);
        _assistantClientMock.Verify(
            c => c.CancelWorkflow(Developer, _threadId.ToString(), It.IsAny<CancellationToken>()),
            Times.Once
        );
        // This replica must get the event of the cancellation.
        _webSocketServiceMock.Verify(ws => ws.RegisterSessionAsync(_threadId.ToString(), Developer), Times.Once);
    }

    [Fact]
    public async Task RespondToPermission_SendsTheAnswerAndRegistersTheSession()
    {
        var status = await CreateService()
            .RespondToPermission(EditingContext(), _threadId, "request-1", granted: true, CancellationToken.None);

        Assert.Equal(AssistantWorkflowStatus.Success, status);
        _assistantClientMock.Verify(
            c =>
                c.RespondToPermission(
                    Developer,
                    _threadId.ToString(),
                    "request-1",
                    true,
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        // The run continues after the answer, so this replica must get the events of the run.
        _webSocketServiceMock.Verify(ws => ws.RegisterSessionAsync(_threadId.ToString(), Developer), Times.Once);
    }

    [Theory]
    [InlineData(StartCommand)]
    [InlineData(CancelCommand)]
    [InlineData(PermissionCommand)]
    public async Task Command_ReturnsForbidden_WhenDeveloperHasNoAssistantAccess(string command)
    {
        SetupCostOrg(Org, resolvedCostOrg: null);

        var status = await RunCommand(command, EditingContext());

        Assert.Equal(AssistantWorkflowStatus.Forbidden, status);
        VerifyNothingSent();
    }

    [Theory]
    [InlineData(StartCommand)]
    [InlineData(CancelCommand)]
    [InlineData(PermissionCommand)]
    public async Task Command_ReturnsNotFound_WhenDeveloperDoesNotOwnTheThread(string command)
    {
        var status = await RunCommand(command, EditingContext(developer: "otherUser"));

        Assert.Equal(AssistantWorkflowStatus.NotFound, status);
        VerifyNothingSent();
    }

    private async Task<AssistantWorkflowStatus> RunCommand(string command, AltinnRepoEditingContext editingContext)
    {
        AssistantWorkflowService service = CreateService();
        return command switch
        {
            StartCommand => await service.StartWorkflow(
                editingContext,
                _threadId,
                CreateStartRequest(),
                CancellationToken.None
            ),
            CancelCommand => await service.CancelWorkflow(editingContext, _threadId, CancellationToken.None),
            PermissionCommand => await service.RespondToPermission(
                editingContext,
                _threadId,
                "request-1",
                granted: true,
                CancellationToken.None
            ),
            _ => throw new ArgumentOutOfRangeException(nameof(command), command, null),
        };
    }

    private void SetupCostOrg(string org, string resolvedCostOrg)
    {
        _canUseAiAssistantEvaluatorMock
            .Setup(e => e.ResolveCostOrg(org, It.IsAny<string>()))
            .ReturnsAsync(resolvedCostOrg);
    }

    private void SetupThreadOwnership(string org, string app, string developer)
    {
        _chatServiceMock
            .Setup(s =>
                s.ThreadBelongsToDeveloperAsync(
                    _threadId,
                    It.Is<AltinnRepoEditingContext>(c => c.Org == org && c.Repo == app && c.Developer == developer),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(true);
    }

    private void VerifyNothingSent()
    {
        _assistantClientMock.VerifyNoOtherCalls();
        _webSocketServiceMock.VerifyNoOtherCalls();
        _apiKeyServiceMock.VerifyNoOtherCalls();
    }

    private static AltinnRepoEditingContext EditingContext(string developer = Developer) =>
        AltinnRepoEditingContext.FromOrgRepoDeveloper(Org, App, developer);

    private static StartAssistantWorkflowRequest CreateStartRequest(params IFormFile[] attachments) =>
        new()
        {
            Goal = "Lag et skjema fra vedlegget",
            Branch = "master",
            AllowAppChanges = true,
            Attachments = [.. attachments],
        };

    private static FormFile CreateFile(string fileName, byte[] content, string contentType) =>
        new(new MemoryStream(content), 0, content.Length, "attachments", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType,
        };

    private AssistantWorkflowService CreateService() =>
        new(
            _chatServiceMock.Object,
            _canUseAiAssistantEvaluatorMock.Object,
            _webSocketServiceMock.Object,
            _apiKeyServiceMock.Object,
            _assistantClientMock.Object,
            Options.Create(new ServiceRepositorySettings { RepositoryBaseURL = "http://test-repos" }),
            new FakeTimeProvider(s_now),
            NullLogger<AssistantWorkflowService>.Instance
        );
}
