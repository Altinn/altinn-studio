#nullable enable
using System;

namespace Altinn.Studio.Designer.Exceptions.AppDevelopment;

public class IllegalFileNameException(string message) : Exception(message)
{
}
