using System.Threading;

namespace Altinn.Studio.Designer.Infrastructure.DeveloperSession;

public class DeveloperContextAccessor : IDeveloperContextAccessor
{
    private static readonly AsyncLocal<DeveloperContext?> s_current = new();

    public DeveloperContext? DeveloperContext
    {
        get => s_current.Value;
        set => s_current.Value = value;
    }
}
