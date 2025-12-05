using System;

namespace Altinn.Studio.Designer.Exceptions.SourceControl;

public class BranchNotFoundException(string? message = null) : Exception(message);
