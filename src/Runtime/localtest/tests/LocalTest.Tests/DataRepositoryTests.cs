using Altinn.Platform.Storage.Interface.Models;
using LocalTest.Configuration;
using LocalTest.Services.Storage.Implementation;
using Microsoft.Extensions.Options;
using Xunit;

namespace LocalTest.Tests;

public sealed class DataRepositoryTests : IDisposable
{
    private readonly string _storagePath = Path.Join(Path.GetTempPath(), $"localtest-data-{Guid.NewGuid():N}");
    private readonly Guid _instanceId = Guid.NewGuid();
    private readonly DataRepository _repository;

    public DataRepositoryTests()
    {
        _repository = new DataRepository(Options.Create(new LocalPlatformSettings
        {
            LocalTestingStorageBasePath = _storagePath + Path.DirectorySeparatorChar
        }));
    }

    [Fact]
    public async Task ReadAll_ElementDeletedAfterEnumeration_ReturnsRemainingElements()
    {
        for (int index = 0; index < 3; index++)
        {
            await _repository.Create(new DataElement
            {
                Id = Guid.NewGuid().ToString(),
                InstanceGuid = _instanceId.ToString(),
                DataType = "signee-states",
                Created = DateTime.UtcNow.AddMinutes(index)
            });
        }
        string[] files = Directory.GetFiles(_storagePath, "*.json", SearchOption.AllDirectories);

        Task<List<DataElement>> reading;
        // An exclusive handle makes the existing read retry yield after enumeration. Delete the next
        // element during that retry, reproducing parallel DELETE requests during instance authorization.
        using (File.Open(files[0], FileMode.Open, FileAccess.ReadWrite, FileShare.None))
        {
            reading = _repository.ReadAll(_instanceId);
            Assert.False(reading.IsCompleted);
            File.Delete(files[1]);
        }

        var remaining = await reading;

        Assert.Equal(2, remaining.Count);
        Assert.DoesNotContain(remaining, element => element.Id == Path.GetFileNameWithoutExtension(files[1]));
        Assert.Equal(remaining.OrderBy(element => element.Created).Select(element => element.Id), remaining.Select(element => element.Id));
    }

    public void Dispose()
    {
        if (Directory.Exists(_storagePath))
        {
            Directory.Delete(_storagePath, recursive: true);
        }
    }
}
