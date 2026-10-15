#nullable disable

using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.AccessManagement.Controllers;
using LocalTest.Configuration;
using LocalTest.Services.Storage.Implementation;
using Microsoft.Extensions.Options;

namespace LocalTest.Services.AccessManagement;

public sealed class LocalInstanceDelegationsRepository : IDisposable
{
    private static readonly JsonSerializerOptions _options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };
    private readonly LocalPlatformSettings _settings;
    private readonly AsyncLock _mutationLock = new();

    public LocalInstanceDelegationsRepository(IOptions<LocalPlatformSettings> settings)
    {
        _settings = settings.Value;
    }

    private DirectoryInfo Storage()
    {
        var dir = new DirectoryInfo(Path.Join(_settings.LocalTestingStorageBasePath, _settings.InstanceDelegationsDataFolder));
        if (!dir.Exists)
        {
            dir.Create();
        }
        return dir;
    }

    public async Task<IReadOnlyList<AppsInstanceDelegationResponseDto>> Read(Guid? instanceId = null)
    {
        var directory = Storage();
        var files = directory.GetFiles("*.json");

        var result = new List<AppsInstanceDelegationResponseDto>();

        foreach (var file in files)
        {
            await using var stream = File.OpenRead(file.FullName);
            var delegation = await JsonSerializer.DeserializeAsync<AppsInstanceDelegationResponseDto>(stream, _options);
            if (delegation is not null && (instanceId is null || delegation.InstanceId == instanceId.ToString()))
            {
                result.Add(delegation);
            } 
        }

        return result;
    }

    /// <summary>
    /// Adds the delegation's rights to what is already delegated from the same party to the same party for the
    /// instance. Access Management accepts a repeated grant, so a right that is already delegated is not an error.
    /// </summary>
    public async Task Save(AppsInstanceDelegationResponseDto delegation)
    {
        using var mutationLock = await _mutationLock.Lock();
        var fileName = FileName(delegation);
        var rights = (await ReadFile(fileName))?.Rights.ToList() ?? [];
        foreach (var right in delegation.Rights)
        {
            if (!rights.Any(existing => MatchesRight(existing, right)))
            {
                rights.Add(right);
            }
        }

        await Write(fileName, WithRights(delegation, rights));
    }

    /// <summary>
    /// Removes the delegation's rights, keeping any other rights delegated between the same parties. Revoking a
    /// right that is not delegated is not an error.
    /// </summary>
    public async Task Delete(AppsInstanceDelegationResponseDto delegation)
    {
        using var mutationLock = await _mutationLock.Lock();
        var fileName = FileName(delegation);
        var stored = await ReadFile(fileName);
        if (stored is null)
        {
            return;
        }

        var remaining = stored
            .Rights.Where(existing => !delegation.Rights.Any(revoked => MatchesRight(existing, revoked)))
            .ToList();
        if (remaining.Count == 0)
        {
            File.Delete(fileName);
            return;
        }

        await Write(fileName, WithRights(stored, remaining));
    }

    public void Dispose() => _mutationLock.Dispose();

    private string FileName(AppsInstanceDelegationResponseDto delegation) =>
        Path.Join(Storage().FullName, $"{delegation.InstanceId}-{Hash(delegation)}.json");

    private static async Task<AppsInstanceDelegationResponseDto> ReadFile(string fileName)
    {
        if (!File.Exists(fileName))
        {
            return null;
        }

        await using var stream = File.OpenRead(fileName);
        return await JsonSerializer.DeserializeAsync<AppsInstanceDelegationResponseDto>(stream, _options);
    }

    /// <summary>
    /// Writes the whole file under a temporary name first, so an authorization request reading the folder never
    /// sees a partly written delegation.
    /// </summary>
    private static async Task Write(string fileName, AppsInstanceDelegationResponseDto delegation)
    {
        var temporaryFile = $"{fileName}.{Guid.NewGuid():N}.tmp";
        try
        {
            await using (var stream = File.Create(temporaryFile))
            {
                await JsonSerializer.SerializeAsync(stream, delegation, _options);
            }
            File.Move(temporaryFile, fileName, overwrite: true);
        }
        finally
        {
            File.Delete(temporaryFile);
        }
    }

    private static AppsInstanceDelegationResponseDto WithRights(
        AppsInstanceDelegationResponseDto delegation,
        IEnumerable<RightDelegationResultDto> rights
    ) =>
        new()
        {
            From = delegation.From,
            To = delegation.To,
            ResourceId = delegation.ResourceId,
            InstanceId = delegation.InstanceId,
            Rights = rights.ToArray(),
        };

    /// <summary>
    /// The same action on the same resource, whatever order the resource's attributes were sent in.
    /// </summary>
    private static bool MatchesRight(RightDelegationResultDto left, RightDelegationResultDto right) =>
        left.Action == right.Action && left.Resource.ToHashSet().SetEquals(right.Resource);

    private static string Hash(AppsInstanceDelegationResponseDto delegation)
    {
        // Hash using XxHash128
        var hasher = new System.IO.Hashing.XxHash128();
        var encoding = Encoding.UTF8;
        hasher.Append(encoding.GetBytes(delegation.From.Type));
        hasher.Append(encoding.GetBytes(delegation.From.Value));
        hasher.Append(encoding.GetBytes(delegation.To.Type));
        hasher.Append(encoding.GetBytes(delegation.To.Value));
        hasher.Append(encoding.GetBytes(delegation.ResourceId));
        hasher.Append(encoding.GetBytes(delegation.InstanceId));
        var b64 = Convert.ToBase64String(hasher.GetCurrentHash());
        b64 = b64.Replace('/', '_');
        b64 = b64.Replace('+', '_');
        b64 = b64.Replace('=', '_');
        return b64;
    }
}