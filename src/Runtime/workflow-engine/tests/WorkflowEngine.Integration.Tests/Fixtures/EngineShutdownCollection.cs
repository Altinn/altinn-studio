namespace WorkflowEngine.Integration.Tests.Fixtures;

[CollectionDefinition(Name)]
public class EngineShutdownCollection : ICollectionFixture<EngineAppFixture>
{
    public const string Name = "WorkflowEngineShutdown";
}
