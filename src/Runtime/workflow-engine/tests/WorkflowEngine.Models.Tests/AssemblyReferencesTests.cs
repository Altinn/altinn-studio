using System.Reflection;
using System.Runtime.InteropServices;

namespace WorkflowEngine.Models.Tests;

public class AssemblyReferencesTests
{
    /// <summary>
    /// Models holds the wire contract, so a client can take it without inheriting the engine's
    /// dependencies. Every assembly it references must come from the .NET runtime itself.
    /// </summary>
    [Fact]
    public void Models_ReferencesOnlyRuntimeAssemblies()
    {
        var runtimeDirectory = RuntimeEnvironment.GetRuntimeDirectory();

        var nonRuntime = typeof(Workflow)
            .Assembly.GetReferencedAssemblies()
            .Where(name => !Assembly.Load(name).Location.StartsWith(runtimeDirectory, StringComparison.Ordinal))
            .Select(name => name.Name)
            .ToList();

        Assert.Empty(nonRuntime);
    }
}
