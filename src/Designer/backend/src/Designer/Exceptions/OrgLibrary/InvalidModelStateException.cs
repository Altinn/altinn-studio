using System;

namespace Altinn.Studio.Designer.Exceptions.OrgLibrary;

public sealed class InvalidModelStateException(string message) : Exception(message);
