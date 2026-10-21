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
/// what an app sent. Attachments are stored in its <c>attachments</c> subfolder. The folder outlives Localtest
/// versions, so a file it cannot read, such as one an older Localtest wrote, is skipped rather than failing the
/// request that reads it.
/// </summary>
public sealed class LocalCorrespondenceRepository : IDisposable
{
    private static readonly JsonSerializerOptions _options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
        WriteIndented = true,
    };

    private readonly LocalPlatformSettings _settings;
    private readonly ILogger<LocalCorrespondenceRepository> _logger;
    private readonly AsyncLock _mutationLock = new();

    public LocalCorrespondenceRepository(
        IOptions<LocalPlatformSettings> settings,
        ILogger<LocalCorrespondenceRepository> logger
    )
    {
        _settings = settings.Value;
        _logger = logger;
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
            var correspondence = await TryReadFile<StoredCorrespondence>(file.FullName);
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
        return File.Exists(fileName) ? await TryReadFile<StoredCorrespondence>(fileName) : null;
    }

    /// <summary>
    /// Persists the correspondences one request created, one per recipient. Returns <c>false</c>, storing nothing,
    /// when the request's idempotent key has already been used, which the Correspondence API answers with 409.
    /// </summary>
    public async Task<bool> TryCreate(Guid? idempotentKey, IReadOnlyList<StoredCorrespondence> correspondences)
    {
        // The duplicate check and the write must not interleave, or two concurrent requests carrying the
        // same idempotent key would both find nothing stored and both create a correspondence.
        using var mutationLock = await _mutationLock.Lock();

        if (idempotentKey is { } key && await IdempotentKeyExists(key))
        {
            return false;
        }

        var directory = Storage();
        foreach (var correspondence in correspondences)
        {
            await Write(FileName(directory, correspondence.CorrespondenceId), correspondence);
        }

        return true;
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
            Created = DateTimeOffset.UtcNow,
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
        return File.Exists(fileName) ? await TryReadFile<StoredAttachment>(fileName) : null;
    }

    /// <summary>
    /// Stores an attachment's data and publishes it straight away: Localtest does no malware scan. Data can be
    /// uploaded once. The data is streamed to a temporary file outside the lock, so a large upload is never held in
    /// memory and does not block other requests, and the attachment is published only once all of it is written.
    /// </summary>
    public async Task<(AttachmentUploadOutcome Outcome, StoredAttachment? Attachment)> UploadAttachment(
        Guid attachmentId,
        Stream data,
        string? contentType,
        CancellationToken cancellationToken = default
    )
    {
        if (await FindAttachment(attachmentId) is not { } pending)
        {
            return (AttachmentUploadOutcome.NotFound, null);
        }
        if (pending.Status != AttachmentStatus.Initialized)
        {
            return (AttachmentUploadOutcome.AlreadyUploaded, pending);
        }

        var dataFileName = AttachmentDataFileName(attachmentId);
        var temporaryFile = $"{dataFileName}.{Guid.NewGuid():N}.tmp";
        try
        {
            long size;
            await using (var file = File.Create(temporaryFile))
            {
                await data.CopyToAsync(file, cancellationToken);
                size = file.Length;
            }

            using var mutationLock = await _mutationLock.Lock();

            // Another upload of the same attachment may have finished while this one was streaming.
            var attachment = await FindAttachment(attachmentId);
            if (attachment is null)
            {
                return (AttachmentUploadOutcome.NotFound, null);
            }
            if (attachment.Status != AttachmentStatus.Initialized)
            {
                return (AttachmentUploadOutcome.AlreadyUploaded, attachment);
            }

            File.Move(temporaryFile, dataFileName, overwrite: true);
            attachment.Status = AttachmentStatus.Published;
            attachment.StatusChanged = DateTimeOffset.UtcNow;
            attachment.DataType = contentType;
            attachment.Size = size;
            await Write(AttachmentFileName(attachmentId), attachment);
            return (AttachmentUploadOutcome.Uploaded, attachment);
        }
        finally
        {
            File.Delete(temporaryFile);
        }
    }

    /// <summary>
    /// Opens an attachment's uploaded data for reading, or returns <c>null</c> when there is none. The caller disposes
    /// the stream. The data is streamed rather than read whole, since an attachment can be as large as the real API
    /// takes.
    /// </summary>
    public Stream? OpenAttachmentData(Guid attachmentId)
    {
        try
        {
            return new FileStream(
                AttachmentDataFileName(attachmentId),
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read | FileShare.Delete,
                bufferSize: 4096,
                useAsync: true
            );
        }
        catch (FileNotFoundException)
        {
            return null;
        }
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

    /// <summary>
    /// Whether a stored correspondence carries the idempotent key. Only <see cref="TryCreate"/> decides under its lock,
    /// so a caller that checks first must still handle <see cref="TryCreate"/> refusing.
    /// </summary>
    public async Task<bool> IdempotentKeyExists(Guid idempotentKey)
    {
        foreach (var file in Storage().GetFiles("*.json"))
        {
            var correspondence = await TryReadFile<StoredCorrespondence>(file.FullName);
            if (correspondence?.IdempotentKey == idempotentKey)
            {
                return true;
            }
        }

        return false;
    }

    private static string FileName(DirectoryInfo directory, Guid correspondenceId) =>
        Path.Join(directory.FullName, $"{correspondenceId}.json");

    private async Task<T?> TryReadFile<T>(string fileName)
        where T : class
    {
        try
        {
            await using var stream = File.OpenRead(fileName);
            return await JsonSerializer.DeserializeAsync<T>(stream, _options);
        }
        catch (JsonException e)
        {
            _logger.LogWarning(
                e,
                "Skipping {FileName}, which this version of Localtest cannot read",
                fileName
            );
            return null;
        }
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
