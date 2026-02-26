namespace WorkflowEngine.EndToEndTests.Fixtures;

[CollectionDefinition(Name)]
public class EngineAppCollection : ICollectionFixture<EngineAppFixture>
{
    public const string Name = "WorkflowEngineApp";
}
