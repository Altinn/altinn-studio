using System;
using System.Threading;

namespace Altinn.Studio.Designer.Infrastructure.DeveloperSession;

public class DeveloperContextProvider : IDeveloperContextProvider
{
    private static readonly AsyncLocal<DeveloperContext?> s_current = new();

    public DeveloperContext? DeveloperContext => s_current.Value;

    public void Initialize(DeveloperContext context)
    {
        if (s_current.Value != null)
        {
            throw new InvalidOperationException("DeveloperContext is already initialized for this execution context.");
        }

        s_current.Value = context;
    }
}
