using System.Buffers.Text;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.AccessManagement.Controllers;
using LocalTest.Configuration;
using Microsoft.Extensions.Options;

namespace LocalTest.Services.AccessManagement;

public sealed class LocalInstanceDelegationsRepository
{
    private static readonly JsonSerializerOptions _options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };
    private readonly LocalPlatformSettings _settings;

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

    public async Task Save(AppsInstanceDelegationResponseDto delegation)
    {
        var directory = Storage();
        var id = Hash(delegation);
        var fileName = Path.Join(directory.FullName, $"{delegation.InstanceId}-{id}.json");
        var file = new FileInfo(fileName);
        if (file.Exists)
            throw new Exception($"Instance delegation already exists: {file.FullName}");

        await using var stream = File.OpenWrite(file.FullName);
        await JsonSerializer.SerializeAsync(stream, delegation, _options);
    }

    public void Delete(AppsInstanceDelegationResponseDto delegation)
    {
        var directory = Storage();
        var id = Hash(delegation);
        var fileName = Path.Join(directory.FullName, $"{delegation.InstanceId}-{id}.json");
        var file = new FileInfo(fileName);
        if (!file.Exists)
            throw new Exception($"Instance delegation doesn't exist: {file.FullName}");

        file.Delete();
    }

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