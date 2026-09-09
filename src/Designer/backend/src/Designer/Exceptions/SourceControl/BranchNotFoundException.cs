using System;

namespace Altinn.Studio.Designer.Exceptions.SourceControl;

public class BranchNotFoundException(string message, string branchName) : Exception(message)
{
    public string BranchName { get; } = branchName;
}
