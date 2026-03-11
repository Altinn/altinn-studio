using Microsoft.AspNetCore.Builder;

namespace WorkflowEngine.TestKit;

/// <summary>
/// Static interface for test program entry points.
/// Implementors provide <see cref="CreateBuilder"/> and <see cref="ConfigureApp"/>
/// so that the test infrastructure can build and configure the host generically.
/// </summary>
public interface ITestProgram
{
    static abstract WebApplicationBuilder CreateBuilder(string[] args);
    static abstract void ConfigureApp(WebApplication app);
}
