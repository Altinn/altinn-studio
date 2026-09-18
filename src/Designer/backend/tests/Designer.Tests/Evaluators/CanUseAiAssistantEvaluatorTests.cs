using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Evaluators;
using Altinn.Studio.Designer.Services.Interfaces.Altinity;
using Moq;
using Xunit;

namespace Designer.Tests.Evaluators;

public class CanUseAiAssistantEvaluatorTests
{
    private const string Org = "ttd";
    private const string App = "test-app";

    private readonly Mock<IAiAssistantAccessService> _accessService = new();

    [Fact]
    public void Feature_ReturnsCorrectEnum()
    {
        Assert.Equal(CanUseFeatureEnum.AiAssistant, CreateEvaluator().Feature);
    }

    [Fact]
    public async Task CanUseFeatureAsync_ReturnsTrue_WhenDeveloperHasAssistantAccess()
    {
        _accessService.Setup(s => s.HasAccessAsync(Org)).ReturnsAsync(true);

        Assert.True(await CreateEvaluator().CanUseFeatureAsync(Org, App));
    }

    [Fact]
    public async Task CanUseFeatureAsync_ReturnsFalse_WhenDeveloperHasNoAssistantAccess()
    {
        _accessService.Setup(s => s.HasAccessAsync(Org)).ReturnsAsync(false);

        Assert.False(await CreateEvaluator().CanUseFeatureAsync(Org, App));
    }

    private CanUseAiAssistantEvaluator CreateEvaluator()
    {
        return new CanUseAiAssistantEvaluator(_accessService.Object);
    }
}
