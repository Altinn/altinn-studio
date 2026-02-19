namespace Altinn.Studio.Designer.Infrastructure.DeveloperSession;

public interface IDeveloperContextAccessor
{
    DeveloperContext? DeveloperContext { get; set; }
}
