namespace Altinn.Studio.Designer.Infrastructure.DeveloperSession;

public interface IDeveloperContextProvider
{
    DeveloperContext? DeveloperContext { get; }

    /// <summary>
    /// Sets the <see cref="DeveloperContext"/> for the current async flow.
    /// Can only be called once per execution context. Subsequent calls throw <see cref="System.InvalidOperationException"/>.
    /// </summary>
    void Initialize(DeveloperContext context);
}
