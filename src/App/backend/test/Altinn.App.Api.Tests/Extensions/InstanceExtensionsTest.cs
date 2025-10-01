using Altinn.App.Api.Extensions;
using Altinn.App.Core.Internal.Data;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace Altinn.App.Api.Tests.Extensions;

public class InstanceExtensionsTest
{
    [Fact]
    public async Task WithOnlyAccessibleDataElements_ReturnsOnlyAccessibleDataElements()
    {
        // Arrange
        var instance = new Instance
        {
            Id = "12345/7e5a1c41-04d0-4133-8a4e-c9130565cb23",
            Data =
            [
                new DataElement { Id = "1", DataType = "accessible" },
                new DataElement { Id = "2", DataType = "accessible" },
                new DataElement { Id = "3", DataType = "inaccessible" },
            ],
        };

        var mockDataElementAccessChecker = new Mock<IDataElementAccessChecker>();
        mockDataElementAccessChecker
            .Setup(checker => checker.GetReaderProblem(It.IsAny<Instance>(), It.IsAny<DataElement>()))
            .ReturnsAsync(
                (Instance _, DataElement dataElement) =>
                {
                    return dataElement.DataType switch
                    {
                        "accessible" => null,
                        _ => new ProblemDetails(),
                    };
                }
            );

        // Act
        var result = await instance.WithOnlyAccessibleDataElements(mockDataElementAccessChecker.Object);

        // Assert
        Assert.Equal("12345/7e5a1c41-04d0-4133-8a4e-c9130565cb23", result.Id);
        Assert.Same(instance.Data[0], result.Data[0]);
        Assert.Equivalent(
            new[]
            {
                new DataElement { Id = "1", DataType = "accessible" },
                new DataElement { Id = "2", DataType = "accessible" },
            },
            result.Data
        );
    }
}
