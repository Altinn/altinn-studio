namespace Altinn.App.Core.Internal.Data;

internal interface IInstanceDataMutatorStorageAccessGuard
{
    bool IsActive { get; }

    IDisposable EnterScope();

    void ThrowIfActive(string clientName);
}
