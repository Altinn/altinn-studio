namespace WorkflowEngine.Operator.Tests.Fixtures;

[CollectionDefinition(Name)]
public class OperatorTestCollection : ICollectionFixture<OperatorTestFixture>
{
    public const string Name = "OperatorWorkflowEngine";
}
