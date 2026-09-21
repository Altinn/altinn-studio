using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Repository;
using LocalTest.Configuration;
using LocalTest.Services.Events.Implementation;
using Microsoft.Extensions.Options;
using Xunit;

namespace LocalTest.Tests.Events;

/// <summary>
/// An <c>Idempotency-Key</c> is globally unique and registers exactly one event, which is what lets an
/// app retry a registration without publishing the event twice. That is the contract Altinn Events
/// offers, so localtest has to model it, or a local run cannot show the behavior a deployed app depends
/// on. These tests pin the whole of it: one event per key, one key per event, and one winner when
/// registrations race.
/// </summary>
public class EventsRepositoryIdempotencyTests : IDisposable
{
    private readonly string _root;
    private readonly EventsRepository _repository;

    public EventsRepositoryIdempotencyTests()
    {
        _root = Path.Combine(Path.GetTempPath(), $"localtest-events-{Guid.NewGuid()}") + Path.DirectorySeparatorChar;
        Directory.CreateDirectory(_root);
        _repository = new EventsRepository(
            Options.Create(new LocalPlatformSettings { LocalTestingStorageBasePath = _root })
        );
    }

    public void Dispose()
    {
        GC.SuppressFinalize(this);
        if (Directory.Exists(_root))
        {
            Directory.Delete(_root, recursive: true);
        }
    }

    private string EventsFolder =>
        Path.Combine(_root, new LocalPlatformSettings().DocumentDbFolder, new LocalPlatformSettings().EventsCollectionFolder);

    private int StoredEventCount() =>
        Directory.Exists(EventsFolder) ? Directory.GetFiles(EventsFolder).Length : 0;

    private string ReadStoredEvent(string eventId) => File.ReadAllText(Path.Combine(EventsFolder, eventId));

    private static CloudEvent NewEvent(string type = "app.instance.created") =>
        new()
        {
            Source = new Uri("https://ttd.apps.local.altinn.cloud/ttd/test/instances/501337/" + Guid.NewGuid()),
            Specversion = "1.0",
            Type = type,
            Subject = "/party/501337",
        };

    [Fact]
    public async Task Create_WithRepeatedIdempotencyKey_StoresOneEventAndResolvesToIt()
    {
        Guid key = Guid.NewGuid();

        CloudEventCreateResult first = await _repository.Create(NewEvent(), key);
        CloudEventCreateResult second = await _repository.Create(NewEvent(), key);

        Assert.False(first.IsDuplicate);
        Assert.True(second.IsDuplicate);
        // The repeat resolves to the event the first request created, rather than to the id the second
        // request generated for an event it never stored.
        Assert.Equal(first.Id, second.Id);
        Assert.Equal(1, StoredEventCount());
    }

    [Fact]
    public async Task Create_WithSameKeyForAnUnrelatedEvent_KeepsOnlyTheFirst()
    {
        Guid key = Guid.NewGuid();

        CloudEventCreateResult first = await _repository.Create(NewEvent("app.instance.created"), key);
        CloudEventCreateResult second = await _repository.Create(NewEvent("app.instance.process.completed"), key);

        // A key is spent by the first event it registers, and the two events are never compared, so the
        // second is discarded on the key alone even though it is an entirely different event. This is the
        // failure mode behind "one key, one event": nothing reports it, and the caller is told it worked.
        Assert.True(second.IsDuplicate);
        Assert.Equal(first.Id, second.Id);
        Assert.Equal(1, StoredEventCount());
        Assert.Contains("app.instance.created", ReadStoredEvent(first.Id), StringComparison.Ordinal);
        Assert.DoesNotContain("app.instance.process.completed", ReadStoredEvent(first.Id), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Create_WithDistinctIdempotencyKeys_StoresEach()
    {
        CloudEventCreateResult first = await _repository.Create(NewEvent(), Guid.NewGuid());
        CloudEventCreateResult second = await _repository.Create(NewEvent(), Guid.NewGuid());

        Assert.False(first.IsDuplicate);
        Assert.False(second.IsDuplicate);
        Assert.NotEqual(first.Id, second.Id);
        Assert.Equal(2, StoredEventCount());
    }

    [Fact]
    public async Task Create_WithoutIdempotencyKey_StoresEveryRegistration()
    {
        CloudEventCreateResult first = await _repository.Create(NewEvent());
        CloudEventCreateResult second = await _repository.Create(NewEvent());

        Assert.False(first.IsDuplicate);
        Assert.False(second.IsDuplicate);
        Assert.Equal(2, StoredEventCount());
    }

    [Fact]
    public async Task Create_WithConcurrentRegistrationsOnOneKey_StoresExactlyOne()
    {
        Guid key = Guid.NewGuid();

        CloudEventCreateResult[] results = await Task.WhenAll(
            Enumerable.Range(0, 16).Select(_ => Task.Run(() => _repository.Create(NewEvent(), key)))
        );

        // Claiming the key is a file creation, which is atomic, so exactly one caller may go on to store
        // an event however many arrive together. Every other caller resolves to that same event.
        CloudEventCreateResult stored = Assert.Single(results, r => !r.IsDuplicate);
        Assert.All(results, r => Assert.Equal(stored.Id, r.Id));
        Assert.Equal(1, StoredEventCount());
    }
}
