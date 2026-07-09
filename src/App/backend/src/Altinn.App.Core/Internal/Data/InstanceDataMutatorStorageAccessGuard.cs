namespace Altinn.App.Core.Internal.Data;

internal sealed class InstanceDataMutatorStorageAccessGuard : IInstanceDataMutatorStorageAccessGuard
{
    private readonly AsyncLocal<ScopeState?> _scopeState = new();

    public bool IsActive => _scopeState.Value?.IsActive is true;

    public IDisposable EnterScope()
    {
        ScopeState scopeState = _scopeState.Value ??= new ScopeState();
        scopeState.Enter();
        return new Scope(scopeState);
    }

    public void ThrowIfActive(string clientName)
    {
        if (!IsActive)
        {
            return;
        }

        throw new InvalidOperationException(
            $"Direct {clientName} Storage access is not allowed during an active InstanceDataUnitOfWork. "
                + "Use the active IInstanceDataAccessor/IInstanceDataMutator view, or move direct "
                + "IDataClient/IInstanceClient calls outside the unit of work."
        );
    }

    private sealed class ScopeState
    {
        private readonly Lock _lock = new();
        private int _depth;

        public bool IsActive
        {
            get
            {
                lock (_lock)
                {
                    return _depth > 0;
                }
            }
        }

        public void Enter()
        {
            lock (_lock)
            {
                _depth++;
            }
        }

        public void Exit()
        {
            lock (_lock)
            {
                if (_depth > 0)
                {
                    _depth--;
                }
            }
        }
    }

    private sealed class Scope(ScopeState scopeState) : IDisposable
    {
        private int _disposed;

        public void Dispose()
        {
            if (System.Threading.Interlocked.Exchange(ref _disposed, 1) == 0)
            {
                scopeState.Exit();
            }
        }
    }
}
