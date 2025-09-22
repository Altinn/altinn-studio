#nullable enable
using System;

namespace Altinn.Studio.Designer.Exceptions.CodeList;

public class IllegalFileNameException(string message) : Exception(message)
{
}
