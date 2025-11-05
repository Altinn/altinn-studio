using System;

namespace Altinn.Studio.Designer.Exceptions.CodeList;

public sealed class IllegalCommitMessageException(string message) : Exception(message);
