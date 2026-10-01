using System;

namespace Altinn.Studio.Designer.Exceptions.ProcessEditing;

/// <summary>
/// Rejects an invalid process edit before any files are written.
/// </summary>
public sealed class ProcessEditValidationException(string message, Exception? innerException = null)
    : Exception(message, innerException);
