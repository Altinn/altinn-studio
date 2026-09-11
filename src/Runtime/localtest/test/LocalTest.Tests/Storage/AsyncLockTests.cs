using LocalTest.Services.Storage.Implementation;
using Xunit;

namespace LocalTest.Tests.Storage;

public sealed class AsyncLockTests
{
    private static readonly TimeSpan _timeout = TimeSpan.FromSeconds(5);

    [Fact]
    public async Task Lock_WhenObserverThrowsAfterSynchronousAcquisition_ReleasesPermit()
    {
        using var asyncLock = new AsyncLock();
        var expected = new InvalidOperationException("observer failed");

        InvalidOperationException actual = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            asyncLock.Lock(_ => throw expected).WaitAsync(_timeout)
        );

        Assert.Same(expected, actual);
        await AssertCanAcquireAndReleaseTwice(asyncLock);
    }

    [Fact]
    public async Task Lock_WhenContendedObserverThrows_PropagatesPromptlyAndReleasesEventualPermit()
    {
        using var asyncLock = new AsyncLock();
        IDisposable? heldPermit = await asyncLock.Lock().WaitAsync(_timeout);
        Task<IDisposable>? failedAcquisition = null;
        Task<IDisposable>? probeAcquisition = null;
        bool probeHandled = false;
        try
        {
            var expected = new InvalidOperationException("observer failed");
            bool? observerSawBlocked = null;
            failedAcquisition = asyncLock.Lock(blocked =>
            {
                observerSawBlocked = blocked;
                throw expected;
            });

            Assert.True(observerSawBlocked);
            InvalidOperationException actual = await Assert.ThrowsAsync<InvalidOperationException>(
                () => failedAcquisition.WaitAsync(_timeout)
            );
            Assert.Same(expected, actual);

            bool? probeSawBlocked = null;
            probeAcquisition = asyncLock.Lock(blocked => probeSawBlocked = blocked);
            Assert.True(probeSawBlocked);
            Assert.False(probeAcquisition.IsCompleted);

            heldPermit.Dispose();
            heldPermit = null;
            IDisposable probePermit = await probeAcquisition.WaitAsync(_timeout);
            probePermit.Dispose();
            probeHandled = true;

            await AssertCanAcquireAndReleaseTwice(asyncLock);
        }
        finally
        {
            heldPermit?.Dispose();
            if (failedAcquisition is not null)
            {
                try
                {
                    await failedAcquisition.WaitAsync(_timeout);
                }
                catch
                {
                    // The callback failure is asserted above or observed here during cleanup.
                }
            }

            if (probeAcquisition is not null && !probeHandled)
            {
                try
                {
                    IDisposable probePermit = await probeAcquisition.WaitAsync(_timeout);
                    probePermit.Dispose();
                }
                catch
                {
                    // A primary assertion already describes why the probe did not complete.
                }
            }
        }
    }

    [Fact]
    public async Task Lock_WhenQueuedObserverThrowsAndWaitIsCanceled_DoesNotReleasePermit()
    {
        using var asyncLock = new AsyncLock();
        using var cancellation = new CancellationTokenSource();
        IDisposable? heldPermit = await asyncLock.Lock().WaitAsync(_timeout);
        Task<IDisposable>? failedAcquisition = null;
        Task<IDisposable>? probeAcquisition = null;
        bool probeHandled = false;
        try
        {
            var expected = new InvalidOperationException("observer failed");
            bool? observerSawBlocked = null;
            failedAcquisition = asyncLock.Lock(
                blocked =>
                {
                    observerSawBlocked = blocked;
                    throw expected;
                },
                cancellation.Token
            );

            Assert.True(observerSawBlocked);
            cancellation.Cancel();

            InvalidOperationException actual = await Assert.ThrowsAsync<InvalidOperationException>(
                () =>
                    failedAcquisition.WaitAsync(_timeout)
            );
            Assert.Same(expected, actual);

            bool? probeSawBlocked = null;
            probeAcquisition = asyncLock.Lock(blocked => probeSawBlocked = blocked);
            Assert.True(probeSawBlocked);
            Assert.False(probeAcquisition.IsCompleted);

            heldPermit.Dispose();
            heldPermit = null;
            IDisposable probePermit = await probeAcquisition.WaitAsync(_timeout);
            probePermit.Dispose();
            probeHandled = true;

            await AssertCanAcquireAndReleaseTwice(asyncLock);
        }
        finally
        {
            cancellation.Cancel();
            heldPermit?.Dispose();
            if (failedAcquisition is not null)
            {
                try
                {
                    await failedAcquisition.WaitAsync(_timeout);
                }
                catch
                {
                    // The callback failure is asserted above or observed here during cleanup.
                }
            }

            if (probeAcquisition is not null && !probeHandled)
            {
                try
                {
                    IDisposable probePermit = await probeAcquisition.WaitAsync(_timeout);
                    probePermit.Dispose();
                }
                catch
                {
                    // A primary assertion already describes why the probe did not complete.
                }
            }
        }
    }

    private static async Task AssertCanAcquireAndReleaseTwice(AsyncLock asyncLock)
    {
        IDisposable first = await asyncLock.Lock().WaitAsync(_timeout);
        first.Dispose();

        IDisposable second = await asyncLock.Lock().WaitAsync(_timeout);
        second.Dispose();
    }
}
