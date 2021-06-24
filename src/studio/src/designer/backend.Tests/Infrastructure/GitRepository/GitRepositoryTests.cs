using System;
using System.Threading.Tasks;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.Infrastructure.GitRepository
{
    public class GitRepositoryTests
    {
        [Theory]
        [InlineData("")]
        [InlineData(@"This should be read back with the same formatting!\n")]
        [InlineData(@"{""some"":""random"", ""json"":""value""}")]
        public async Task WriteTextByRelativePathAsync_ValidText_ShouldReadBackEqual(string expectedContent)
        {   
            string repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
            string repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory("ttd", "apps-test", "testUser");
            var gitRepository = new Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository(repositoriesRootDirectory, repositoryDirectory);

            var filename = $"{Guid.NewGuid()}.json";
            try
            {
                await gitRepository.WriteTextByRelativePathAsync(filename, expectedContent);
                var actualContent = await gitRepository.ReadTextByRelativePathAsync(filename);

                Assert.Equal(expectedContent, actualContent);
            }
            finally
            {
                gitRepository.DeleteFileByRelativePath(filename);
            }
        }

        [Theory]
        [InlineData(@"app/models/0678.xsd")]
        [InlineData(@"app/models/32578.xsd")]
        [InlineData(@"app/models/35721.xsd")]
        [InlineData(@"app/models/41111.xsd")]
        public async Task WriteTextByRelativePathAsync_ReadWriteRoundtrip_ShouldReadBackEqual(string expectedFilePath)
        {            
            var gitRepository = GetTestRepository("ttd", "ttd-datamodels", "testUser");

            var expectedContent = await gitRepository.ReadTextByRelativePathAsync(expectedFilePath);

            var filename = $"{Guid.NewGuid()}.json";
            try
            {
                await gitRepository.WriteTextByRelativePathAsync(filename, expectedContent);
                var actualContent = await gitRepository.ReadTextByRelativePathAsync(filename); 

                Assert.Equal(expectedContent, actualContent);
            }
            finally
            {
                gitRepository.DeleteFileByRelativePath(filename);
            }
        }

        [Fact]
        public async Task WriteTextByRelativePathAsync_RelativePathOutsideParent_ShouldThrowArgumentException()
        {
            Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository gitRepository = GetTestRepository("ttd", "ttd-datamodels", "testUser");

            await Assert.ThrowsAsync<ArgumentException>(async () => await gitRepository.WriteTextByRelativePathAsync(@"..\should.not.exist", "some content"));
        }

        [Fact]
        public void FileExistsByRelativePath_FileDontExits_ShouldReturnFalse()
        {
            var gitRepository = GetTestRepository("ttd", "ttd-datamodels", "testUser");

            Assert.False(gitRepository.FileExistsByRelativePath("this.dont.exists.schema.json"));
        }

        [Fact]
        public void FileExistsByRelativePath_FileExits_ShouldReturnTrue()
        {
            var gitRepository = GetTestRepository("ttd", "ttd-datamodels", "testUser");

            Assert.True(gitRepository.FileExistsByRelativePath("App/models/41111.xsd"));
        }

        private static Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository GetTestRepository(string org, string repository, string developer)
        {
            string repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
            string repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory(org, repository, developer);
            var gitRepository = new Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository(repositoriesRootDirectory, repositoryDirectory);

            return gitRepository;
        }
    }
}
