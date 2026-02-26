using System;

namespace Altinn.Studio.Designer.Exceptions.OrgLibrary;

public sealed class IllegalCommitMessageException(string message) : Exception(message);
