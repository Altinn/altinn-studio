using System;

namespace Altinn.Studio.Designer.Exceptions.PersonalAccessToken;

public sealed class DuplicateTokenNameException(string message) : Exception(message);
