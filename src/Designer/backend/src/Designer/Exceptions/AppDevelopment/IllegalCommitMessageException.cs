#nullable enable
using System;

namespace Altinn.Studio.Designer.Exceptions.AppDevelopment;

public class IllegalCommitMessageException(string message) : Exception(message)
{
}
