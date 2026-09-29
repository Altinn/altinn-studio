using Altinn.Studio.AppConfig.Documents.Text;

namespace Altinn.Studio.AppConfig.Models;

public sealed record DataType(
    string Id,
    string TaskId,
    string ClassRef,
    int? MaxCount = null,
    int? MinCount = null,
    SourceSpan Position = default
)
{
    public bool IsForm => !string.IsNullOrEmpty(ClassRef);
}

public sealed record ProcessTask(string Id, string TaskType, SourceSpan Position);
