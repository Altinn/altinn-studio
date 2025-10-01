using Microsoft.CodeAnalysis;

namespace Altinn.App.Analyzers.Tests.Fixtures;

/// <summary>
/// During tests of analyzers we typically want to modify code to introduce some error that cause diagnostics to
/// be emitted. When a test is done, it is important to revert the code to its original state.
/// The Roslyn workspace/solution/project models are immutable, so to achieve
/// this we can just capture the original variables from the fixture and put them back when
/// the modification this class represents is disposed.
///
/// Usage:
///   * Create a "With..." method in the fixture representing some modification to the project
///   * Before making modifications, new up this class to capture the original state
///   * In the "With..." method, make the modifications
///   * In the "With..." method, return the instance of this class that now contains the original state
///   * The caller is responsible for disposing the instance of this class, which reverts the fixture back to its original state
/// </summary>
internal sealed record ProjectModification : IDisposable
{
    private readonly BaseFixture _fixture;
    private readonly AdhocWorkspace _workspace;
    private readonly Project _project;
    private readonly Action? _action;

    internal ProjectModification(BaseFixture fixture, Action? action = null)
    {
        if (!fixture.IsInitialized)
            throw new InvalidOperationException("Fixture not initialized");

        _fixture = fixture;
        _workspace = fixture.Workspace;
        _project = fixture.Project;
        _action = action;
    }

    public void Dispose()
    {
        _fixture.Workspace = _workspace;
        _fixture.Project = _project;
        _action?.Invoke();
    }
}
