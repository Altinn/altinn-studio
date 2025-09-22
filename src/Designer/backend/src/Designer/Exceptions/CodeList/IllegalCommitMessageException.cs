#nullable enable
using System;

namespace Altinn.Studio.Designer.Exceptions.CodeList;

public class IllegalCommitMessageException(string message) : Exception(message)
{
}
