using System.Text.Json;
using Altinn.Correspondence.Controllers;
using LocalTest.Configuration;
using LocalTest.Services.Correspondence;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Xunit;

namespace LocalTest.Tests;

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
    public void Attachments_AreNotImplemented()
    {
        var attachmentId = Guid.NewGuid();

        foreach (
            var result in new[]
            {
                _controller.InitializeAttachment(),
                _controller.UploadAttachment(attachmentId),
                _controller.GetAttachmentOverview(attachmentId),
            }
        )
        {
            var problem = Assert.IsType<ProblemDetails>(Assert.IsType<ObjectResult>(result).Value);
            Assert.Equal(StatusCodes.Status501NotImplemented, problem.Status);
            Assert.Equal("Attachments are not supported", problem.Title);
        }
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

    private static JsonElement Request(IReadOnlyList<string> recipients, Guid? idempotentKey)
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
            ["existingAttachments"] = Array.Empty<Guid>(),
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
