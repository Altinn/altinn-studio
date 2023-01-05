using System.Diagnostics.CodeAnalysis;
using System.IO;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Moq;

namespace Designer.Tests.Controllers.DataModelsController.Utils;

[ExcludeFromCodeCoverage]
public static class MockUtils
{
    public static void MockRepositoryCalls(Mock<IRepository> repositoryMock, string testRepositoriesLocation, string user)
    {
        repositoryMock
            .Setup(r => r.UpdateApplicationWithAppLogicModel(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Verifiable();

        repositoryMock.Setup(r => r.ReadData(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns<string, string, string>(async (org, repo, path) =>
            {
                string repopath = Path.Combine(testRepositoriesLocation, user, org, repo, path);

                Stream fs = File.OpenRead(repopath);
                return await Task.FromResult(fs);
            });
        repositoryMock.Setup(r => r.DeleteData(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Verifiable();
        repositoryMock
            .Setup(r => r.WriteData(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Stream>()))
            .Verifiable();
        repositoryMock
            .Setup(r => r.DeleteMetadataForAttachment(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns(true);
    }
}
