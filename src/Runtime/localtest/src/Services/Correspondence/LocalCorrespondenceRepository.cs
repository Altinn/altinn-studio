using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Correspondence.Controllers;
using LocalTest.Configuration;
using LocalTest.Services.Storage.Implementation;
using Microsoft.Extensions.Options;

namespace LocalTest.Services.Correspondence;

/// <summary>
/// Stores the correspondences the local Correspondence API has created, one JSON file per correspondence
/// under <see cref="LocalPlatformSettings.CorrespondenceDataFolder"/>, so a developer can inspect exactly
/// what an app sent. Attachments are stored in its <c>attachments</c> subfolder.
/// </summary>
public sealed class LocalCorrespondenceRepository : IDisposable
{
    private static readonly JsonSerializerOptions _options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
        WriteIndented = true,
    };

    private readonly LocalPlatformSettings _settings;
    private readonly AsyncLock _mutationLock = new();

    public LocalCorrespondenceRepository(IOptions<LocalPlatformSettings> settings)
    {
        _settings = settings.Value;
    }

    private DirectoryInfo Storage()
    {
        var dir = new DirectoryInfo(
            Path.Join(_settings.LocalTestingStorageBasePath, _settings.CorrespondenceDataFolder)
        );
        if (!dir.Exists)
        {
            dir.Create();
        }
        return dir;
    }

    /// <summary>
    /// Reads every stored correspondence, oldest first.
    /// </summary>
    public async Task<IReadOnlyList<StoredCorrespondence>> Read()
    {
        var result = new List<StoredCorrespondence>();
        foreach (var file in Storage().GetFiles("*.json"))
        {
            var correspondence = await ReadFile<StoredCorrespondence>(file.FullName);
            if (correspondence is not null)
            {
                result.Add(correspondence);
            }
        }

        return result.OrderBy(correspondence => correspondence.Created).ToArray();
    }

    /// <summary>
    /// Reads a single correspondence, or <c>null</c> when it does not exist.
    /// </summary>
    public async Task<StoredCorrespondence?> Find(Guid correspondenceId)
    {
        var fileName = FileName(Storage(), correspondenceId);
        return File.Exists(fileName) ? await ReadFile<StoredCorrespondence>(fileName) : null;
    }

    /// <summary>
    /// Creates one correspondence per recipient and persists them.
    /// Returns <c>null</c> when the request's idempotent key has already been used, which the
    /// Correspondence API answers with 409 Conflict.
    /// </summary>
    public async Task<IReadOnlyList<StoredCorrespondence>?> TryCreate(
        InitializeCorrespondencesRequestDto request,
        JsonElement rawRequest,
        CorrespondenceStatus status
    )
    {
        // The duplicate check and the write must not interleave, or two concurrent requests carrying the
        // same idempotent key would both find nothing stored and both create a correspondence.
        using var mutationLock = await _mutationLock.Lock();

        if (request.IdempotentKey is { } idempotentKey && await IdempotentKeyExists(idempotentKey))
        {
            return null;
        }

        var details = request.Correspondence;
        var created = DateTimeOffset.UtcNow;
        var directory = Storage();
        var correspondences = new List<StoredCorrespondence>();

        foreach (var recipient in request.Recipients ?? [])
        {
            var correspondence = new StoredCorrespondence
            {
                CorrespondenceId = Guid.NewGuid(),
                IdempotentKey = request.IdempotentKey,
                Recipient = recipient,
                ResourceId = details?.ResourceId ?? string.Empty,
                SendersReference = details?.SendersReference ?? string.Empty,
                MessageSender = details?.MessageSender,
                Status = status,
                Created = created,
                Request = rawRequest,
            };

            await Write(FileName(directory, correspondence.CorrespondenceId), correspondence);
            correspondences.Add(correspondence);
        }

        return correspondences;
    }

    /// <summary>
    /// Creates an attachment awaiting its data.
    /// </summary>
    public async Task<StoredAttachment> CreateAttachment(InitializeAttachmentRequestDto request)
    {
        var attachment = new StoredAttachment
        {
            AttachmentId = Guid.NewGuid(),
            Status = AttachmentStatus.Initialized,
            StatusChanged = DateTimeOffset.UtcNow,
            Request = request,
        };
        await Write(AttachmentFileName(attachment.AttachmentId), attachment);
        return attachment;
    }

    /// <summary>
    /// Reads a single attachment, or <c>null</c> when it does not exist.
    /// </summary>
    public async Task<StoredAttachment?> FindAttachment(Guid attachmentId)
    {
        var fileName = AttachmentFileName(attachmentId);
        return File.Exists(fileName) ? await ReadFile<StoredAttachment>(fileName) : null;
    }

    /// <summary>
    /// Stores an attachment's data and publishes it straight away: Localtest does no malware scan. Data can be
    /// uploaded once.
    /// </summary>
    public async Task<(AttachmentUploadOutcome Outcome, StoredAttachment? Attachment)> UploadAttachment(
        Guid attachmentId,
        byte[] data,
        string? contentType
    )
    {
        using var mutationLock = await _mutationLock.Lock();

        var attachment = await FindAttachment(attachmentId);
        if (attachment is null)
        {
            return (AttachmentUploadOutcome.NotFound, null);
        }
        if (attachment.Status != AttachmentStatus.Initialized)
        {
            return (AttachmentUploadOutcome.AlreadyUploaded, attachment);
        }

        await File.WriteAllBytesAsync(AttachmentDataFileName(attachmentId), data);
        attachment.Status = AttachmentStatus.Published;
        attachment.StatusChanged = DateTimeOffset.UtcNow;
        attachment.DataType = contentType;
        attachment.Size = data.LongLength;
        await Write(AttachmentFileName(attachmentId), attachment);
        return (AttachmentUploadOutcome.Uploaded, attachment);
    }

    public void Dispose() => _mutationLock.Dispose();

    /// <summary>
    /// Attachments live in a folder of their own, so reading the correspondences never picks them up.
    /// </summary>
    private DirectoryInfo AttachmentStorage() => Storage().CreateSubdirectory("attachments");

    private string AttachmentFileName(Guid attachmentId) =>
        Path.Join(AttachmentStorage().FullName, $"{attachmentId}.json");

    private string AttachmentDataFileName(Guid attachmentId) =>
        Path.Join(AttachmentStorage().FullName, $"{attachmentId}.bin");

    private async Task<bool> IdempotentKeyExists(Guid idempotentKey)
    {
        foreach (var file in Storage().GetFiles("*.json"))
        {
            var correspondence = await ReadFile<StoredCorrespondence>(file.FullName);
            if (correspondence?.IdempotentKey == idempotentKey)
            {
                return true;
            }
        }

        return false;
    }

    private static string FileName(DirectoryInfo directory, Guid correspondenceId) =>
        Path.Join(directory.FullName, $"{correspondenceId}.json");

    private static async Task<T?> ReadFile<T>(string fileName)
    {
        await using var stream = File.OpenRead(fileName);
        return await JsonSerializer.DeserializeAsync<T>(stream, _options);
    }

    private static async Task Write<T>(string fileName, T record)
    {
        // Publish a complete file so a concurrent read cannot observe a partially written record.
        var temporaryFile = fileName + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            await using (var stream = File.Create(temporaryFile))
            {
                await JsonSerializer.SerializeAsync(stream, record, _options);
            }
            File.Move(temporaryFile, fileName, overwrite: true);
        }
        finally
        {
            File.Delete(temporaryFile);
        }
    }
}

public enum AttachmentUploadOutcome
{
    Uploaded,
    NotFound,
    AlreadyUploaded,
}
