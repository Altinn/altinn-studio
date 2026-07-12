using Altinn.Platform.Storage.Interface.Models;
using LocalTest.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using LocalDataRepository = LocalTest.Services.Storage.Implementation.DataRepository;
using LocalInstanceMutationRepository = LocalTest.Services.Storage.Implementation.InstanceMutationRepository;
using LocalInstanceRepository = LocalTest.Services.Storage.Implementation.InstanceRepository;

namespace LocalTest.Tests.Storage;

internal sealed class ContentEtagStorageFixture : IAsyncDisposable
{
    private bool _preserveRootOnDispose;

    public ContentEtagStorageFixture()
    {
        Root =
            Path.Combine(Path.GetTempPath(), $"localtest-content-etag-{Guid.NewGuid()}")
            + Path.DirectorySeparatorChar;
        Directory.CreateDirectory(Root);
        Settings = new LocalPlatformSettings { LocalTestingStorageBasePath = Root };
        IOptions<LocalPlatformSettings> options = Options.Create(Settings);
        DataRepository = new LocalDataRepository(options);
        InstanceRepository = new LocalInstanceRepository(options, DataRepository);
        MutationRepository = new LocalInstanceMutationRepository(
            options,
            InstanceRepository,
            DataRepository,
            NullLogger<LocalInstanceMutationRepository>.Instance
        );
    }

    public string Root { get; }

    public LocalPlatformSettings Settings { get; }

    public LocalDataRepository DataRepository { get; }

    public LocalInstanceRepository InstanceRepository { get; }

    public LocalInstanceMutationRepository MutationRepository { get; }

    public async Task<Instance> CreateInstance()
    {
        return await InstanceRepository.Create(
            new Instance
            {
                InstanceOwner = new InstanceOwner { PartyId = "501337" },
                Org = "ttd",
                AppId = "ttd/localtest-content-etag-tests",
                Created = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                Status = new InstanceStatus(),
                LastChanged = new DateTime(2026, 1, 1, 1, 0, 0, DateTimeKind.Utc),
                LastChangedBy = "seed-actor",
            },
            CancellationToken.None
        );
    }

    public string GetPersistedDataElementPath(Guid instanceGuid, Guid dataElementId) =>
        Path.Combine(
            Root,
            Settings.DocumentDbFolder,
            Settings.DataCollectionFolder,
            instanceGuid.ToString(),
            $"{dataElementId}.json"
        );

    public void PreserveRootOnDispose() => _preserveRootOnDispose = true;

    public ValueTask DisposeAsync()
    {
        if (!_preserveRootOnDispose && Directory.Exists(Root))
        {
            Directory.Delete(Root, recursive: true);
        }

        return ValueTask.CompletedTask;
    }
}
