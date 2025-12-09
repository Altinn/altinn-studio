using System;

namespace Altinn.Studio.Designer.Exceptions.SharedContent;

public class SharedContentRequestException(string message, Exception exception) : Exception(message, exception);
