namespace WorkflowEngine.Resilience.Tests;

public sealed class ConcurrencyLimiterTests : IDisposable
{
    private readonly ConcurrencyLimiter _limiter = new(maxConcurrentDbOperations: 3, maxConcurrentHttpCalls: 2);

    [Fact]
    public void InitialSlotStatus_ReflectsConstructorValues()
    {
        // Act
        var dbStatus = _limiter.DbSlotStatus;
        var httpStatus = _limiter.HttpSlotStatus;

        // Assert
        Assert.Equal(3, dbStatus.Available);
        Assert.Equal(0, dbStatus.Used);
        Assert.Equal(3, dbStatus.Total);

        Assert.Equal(2, httpStatus.Available);
        Assert.Equal(0, httpStatus.Used);
        Assert.Equal(2, httpStatus.Total);
    }

    [Fact]
    public async Task AcquireDbSlot_DecrementsAvailable_AndReleasingRestores()
    {
        // Act
        var slot = await _limiter.AcquireDbSlotAsync(TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(2, _limiter.DbSlotStatus.Available);
        Assert.Equal(1, _limiter.DbSlotStatus.Used);

        // Release
        slot.Dispose();
        Assert.Equal(3, _limiter.DbSlotStatus.Available);
        Assert.Equal(0, _limiter.DbSlotStatus.Used);
    }

    [Fact]
    public async Task AcquireHttpSlot_DecrementsAvailable_AndReleasingRestores()
    {
        // Act
        var slot = await _limiter.AcquireHttpSlotAsync(TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(1, _limiter.HttpSlotStatus.Available);
        Assert.Equal(1, _limiter.HttpSlotStatus.Used);

        // Release
        slot.Dispose();
        Assert.Equal(2, _limiter.HttpSlotStatus.Available);
        Assert.Equal(0, _limiter.HttpSlotStatus.Used);
    }

    [Fact]
    public async Task SlotExhaustion_BlocksUntilReleased()
    {
        // Arrange — exhaust all HTTP slots (2)
        var slot1 = await _limiter.AcquireHttpSlotAsync(TestContext.Current.CancellationToken);
        var slot2 = await _limiter.AcquireHttpSlotAsync(TestContext.Current.CancellationToken);
        Assert.Equal(0, _limiter.HttpSlotStatus.Available);

        // Act — try to acquire a third slot, it should block
        var acquireTask = _limiter.AcquireHttpSlotAsync(TestContext.Current.CancellationToken);
        Assert.False(acquireTask.IsCompleted);

        // Release one slot
        slot1.Dispose();
        var slot3 = await acquireTask;

        // Assert
        Assert.Equal(0, _limiter.HttpSlotStatus.Available);
        Assert.Equal(2, _limiter.HttpSlotStatus.Used);

        // Cleanup
        slot2.Dispose();
        slot3.Dispose();
    }

    [Fact]
    public async Task AcquireSlot_SupportsCancellation()
    {
        // Arrange — exhaust all DB slots
        var slots = new List<IDisposable>();
        for (int i = 0; i < 3; i++)
            slots.Add(await _limiter.AcquireDbSlotAsync(TestContext.Current.CancellationToken));

        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();

        // Act & Assert
        await Assert.ThrowsAsync<TaskCanceledException>(() => _limiter.AcquireDbSlotAsync(cts.Token));

        // Cleanup
        foreach (var slot in slots)
            slot.Dispose();
    }

    public void Dispose() => _limiter.Dispose();
}
