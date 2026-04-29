using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests.Fixtures;

[CollectionDefinition(Name)]
public class EngineAppCollection : ICollectionFixture<EngineAppFixture<Program>>
{
    public const string Name = "WorkflowEngineApp";
}
