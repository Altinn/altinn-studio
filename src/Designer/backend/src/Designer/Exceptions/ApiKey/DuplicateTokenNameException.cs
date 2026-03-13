using System;

namespace Altinn.Studio.Designer.Exceptions.ApiKey;

public sealed class DuplicateTokenNameException(string message) : Exception(message);
