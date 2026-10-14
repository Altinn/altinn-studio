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
/// what an app sent.
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
            var correspondence = await ReadFile(file.FullName);
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
        return File.Exists(fileName) ? await ReadFile(fileName) : null;
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

    public void Dispose() => _mutationLock.Dispose();

    private async Task<bool> IdempotentKeyExists(Guid idempotentKey)
    {
        foreach (var file in Storage().GetFiles("*.json"))
        {
            var correspondence = await ReadFile(file.FullName);
            if (correspondence?.IdempotentKey == idempotentKey)
            {
                return true;
            }
        }

        return false;
    }

    private static string FileName(DirectoryInfo directory, Guid correspondenceId) =>
        Path.Join(directory.FullName, $"{correspondenceId}.json");

    private static async Task<StoredCorrespondence?> ReadFile(string fileName)
    {
        await using var stream = File.OpenRead(fileName);
        return await JsonSerializer.DeserializeAsync<StoredCorrespondence>(stream, _options);
    }

    private static async Task Write(string fileName, StoredCorrespondence correspondence)
    {
        // Publish a complete file so a concurrent read cannot observe a partially written correspondence.
        var temporaryFile = fileName + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            await using (var stream = File.Create(temporaryFile))
            {
                await JsonSerializer.SerializeAsync(stream, correspondence, _options);
            }
            File.Move(temporaryFile, fileName, overwrite: true);
        }
        finally
        {
            File.Delete(temporaryFile);
        }
    }
}
