using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.DeploymentsController;

/// <summary>
/// Collection definition for deployment controller tests that share a WebApplicationFactory.
///
/// This collection exists to prevent ObjectDisposedException errors when running multiple
/// deployment controller test classes. The issue occurs because:
///
/// 1. Each test class with IClassFixture&lt;WebApplicationFactory&lt;Program&gt;&gt; gets its own factory instance
/// 2. When a deployment is created, it publishes a MediatR notification (DeploymentPipelineQueued)
/// 3. This notification triggers a Quartz scheduler handler that creates a polling job
/// 4. Quartz components use the LoggerFactory from the DI container
/// 5. When tests from different classes run (even sequentially), one class's WebApplicationFactory
///    may be disposed while Quartz components from another test are still resolving dependencies
/// 6. This causes "Cannot access a disposed object. Object name: 'LoggerFactory'" errors
///
/// By using ICollectionFixture&lt;WebApplicationFactory&lt;Program&gt;&gt;, all test classes in this collection
/// share the same WebApplicationFactory instance, ensuring the LoggerFactory remains available
/// throughout all tests in the collection.
/// </summary>
[CollectionDefinition(nameof(DeploymentControllerCollection), DisableParallelization = true)]
public class DeploymentControllerCollection :
    ICollectionFixture<DesignerDbFixture>,
    ICollectionFixture<WebApplicationFactory<Program>>,
    ICollectionFixture<MockServerFixture>
{
    // This class has no code, and is never created. Its purpose is simply
    // to be the place to apply [CollectionDefinition] and all the
    // ICollectionFixture<> interfaces.
}
