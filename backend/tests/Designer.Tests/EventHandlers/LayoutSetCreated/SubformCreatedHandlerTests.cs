using System.Threading.Tasks;
using Altinn.Studio.Designer.EventHandlers;
using Altinn.Studio.Designer.EventHandlers.LayoutSetCreated;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Hubs.SyncHub;
using Designer.Tests.Utils;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.EventHandlers.LayoutSetCreated;

public class SubformCreatedHandlerTests
{
    private readonly IMediator _mediator;
    private readonly Mock<IFileSyncHandlerExecutor> _fileSyncHandlerExecutor;

    public SubformCreatedHandlerTests()
    {
        ServiceCollection services = new();
        ServiceProvider serviceProvider = services
            .AddMediatR(config => config.RegisterServicesFromAssemblies(typeof(Program).Assembly))
            .BuildServiceProvider();
        _mediator = serviceProvider.GetRequiredService<IMediator>();
        _fileSyncHandlerExecutor = new Mock<IFileSyncHandlerExecutor>();
    }

    [Theory]
    [InlineData("parameter")]
    public async Task MyMethod(string parameter)
    {
        var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        LayoutSetCreatedEvent layoutSetCreatedEvent = new LayoutSetCreatedEvent();

        await _mediator.Publish(layoutSetCreatedEvent);
    }
}
