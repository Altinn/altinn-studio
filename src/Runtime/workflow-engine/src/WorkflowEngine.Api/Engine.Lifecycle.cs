using System.Diagnostics.CodeAnalysis;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using Task = System.Threading.Tasks.Task;

namespace WorkflowEngine.Api;

internal partial class Engine
{
    public async Task Start(CancellationToken cancellationToken = default)
    {
        _logger.StartingEngine();

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
                        catch (OperationCanceledException) when (_cancellationTokenSource.IsCancellationRequested)
                        {
                            // Graceful shutdown
                        }
                        catch (Exception ex)
                        {
                            _logger.UnhandledMainloopException(ex.Message, ex);
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
        _logger.StoppingEngine();

        if (!Status.HasFlag(EngineHealthStatus.Running))
            return;

        try
        {
            if (_cancellationTokenSource is not null)
                await _cancellationTokenSource.CancelAsync();

            if (_mainLoopTask?.IsCompleted is false)
                await _mainLoopTask;
        }
        catch (OperationCanceledException)
        {
            // Graceful shutdown
        }
        finally
        {
            Status &= ~EngineHealthStatus.Running;
            Status |= EngineHealthStatus.Stopped;
        }
    }

    private async Task AcquireQueueSlot(CancellationToken cancellationToken = default)
    {
        using var activity = Telemetry.Source.StartActivity("Engine.AcquireQueueSlot");
        _logger.AcquiringQueueSlot();

        await _inboxCapacityLimit.WaitAsync(cancellationToken);

        if (InboxCount >= _settings.QueueCapacity)
            Status |= EngineHealthStatus.QueueFull;
        else
            Status &= ~EngineHealthStatus.QueueFull;

        _logger.StatusAfterAcquiringSlot(Status);
    }

    private void RemoveJobAndReleaseQueueSlot(Workflow workflow)
    {
        using var activity = Telemetry.Source.StartActivity("Engine.RemoveJobAndReleaseQueueSlot");
        _logger.ReleasingQueueSlot();

        bool removed = _inbox.TryRemove(workflow.IdempotencyKey, out _);
        if (!removed)
        {
            activity?.Errored(errorMessage: $"Unable to release queue slot {workflow.IdempotencyKey}");
            throw new EngineException($"Unable to release queue slot {workflow.IdempotencyKey}");
        }

        _inboxCapacityLimit.Release();
    }

    [MemberNotNull(nameof(_inbox), nameof(_inboxCapacityLimit))]
    private void InitializeInbox()
    {
        _inbox = [];
        _inboxCapacityLimit = new SemaphoreSlim(_settings.QueueCapacity, _settings.QueueCapacity);
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
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (_disposed || !disposing)
            return;

        _disposed = true;
        _cancellationTokenSource?.Dispose();
        _mainLoopTask?.Dispose();
        _isEnabledHistory.Dispose();
        _cleanupLock.Dispose();
        _inboxCapacityLimit.Dispose();
    }
}
