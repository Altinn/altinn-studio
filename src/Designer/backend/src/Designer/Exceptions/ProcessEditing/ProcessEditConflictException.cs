using System;

namespace Altinn.Studio.Designer.Exceptions.ProcessEditing;

/// <summary>
/// Rejects a process edit made against a stale version.
/// </summary>
public sealed class ProcessEditConflictException(string message) : Exception(message);
