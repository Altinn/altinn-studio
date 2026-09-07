using System;
using System.Collections.Generic;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Represents errors thrown when a JSON schema cannot be read.
/// </summary>
[Serializable]
public class InvalidJsonSchemaException(string message, Exception innerException) : Exception(message, innerException)
{
    public List<string> CustomErrorMessages { get; } = [innerException.Message];
}
