using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces.Assistant;
using Altinn.Studio.Designer.Services.Models;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.AssistantWorkflowController;

public class AssistantWorkflowControllerTests
    : DesignerEndpointsTestsBase<AssistantWorkflowControllerTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string App = "test-app";
    private const string Developer = "testUser";
    private const string AcceptedAnswer = """{"accepted":true,"session_id":"session-1","suggestions":["Try again"]}""";

    private readonly Guid _threadId = Guid.NewGuid();
    private readonly Mock<IAssistantWorkflowService> _workflowServiceMock = new();

    private AltinnRepoEditingContext _receivedContext;
    private StartAssistantWorkflowRequest _receivedStartRequest;

    public AssistantWorkflowControllerTests(WebApplicationFactory<Program> factory)
        : base(factory)
    {
        _workflowServiceMock
            .Setup(s =>
                s.StartWorkflow(
                    It.IsAny<AltinnRepoEditingContext>(),
                    _threadId,
                    It.IsAny<StartAssistantWorkflowRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<AltinnRepoEditingContext, Guid, StartAssistantWorkflowRequest, CancellationToken>(
                (context, _, request, _) =>
                {
                    _receivedContext = context;
                    _receivedStartRequest = request;
                }
            )
            .ReturnsAsync(
                new AssistantWorkflowStartResult(
                    AssistantWorkflowStatus.Success,
                    JsonDocument.Parse(AcceptedAnswer).RootElement
                )
            );
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddSingleton(_workflowServiceMock.Object);
    }

    [Fact]
    public async Task StartWorkflow_SendsTheMessageAndReturnsTheAssistantsAnswerUnchanged()
    {
        using var form = CreateStartForm(("krav.pdf", "application/pdf", 4));

        using var response = await HttpClient.PostAsync(WorkflowUrl(), form);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        string body = await response.Content.ReadAsStringAsync();
        Assert.True(JsonNode.DeepEquals(JsonNode.Parse(AcceptedAnswer), JsonNode.Parse(body)), body);
        Assert.Equal(AltinnRepoEditingContext.FromOrgRepoDeveloper(Org, App, Developer), _receivedContext);
        Assert.Equal("Lag et skjema fra vedlegget", _receivedStartRequest.Goal);
        Assert.Equal("master", _receivedStartRequest.Branch);
        Assert.True(_receivedStartRequest.AllowAppChanges);
        var attachment = Assert.Single(_receivedStartRequest.Attachments);
        Assert.Equal("krav.pdf", attachment.FileName);
        Assert.Equal("application/pdf", attachment.ContentType);
        Assert.Equal(4, attachment.Length);
    }

    [Theory]
    [InlineData("malware.exe", 4)]
    [InlineData("noextension", 4)]
    [InlineData("document.pdf", 0)]
    [InlineData("document.pdf", 21 * 1024 * 1024)]
    public async Task StartWorkflow_ReturnsBadRequest_ForAnAttachmentThatIsNotAllowed(string fileName, int length)
    {
        using var form = CreateStartForm((fileName, "application/octet-stream", length));

        using var response = await HttpClient.PostAsync(WorkflowUrl(), form);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        _workflowServiceMock.VerifyNoOtherCalls();
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
        using var form = CreateStartForm((fileName, "application/octet-stream", 4));

        using var response = await HttpClient.PostAsync(WorkflowUrl(), form);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [InlineData(AssistantWorkflowStatus.Forbidden, HttpStatusCode.Forbidden)]
    [InlineData(AssistantWorkflowStatus.NotFound, HttpStatusCode.NotFound)]
    public async Task StartWorkflow_ReturnsTheStatusOfARefusedStart(
        AssistantWorkflowStatus status,
        HttpStatusCode expectedStatusCode
    )
    {
        _workflowServiceMock
            .Setup(s =>
                s.StartWorkflow(
                    It.IsAny<AltinnRepoEditingContext>(),
                    _threadId,
                    It.IsAny<StartAssistantWorkflowRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new AssistantWorkflowStartResult(status));
        using var form = CreateStartForm();

        using var response = await HttpClient.PostAsync(WorkflowUrl(), form);

        Assert.Equal(expectedStatusCode, response.StatusCode);
    }

    [Fact]
    public async Task CancelWorkflow_CancelsTheWorkflowInTheThread()
    {
        _workflowServiceMock
            .Setup(s =>
                s.CancelWorkflow(
                    AltinnRepoEditingContext.FromOrgRepoDeveloper(Org, App, Developer),
                    _threadId,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(AssistantWorkflowStatus.Success);

        using var response = await HttpClient.PostAsync(WorkflowUrl("/cancel"), content: null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task RespondToPermission_SendsTheAnswer()
    {
        _workflowServiceMock
            .Setup(s =>
                s.RespondToPermission(
                    AltinnRepoEditingContext.FromOrgRepoDeveloper(Org, App, Developer),
                    _threadId,
                    "request-1",
                    true,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(AssistantWorkflowStatus.Success);

        using var response = await HttpClient.PostAsync(
            WorkflowUrl("/permission"),
            JsonContent.Create(new { requestId = "request-1", granted = true })
        );

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    private string WorkflowUrl(string action = "") =>
        $"designer/api/{Org}/{App}/assistant/threads/{_threadId}/workflow{action}";

    private static MultipartFormDataContent CreateStartForm(
        params (string FileName, string ContentType, int Length)[] attachments
    )
    {
        var form = new MultipartFormDataContent
        {
            { new StringContent("Lag et skjema fra vedlegget"), "goal" },
            { new StringContent("master"), "branch" },
            { new StringContent("true"), "allowAppChanges" },
        };
        foreach ((string fileName, string contentType, int length) in attachments)
        {
            var file = new ByteArrayContent(new byte[length]);
            file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
            form.Add(file, "attachments", fileName);
        }

        return form;
    }
}
