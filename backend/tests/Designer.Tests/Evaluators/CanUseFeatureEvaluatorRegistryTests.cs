using System.Collections.Generic;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Evaluators;
using Altinn.Studio.Designer.Services.Interfaces;
using Moq;
using Xunit;

public class CanUseFeatureEvaluatorRegistryTests
{
    [Fact]
    public void GetEvaluator_ReturnsCorrectEvaluator()
    {
        var evaluatorMock = new Mock<ICanUseFeatureEvaluator>();
        evaluatorMock.Setup(e => e.Feature).Returns(CanUseFeatureEnum.UploadDataModel);
        var registry = new CanUseFeatureEvaluatorRegistry(new List<ICanUseFeatureEvaluator> { evaluatorMock.Object });

        var evaluator = registry.GetEvaluator(CanUseFeatureEnum.UploadDataModel);
        Assert.Equal(evaluatorMock.Object, evaluator);
    }
}
