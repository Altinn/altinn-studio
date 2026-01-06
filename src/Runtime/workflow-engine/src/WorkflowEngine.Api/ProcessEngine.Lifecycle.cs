using System.Diagnostics.CodeAnalysis;
using WorkflowEngine.Models;
using Task = System.Threading.Tasks.Task;

namespace WorkflowEngine.Api;

internal partial class ProcessEngine
{
    public async Task Start(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Starting process engine");

        if (_cancellationTokenSource is not null || _mainLoopTask is not null)
            await Stop();

        Status |= EngineHealthStatus.Running;
        _cleanupRequired = true;
        _cancellationTokenSource = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);

        _mainLoopTask = Task.Run(
            async () =>
            {
                try
                {
                    while (!_cancellationTokenSource.IsCancellationRequested)
                    {
                        try
                        {
                            await MainLoop(_cancellationTokenSource.Token);
                            Status &= ~EngineHealthStatus.Unhealthy;
                            Status |= EngineHealthStatus.Healthy;
                            Status |= EngineHealthStatus.Running;
                        }
                        catch (OperationCanceledException) when (_cancellationTokenSource.IsCancellationRequested) { }
                        catch (Exception e)
                        {
                            _logger.LogError(
                                e,
                                "The process engine encountered an unhandled exception: {Message}",
                                e.Message
                            );

                            Status |= EngineHealthStatus.Unhealthy;
                        }
                    }
                }
                finally
                {
                    await Cleanup();
                    Status &= ~EngineHealthStatus.Running;
                }
            },
            _cancellationTokenSource.Token
        );
    }

    public async Task Stop()
    {
        _logger.LogInformation("Stopping process engine");

        if (!Status.HasFlag(EngineHealthStatus.Running))
            return;

        try
        {
            if (_cancellationTokenSource is not null)
                await _cancellationTokenSource.CancelAsync();

            if (_mainLoopTask?.IsCompleted is false)
                await _mainLoopTask;
        }
        catch (OperationCanceledException) { }
        finally
        {
            Status &= ~EngineHealthStatus.Running;
            Status |= EngineHealthStatus.Stopped;
        }
    }

    private async Task AcquireQueueSlot(CancellationToken cancellationToken = default)
    {
        _logger.LogTrace("Acquiring queue slot");
        await _inboxCapacityLimit.WaitAsync(cancellationToken);

        if (InboxCount >= Settings.QueueCapacity)
            Status |= EngineHealthStatus.QueueFull;
        else
            Status &= ~EngineHealthStatus.QueueFull;

        _logger.LogTrace("Status after acquiring slot: {Status}", Status);
    }

    private void RemoveJobAndReleaseQueueSlot(Workflow workflow)
    {
        _logger.LogTrace("Releasing queue slot");
        bool removed = _inbox.TryRemove(workflow.Key, out _);
        if (!removed)
            throw new InvalidOperationException($"Unable to release queue slot {workflow.Key}");

        _inboxCapacityLimit.Release();
    }

    [MemberNotNull(nameof(_inbox), nameof(_inboxCapacityLimit))]
    private void InitializeInbox()
    {
        _inbox = [];
        _inboxCapacityLimit = new SemaphoreSlim(Settings.QueueCapacity, Settings.QueueCapacity);
    }

    private async Task Cleanup()
    {
        await _cleanupLock.WaitAsync();

        try
        {
            if (!_cleanupRequired)
                return;

            _cleanupRequired = false;
            _mainLoopTask = null;
            _cancellationTokenSource?.Dispose();
            _cancellationTokenSource = null;

            await _isEnabledHistory.Clear();

            _inbox.Clear();
            _inboxCapacityLimit.Dispose();

            InitializeInbox();
        }
        finally
        {
            _cleanupLock.Release();
        }
    }

    public void Dispose()
    {
        if (_disposed)
            return;

        _disposed = true;
        _cancellationTokenSource?.Dispose();
        _mainLoopTask?.Dispose();
        _isEnabledHistory.Dispose();
        _cleanupLock.Dispose();
        _inboxCapacityLimit.Dispose();
    }
}
