using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Evaluators;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.ApiKey;
using Altinn.Studio.Designer.Models.Assistant;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Assistant;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.AssistantWorkflowController;

public class AssistantWorkflowControllerTests
{
    private const string Developer = "testUser";
    private const string Org = "ttd";
    private const string App = "test-app";

    private readonly Guid _threadId = Guid.NewGuid();
    private readonly Mock<IChatService> _chatServiceMock = new();
    private readonly Mock<ICanUseAiAssistantEvaluator> _canUseAiAssistantEvaluatorMock = new();
    private readonly Mock<IAssistantWebSocketService> _webSocketServiceMock = new();
    private readonly Mock<IApiKeyService> _apiKeyServiceMock = new();
    private readonly Mock<IAssistantServiceClient> _assistantClientMock = new();

    private AssistantWorkflowStartRequest _sentStartRequest;

    public AssistantWorkflowControllerTests()
    {
        SetupCostOrg(Org, resolvedCostOrg: Org);
        SetupThreadOwnership(Org, App, Developer);
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
                (request, _, _, _) => _sentStartRequest = request
            )
            .ReturnsAsync(JsonSerializer.SerializeToElement(new { accepted = true }));
    }

    [Fact]
    public async Task StartWorkflow_SendsTheMessageAndItsAttachmentsToTheAssistant()
    {
        var controller = CreateController();
        var request = CreateStartRequest(CreateFile("krav.pdf", [1, 2, 3, 4], "application/pdf"));

        var result = await controller.StartWorkflow(Org, App, _threadId, request, CancellationToken.None);

        var content = Assert.IsType<ContentResult>(result);
        Assert.Equal("application/json", content.ContentType);
        Assert.True(JsonDocument.Parse(content.Content!).RootElement.GetProperty("accepted").GetBoolean());
        Assert.NotNull(_sentStartRequest);
        Assert.Equal(_threadId.ToString(), _sentStartRequest.SessionId);
        Assert.Equal("Lag et skjema fra vedlegget", _sentStartRequest.Goal);
        Assert.Equal("master", _sentStartRequest.Branch);
        Assert.True(_sentStartRequest.AllowAppChanges);
        Assert.Equal(Org, _sentStartRequest.CostOrg);
        Assert.Equal($"http://test-repos/{Org}/{App}.git", _sentStartRequest.RepoUrl);
        AssistantWorkflowAttachment attachment = Assert.Single(_sentStartRequest.Attachments);
        Assert.Equal(
            new AssistantWorkflowAttachment("krav.pdf", "application/pdf", 4, "data:application/pdf;base64,AQIDBA=="),
            attachment
        );
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
    public async Task StartWorkflow_RegistersTheSessionBeforeTheAssistantStarts()
    {
        var callOrder = new List<string>();
        _webSocketServiceMock
            .Setup(ws => ws.RegisterSessionAsync(_threadId.ToString(), Developer))
            .Callback(() => callOrder.Add("register"))
            .Returns(Task.CompletedTask);
        _assistantClientMock
            .Setup(c =>
                c.StartWorkflow(
                    It.IsAny<AssistantWorkflowStartRequest>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback(() => callOrder.Add("start"))
            .ReturnsAsync(JsonSerializer.SerializeToElement(new { accepted = true }));
        var controller = CreateController();

        await controller.StartWorkflow(Org, App, _threadId, CreateStartRequest(), CancellationToken.None);

        // The assistant service sends the events of the run only on a connection with a session frame.
        Assert.Equal(["register", "start"], callOrder);
    }

    [Theory]
    [InlineData(Developer)]
    // In a developer's own repository, org is the username, which can contain a dot.
    [InlineData("test.user")]
    public async Task StartWorkflow_RecordsUsageOnTheResolvedCostOrg_InTheDevelopersOwnRepository(string developer)
    {
        SetupThreadOwnership(developer, App, developer);
        SetupCostOrg(developer, resolvedCostOrg: "nfk");
        var controller = CreateController(developer);

        await controller.StartWorkflow(developer, App, _threadId, CreateStartRequest(), CancellationToken.None);

        Assert.NotNull(_sentStartRequest);
        Assert.Equal("nfk", _sentStartRequest.CostOrg);
        Assert.Equal($"http://test-repos/{developer}/{App}.git", _sentStartRequest.RepoUrl);
    }

    [Fact]
    public async Task StartWorkflow_ReturnsForbidden_WhenDeveloperHasNoAssistantAccess()
    {
        SetupCostOrg(Org, resolvedCostOrg: null);
        var controller = CreateController();

        var result = await controller.StartWorkflow(Org, App, _threadId, CreateStartRequest(), CancellationToken.None);

        var statusResult = Assert.IsType<StatusCodeResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
        VerifyAssistantNotStarted();
    }

    [Fact]
    public async Task StartWorkflow_ReturnsNotFound_WhenDeveloperDoesNotOwnTheThreadInThisApp()
    {
        SetupCostOrg("other-org", resolvedCostOrg: "other-org");
        var controller = CreateController();

        var result = await controller.StartWorkflow(
            "other-org",
            "other-app",
            _threadId,
            CreateStartRequest(),
            CancellationToken.None
        );

        Assert.IsType<NotFoundResult>(result);
        VerifyAssistantNotStarted();
    }

    [Theory]
    [InlineData("malware.exe", 4)]
    [InlineData("noextension", 4)]
    [InlineData("document.pdf", 0)]
    [InlineData("document.pdf", 21L * 1024 * 1024)]
    public async Task StartWorkflow_ReturnsBadRequest_ForAnAttachmentThatIsNotAllowed(string fileName, long length)
    {
        var controller = CreateController();
        var file = new FormFile(new MemoryStream([1, 2, 3, 4]), 0, length, "attachments", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = "application/octet-stream",
        };

        var result = await controller.StartWorkflow(
            Org,
            App,
            _threadId,
            CreateStartRequest(file),
            CancellationToken.None
        );

        Assert.IsType<BadRequestObjectResult>(result);
        VerifyAssistantNotStarted();
    }

    [Theory]
    [InlineData("document.pdf")]
    [InlineData("notes.md")]
    [InlineData("readme.txt")]
    [InlineData("picture.png")]
    [InlineData("picture.jpg")]
    [InlineData("picture.jpeg")]
    [InlineData("picture.gif")]
    [InlineData("picture.webp")]
    [InlineData("UPPERCASE.PDF")]
    public async Task StartWorkflow_AcceptsAnAllowedFileType(string fileName)
    {
        var controller = CreateController();

        var result = await controller.StartWorkflow(
            Org,
            App,
            _threadId,
            CreateStartRequest(CreateFile(fileName, [1, 2, 3, 4], "application/octet-stream")),
            CancellationToken.None
        );

        Assert.IsType<ContentResult>(result);
    }

    [Fact]
    public async Task CancelWorkflow_CancelsTheSessionAsTheDeveloper()
    {
        var controller = CreateController();

        var result = await controller.CancelWorkflow(Org, App, _threadId, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        _assistantClientMock.Verify(
            c => c.CancelWorkflow(Developer, _threadId.ToString(), It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task CancelWorkflow_ReturnsNotFound_WhenDeveloperDoesNotOwnTheThread()
    {
        var controller = CreateController("otherUser");

        var result = await controller.CancelWorkflow(Org, App, _threadId, CancellationToken.None);

        Assert.IsType<NotFoundResult>(result);
        _assistantClientMock.Verify(
            c => c.CancelWorkflow(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Fact]
    public async Task RespondToPermission_DeliversTheAnswerAndKeepsTheEventsFlowing()
    {
        var controller = CreateController();

        var result = await controller.RespondToPermission(
            Org,
            App,
            _threadId,
            new AssistantPermissionResponseRequest("request-1", Granted: true),
            CancellationToken.None
        );

        Assert.IsType<NoContentResult>(result);
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
        // The run continues after the answer, so this replica must receive its events.
        _webSocketServiceMock.Verify(ws => ws.RegisterSessionAsync(_threadId.ToString(), Developer), Times.Once);
    }

    [Fact]
    public async Task RespondToPermission_ReturnsNotFound_WhenDeveloperDoesNotOwnTheThread()
    {
        var controller = CreateController("otherUser");

        var result = await controller.RespondToPermission(
            Org,
            App,
            _threadId,
            new AssistantPermissionResponseRequest("request-1", Granted: true),
            CancellationToken.None
        );

        Assert.IsType<NotFoundResult>(result);
        _assistantClientMock.Verify(
            c =>
                c.RespondToPermission(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<bool>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
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

    private void VerifyAssistantNotStarted()
    {
        _assistantClientMock.Verify(
            c =>
                c.StartWorkflow(
                    It.IsAny<AssistantWorkflowStartRequest>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
        _apiKeyServiceMock.Verify(
            a =>
                a.CreateAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<ApiKeyType>(),
                    It.IsAny<DateTimeOffset>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

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

    private Altinn.Studio.Designer.Controllers.AssistantWorkflowController CreateController(
        string developer = Developer
    )
    {
        var identity = new ClaimsIdentity([new Claim(ClaimTypes.Name, developer)], "TestUserLogin");
        return new Altinn.Studio.Designer.Controllers.AssistantWorkflowController(
            _chatServiceMock.Object,
            _canUseAiAssistantEvaluatorMock.Object,
            _webSocketServiceMock.Object,
            _apiKeyServiceMock.Object,
            _assistantClientMock.Object,
            Options.Create(new ServiceRepositorySettings { RepositoryBaseURL = "http://test-repos" }),
            NullLogger<Altinn.Studio.Designer.Controllers.AssistantWorkflowController>.Instance
        )
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) },
            },
        };
    }
}
