using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.WorkflowEngine.DependencyInjection;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.DependencyInjection;

public class WorkflowEngineCommandValidatorTests
{
    [Fact]
    public async Task Validate_FactoryAndScopedRegistrationsWithoutStaticKeys_AreIncluded()
    {
        var services = new ServiceCollection();
        foreach (string key in WorkflowEngineCommandValidator.FrameworkCommandKeys)
        {
            services.AddScoped<IWorkflowEngineCommand>(_ => new Command(key));
        }
        services.AddScoped<IWorkflowEngineCommand>(_ => new Command("CustomerCommand"));
        await using ServiceProvider provider = services.BuildServiceProvider(
            new ServiceProviderOptions { ValidateScopes = true }
        );
        await using AsyncServiceScope scope = provider.CreateAsyncScope();

        IReadOnlySet<string> keys = WorkflowEngineCommandValidator.Validate(
            scope.ServiceProvider.GetServices<IWorkflowEngineCommand>().ToList()
        );

        Assert.Contains("CustomerCommand", keys);
        Assert.Contains("CommitProcessState", keys);
    }

    [Fact]
    public void Validate_MissingFrameworkCommand_Fails()
    {
        IWorkflowEngineCommand[] commands = AllCommands().Where(c => c.GetKey() != "OnTaskStartingHook").ToArray();

        ApplicationConfigException exception = Assert.Throws<ApplicationConfigException>(() =>
            WorkflowEngineCommandValidator.Validate(commands)
        );

        Assert.Contains("Required workflow command 'OnTaskStartingHook' is not registered", exception.Message);
    }

    [Theory]
    [InlineData("CustomerCommand")]
    [InlineData("CommitProcessState")]
    public void Validate_DuplicateOrdinaryOrFrameworkKey_Fails(string key)
    {
        List<IWorkflowEngineCommand> commands = AllCommands().ToList();
        if (key == "CustomerCommand")
            commands.Add(new Command(key));
        commands.Add(new Command(key));

        ApplicationConfigException exception = Assert.Throws<ApplicationConfigException>(() =>
            WorkflowEngineCommandValidator.Validate(commands)
        );

        Assert.Contains($"same key: '{key}'", exception.Message);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    public void Validate_EmptyKey_Fails(string key)
    {
        ApplicationConfigException exception = Assert.Throws<ApplicationConfigException>(() =>
            WorkflowEngineCommandValidator.Validate([.. AllCommands(), new Command(key)])
        );

        Assert.Contains("empty key", exception.Message);
    }

    [Theory]
    [InlineData("Customer/Submit")]
    [InlineData("Notify?mode=1")]
    [InlineData("Notify#fragment")]
    [InlineData("Customer:Submit")]
    [InlineData("Two Words")]
    [InlineData("Notify\nAgain")]
    [InlineData("Ærlig")]
    [InlineData("NotifyÆrlig")]
    [InlineData(".")]
    [InlineData("..")]
    [InlineData("7Submit")]
    [InlineData("_Submit")]
    [InlineData("Notify%2FSubmit")]
    [InlineData("Notify\\Submit")]
    public void Validate_KeyCannotBeUsedAsOneCallbackUrlSegment_FailsBeforeEnqueue(string key)
    {
        ApplicationConfigException exception = Assert.Throws<ApplicationConfigException>(() =>
            WorkflowEngineCommandValidator.Validate([.. AllCommands(), new Command(key)])
        );

        Assert.Contains("invalid key", exception.Message);
        Assert.Contains("ASCII letter", exception.Message);
    }

    [Theory]
    [InlineData("A")]
    [InlineData("Customer.Submit")]
    [InlineData("Customer_Submit-2.v1")]
    public void Validate_UriSafeKey_Succeeds(string key)
    {
        IReadOnlySet<string> keys = WorkflowEngineCommandValidator.Validate([.. AllCommands(), new Command(key)]);

        Assert.Contains(key, keys);
    }

    [Fact]
    public void Validate_InvalidDefaultOptions_Fails()
    {
        var command = new Command("CustomerCommand", new ProcessStepOptions { MaxExecutionTime = TimeSpan.Zero });

        ApplicationConfigException exception = Assert.Throws<ApplicationConfigException>(() =>
            WorkflowEngineCommandValidator.Validate([.. AllCommands(), command])
        );

        Assert.Contains("default step options", exception.Message);
        Assert.Contains(nameof(ProcessStepOptions.MaxExecutionTime), exception.Message);
    }

    private static IEnumerable<IWorkflowEngineCommand> AllCommands() =>
        WorkflowEngineCommandValidator.FrameworkCommandKeys.Select(key => new Command(key));

    private sealed class Command(string key, ProcessStepOptions? options = null) : IWorkflowEngineCommand
    {
        public string GetKey() => key;

        public ProcessStepOptions? DefaultStepOptions => options;

        public Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context) =>
            throw new NotSupportedException("Validation must not execute a workflow command.");
    }
}
