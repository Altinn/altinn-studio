using System;

namespace Altinn.Studio.Common.App;

// A struct has a default value that no parsing produced. The value types here are structs, so they refuse to give the
// value of such an instance rather than give one that breaks their rule.
internal static class DefaultValue
{
    public static InvalidOperationException Of(string type) =>
        new($"This {type} is the default value of its type, which was not created by parsing.");
}
