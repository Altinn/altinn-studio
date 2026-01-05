using System.Diagnostics.CodeAnalysis;
using WorkflowEngine.Models;

namespace Altinn.App.ProcessEngine;

internal partial class ProcessEngine
{
    public async Task Start(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Starting process engine");

        if (_cancellationTokenSource is not null || _mainLoopTask is not null)
            await Stop();

        Status |= ProcessEngineHealthStatus.Running;
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
                            Status &= ~ProcessEngineHealthStatus.Unhealthy;
                            Status |= ProcessEngineHealthStatus.Healthy;
                            Status |= ProcessEngineHealthStatus.Running;
                        }
                        catch (OperationCanceledException) when (_cancellationTokenSource.IsCancellationRequested) { }
                        catch (Exception e)
                        {
                            _logger.LogError(
                                e,
                                "The process engine encountered an unhandled exception: {Message}",
                                e.Message
                            );

                            Status |= ProcessEngineHealthStatus.Unhealthy;
                        }
                    }
                }
                finally
                {
                    await Cleanup();
                    Status &= ~ProcessEngineHealthStatus.Running;
                }
            },
            _cancellationTokenSource.Token
        );
    }

    public async Task Stop()
    {
        _logger.LogInformation("Stopping process engine");

        if (!Status.HasFlag(ProcessEngineHealthStatus.Running))
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
            Status &= ~ProcessEngineHealthStatus.Running;
            Status |= ProcessEngineHealthStatus.Stopped;
        }
    }

    private async Task AcquireQueueSlot(CancellationToken cancellationToken = default)
    {
        _logger.LogTrace("Acquiring queue slot");
        await _inboxCapacityLimit.WaitAsync(cancellationToken);

        if (InboxCount >= Settings.QueueCapacity)
            Status |= ProcessEngineHealthStatus.QueueFull;
        else
            Status &= ~ProcessEngineHealthStatus.QueueFull;

        _logger.LogTrace("Status after acquiring slot: {Status}", Status);
    }

    private void RemoveJobAndReleaseQueueSlot(ProcessEngineJob job)
    {
        _logger.LogTrace("Releasing queue slot");
        bool removed = _inbox.TryRemove(job.Key, out _);
        if (!removed)
            throw new InvalidOperationException($"Unable to release queue slot {job.Key}");

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
