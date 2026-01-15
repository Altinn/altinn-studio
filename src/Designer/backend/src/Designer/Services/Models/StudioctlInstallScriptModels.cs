#nullable enable

namespace Altinn.Studio.Designer.Services.Models;

public enum StudioctlInstallScriptStatus
{
    Ok = 0,
    NotFound = 1,
    Unavailable = 2
}

public enum StudioctlInstallScriptType
{
    Bash = 0,
    PowerShell = 1
}

public sealed class StudioctlInstallScriptResult
{
    public StudioctlInstallScriptResult(
        StudioctlInstallScriptStatus status,
        byte[] content,
        string fileName,
        bool isStale)
    {
        Status = status;
        Content = content;
        FileName = fileName;
        IsStale = isStale;
    }

    public StudioctlInstallScriptStatus Status { get; }
    public byte[] Content { get; }
    public string FileName { get; }
    public bool IsStale { get; }
}
