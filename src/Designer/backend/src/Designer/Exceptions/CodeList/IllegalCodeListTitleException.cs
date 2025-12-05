using System;

namespace Altinn.Studio.Designer.Exceptions.CodeList;

public sealed class IllegalCodeListTitleException(string message) : Exception(message);
