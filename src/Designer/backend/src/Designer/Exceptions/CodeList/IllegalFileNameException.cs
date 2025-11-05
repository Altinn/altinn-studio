using System;

namespace Altinn.Studio.Designer.Exceptions.CodeList;

public sealed class IllegalFileNameException(string message) : Exception(message);
