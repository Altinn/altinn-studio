using System.Text.Json;
using Altinn.Correspondence.Controllers;
using LocalTest.Configuration;
using LocalTest.Services.Correspondence;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Xunit;

namespace LocalTest.Tests.Correspondence;

public sealed class CorrespondenceTests : IDisposable
{
    private const string ResourceId = "ttd-signing-call-to-action";
    private const string OrganizationRecipient = "urn:altinn:organization:identifier-no:991825827";
    private const string PersonRecipient = "urn:altinn:person:identifier-no:01039012345";

    private readonly string _storagePath = Path.Join(
        Path.GetTempPath(),
        $"localtest-correspondence-{Guid.NewGuid():N}"
    );
    private readonly LocalCorrespondenceRepository _repository;
    private readonly CorrespondenceController _controller;

    public CorrespondenceTests()
    {
        _repository = new LocalCorrespondenceRepository(
            Options.Create(new LocalPlatformSettings { LocalTestingStorageBasePath = _storagePath })
        );
        _controller = new CorrespondenceController(_repository);
    }

    [Fact]
    public async Task Initialize_MultipleRecipients_CreatesOneCorrespondencePerRecipientAndEchoesRecipient()
    {
        var response = await Initialize(Request(OrganizationRecipient, PersonRecipient));

        Assert.Equal(
            new[] { OrganizationRecipient, PersonRecipient },
            response.Correspondences.Select(correspondence => correspondence.Recipient)
        );
        Assert.Empty(response.AttachmentIds);
        Assert.All(
            response.Correspondences,
            correspondence =>
            {
                Assert.NotEqual(Guid.Empty, correspondence.CorrespondenceId);
                Assert.Equal(CorrespondenceStatus.Initialized, correspondence.Status);
            }
        );
        Assert.Equal(
            response
                .Correspondences.Select(correspondence => correspondence.CorrespondenceId)
                .Order(),
            response
                .Correspondences.Select(correspondence => correspondence.CorrespondenceId)
                .Distinct()
                .Order()
        );
        Assert.Equal(2, Directory.GetFiles(Path.Join(_storagePath, "correspondence")).Length);
    }

    [Fact]
    public async Task Initialize_StoresIdempotentKeyAndTheRequestTheAppSent()
    {
        var idempotentKey = Guid.NewGuid();

        var response = await Initialize(
            Request(OrganizationRecipient, idempotentKey: idempotentKey)
        );

        var correspondenceId = Assert.Single(response.Correspondences).CorrespondenceId;
        var stored = await _repository.Find(correspondenceId);
        Assert.NotNull(stored);
        Assert.Equal(idempotentKey, stored.IdempotentKey);
        Assert.Equal(OrganizationRecipient, stored.Recipient);
        Assert.Equal(ResourceId, stored.ResourceId);
        Assert.Equal("senders-reference", stored.SendersReference);
        Assert.Equal(CorrespondenceStatus.Initialized, stored.Status);
        Assert.Equal(
            "Task_1 is ready for signing",
            stored
                .Request.GetProperty("correspondence")
                .GetProperty("content")
                .GetProperty("messageTitle")
                .GetString()
        );
    }

    [Fact]
    public async Task Initialize_RepeatedIdempotentKey_ReturnsConflict()
    {
        var idempotentKey = Guid.NewGuid();
        await Initialize(Request(OrganizationRecipient, idempotentKey: idempotentKey));

        var problem = await InitializeProblem(
            Request(PersonRecipient, idempotentKey: idempotentKey)
        );

        Assert.Equal(StatusCodes.Status409Conflict, problem.Status);
        Assert.Equal("A correspondence with the same idempotent key already exists", problem.Title);
        Assert.Single(await _repository.Read());
    }

    [Fact]
    public async Task Initialize_ConcurrentRequestsWithSameIdempotentKey_CreatesExactlyOne()
    {
        var idempotentKey = Guid.NewGuid();

        var results = await Task.WhenAll(
            Enumerable
                .Range(0, 4)
                .Select(_ =>
                    _controller.InitializeCorrespondences(
                        Request(OrganizationRecipient, idempotentKey: idempotentKey)
                    )
                )
        );

        Assert.Single(results.OfType<OkObjectResult>());
        Assert.Single(await _repository.Read());
    }

    [Fact]
    public async Task Initialize_IdempotentKeyWithMultipleRecipients_ReturnsBadRequest()
    {
        var problem = await InitializeProblem(
            Request(OrganizationRecipient, PersonRecipient, idempotentKey: Guid.NewGuid())
        );

        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Contains("multiple recipients", problem.Detail);
        Assert.Empty(await _repository.Read());
    }

    [Fact]
    public async Task Initialize_NoRecipients_ReturnsBadRequest()
    {
        var problem = await InitializeProblem(Request());

        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Empty(await _repository.Read());
    }

    [Fact]
    public async Task Initialize_EmptyRecipient_ReturnsBadRequest()
    {
        var request = JsonDocument
            .Parse("""{"recipients": ["urn:altinn:organization:identifier-no:991825827", null, " "]}""")
            .RootElement;

        var problem = await InitializeProblem(request);

        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Empty(await _repository.Read());
    }

    [Fact]
    public async Task Details_ReturnsTheStoredCorrespondence()
    {
        var response = await Initialize(
            Request(OrganizationRecipient, idempotentKey: Guid.NewGuid())
        );
        var created = Assert.Single(response.Correspondences);

        var result = await _controller.GetCorrespondenceDetails(created.CorrespondenceId);
        var details = Assert.IsType<CorrespondenceDetailsResponseDto>(
            Assert.IsType<OkObjectResult>(result).Value
        );

        Assert.Equal(created.CorrespondenceId, details.CorrespondenceId);
        Assert.Equal(OrganizationRecipient, details.Recipient);
        Assert.Equal(ResourceId, details.ResourceId);
        Assert.Equal("senders-reference", details.SendersReference);
        Assert.Equal(CorrespondenceStatus.Initialized, details.Status);
        Assert.Equal(CorrespondenceStatus.Initialized, Assert.Single(details.StatusHistory).Status);
        Assert.Equal("Task_1 is ready for signing", details.Content?.MessageTitle);
        Assert.Equal("nb", details.Content?.Language);
        Assert.Null(details.Published);
    }

    [Fact]
    public async Task Details_UnknownCorrespondence_ReturnsNotFound()
    {
        var result = await _controller.GetCorrespondenceDetails(Guid.NewGuid());

        var problem = Assert.IsType<ProblemDetails>(Assert.IsType<ObjectResult>(result).Value);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
    }

    [Fact]
    public async Task Attachment_InitializeUploadAndRead_IsPublishedWithTheUploadedData()
    {
        byte[] data = "%PDF-1.7 signed document"u8.ToArray();

        Guid attachmentId = await InitializeAttachment();
        var uploaded = await UploadAttachment(attachmentId, data);
        var read = Assert.IsType<AttachmentOverviewDto>(
            Assert.IsType<OkObjectResult>(await _controller.GetAttachmentOverview(attachmentId)).Value
        );

        Assert.Equal(AttachmentStatus.Published, uploaded.Status);
        Assert.Equal(AttachmentStatus.Published, read.Status);
        Assert.Equal("application/pdf", read.DataType);
        Assert.Equal("signed.pdf", read.FileName);
        Assert.Equal(
            data,
            await File.ReadAllBytesAsync(
                Path.Join(_storagePath, "correspondence", "attachments", $"{attachmentId}.bin")
            )
        );
    }

    [Fact]
    public async Task Attachment_UploadedTwice_ReturnsBadRequest()
    {
        Guid attachmentId = await InitializeAttachment();
        await UploadAttachment(attachmentId, [1]);

        var result = await Upload(attachmentId, [2]);

        Assert.Equal(StatusCodes.Status400BadRequest, Assert.IsType<ObjectResult>(result).StatusCode);
    }

    [Fact]
    public async Task Attachment_Unknown_ReturnsNotFound()
    {
        var upload = await Upload(Guid.NewGuid(), [1]);
        var read = await _controller.GetAttachmentOverview(Guid.NewGuid());

        Assert.Equal(StatusCodes.Status404NotFound, Assert.IsType<ObjectResult>(upload).StatusCode);
        Assert.Equal(StatusCodes.Status404NotFound, Assert.IsType<ObjectResult>(read).StatusCode);
    }

    [Fact]
    public async Task Initialize_WithUploadedAttachment_LinksIt()
    {
        Guid attachmentId = await InitializeAttachment();
        await UploadAttachment(attachmentId, [1]);

        var response = await Initialize(Request([OrganizationRecipient], null, [attachmentId]));

        Assert.Equal([attachmentId], response.AttachmentIds);
    }

    [Fact]
    public async Task Initialize_WithAttachmentNotUploaded_ReturnsBadRequest()
    {
        Guid attachmentId = await InitializeAttachment();

        var problem = await InitializeProblem(Request([OrganizationRecipient], null, [attachmentId]));

        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Empty(await _repository.Read());
    }

    private async Task<Guid> InitializeAttachment()
    {
        var result = await _controller.InitializeAttachment(
            new InitializeAttachmentRequestDto
            {
                ResourceId = ResourceId,
                FileName = "signed.pdf",
                DisplayName = "Signed document",
                SendersReference = "senders-reference",
            }
        );
        return Assert.IsType<Guid>(Assert.IsType<OkObjectResult>(result).Value);
    }

    private async Task<AttachmentOverviewDto> UploadAttachment(Guid attachmentId, byte[] data) =>
        Assert.IsType<AttachmentOverviewDto>(Assert.IsType<OkObjectResult>(await Upload(attachmentId, data)).Value);

    private async Task<ActionResult> Upload(Guid attachmentId, byte[] data)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Body = new MemoryStream(data);
        httpContext.Request.ContentType = "application/pdf";
        _controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        return await _controller.UploadAttachment(attachmentId);
    }

    private async Task<InitializeCorrespondencesResponseDto> Initialize(JsonElement request)
    {
        var result = await _controller.InitializeCorrespondences(request);
        return Assert.IsType<InitializeCorrespondencesResponseDto>(
            Assert.IsType<OkObjectResult>(result).Value
        );
    }

    private async Task<ProblemDetails> InitializeProblem(JsonElement request)
    {
        var result = await _controller.InitializeCorrespondences(request);
        return Assert.IsType<ProblemDetails>(Assert.IsType<ObjectResult>(result).Value);
    }

    private static JsonElement Request(params string[] recipients) => Request(recipients, null);

    private static JsonElement Request(string recipient, Guid idempotentKey) =>
        Request([recipient], idempotentKey);

    private static JsonElement Request(string first, string second, Guid idempotentKey) =>
        Request([first, second], idempotentKey);

    private static JsonElement Request(
        IReadOnlyList<string> recipients,
        Guid? idempotentKey,
        IReadOnlyList<Guid>? attachments = null
    )
    {
        var body = new Dictionary<string, object?>
        {
            ["correspondence"] = new Dictionary<string, object?>
            {
                ["resourceId"] = ResourceId,
                ["sendersReference"] = "senders-reference",
                ["messageSender"] = "Testdepartementet",
                ["content"] = new Dictionary<string, object?>
                {
                    ["language"] = "nb",
                    ["messageTitle"] = "Task_1 is ready for signing",
                    ["messageSummary"] = "You have a document to sign",
                    ["messageBody"] = "Please sign the document.",
                },
                ["isConfirmationNeeded"] = false,
                ["isConfidential"] = false,
            },
            ["recipients"] = recipients,
            ["existingAttachments"] = attachments ?? [],
        };

        if (idempotentKey is not null)
        {
            body["idempotentKey"] = idempotentKey;
        }

        return JsonDocument.Parse(JsonSerializer.Serialize(body)).RootElement;
    }

    public void Dispose()
    {
        _repository.Dispose();
        if (Directory.Exists(_storagePath))
        {
            Directory.Delete(_storagePath, recursive: true);
        }
    }
}
