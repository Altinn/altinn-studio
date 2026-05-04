namespace WorkflowEngine.App.Tests.Fixtures;

[CollectionDefinition(Name)]
public class AppTestCollection : ICollectionFixture<AppTestFixture>
{
    public const string Name = "WorkflowEngineApp";
}
