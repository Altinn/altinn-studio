using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests.Fixtures;

[CollectionDefinition(Name)]
public class EngineShutdownCollection : ICollectionFixture<EngineAppFixture<Program>>
{
    public const string Name = "WorkflowEngineShutdown";
}
