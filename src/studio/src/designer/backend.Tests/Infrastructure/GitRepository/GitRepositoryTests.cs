using System;
using System.IO;
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
            string repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory("ttd", "hvem-er-hvem", "testUser");
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
        [InlineData(@"app/models/Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.metadata.json")]
        [InlineData(@"app/models/HvemErHvem.json")]
        [InlineData(@"app/models/HvemErHvem_FlatNoTypes.schema.json")]
        [InlineData(@"app/models/HvemErHvem_SERES.schema.json")]
        [InlineData(@"/app/models/HvemErHvem_SERES.schema.json")]
        public async Task WriteTextByRelativePathAsync_ReadWriteRoundtrip_ShouldReadBackEqual(string expectedFilePath)
        {
            var gitRepository = GetTestRepository("ttd", "hvem-er-hvem", "testUser");

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
            Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository gitRepository = GetTestRepository("ttd", "hvem-er-hvem", "testUser");

            await Assert.ThrowsAsync<ArgumentException>(async () => await gitRepository.WriteTextByRelativePathAsync(@"..\should.not.exist", "some content"));
        }

        [Fact]
        public async Task WriteTextByRelativePathAsync_PathDontExist_ShouldThrowException()
        {
            Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository gitRepository = GetTestRepository("ttd", "hvem-er-hvem", "testUser");

            var relativeFileUrl = "test_this/does/not/exits/deleteme.txt";
            Assert.False(gitRepository.FileExistsByRelativePath(relativeFileUrl));
            await Assert.ThrowsAsync<DirectoryNotFoundException>(async () => await gitRepository.WriteTextByRelativePathAsync(relativeFileUrl, "this file should not be here", false));
        }

        [Fact]
        public async Task WriteTextByRelativePathAsync_PathDontExist_ShouldCreateDirectory()
        {
            Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository gitRepository = GetTestRepository("ttd", "hvem-er-hvem", "testUser");

            var relativeFileUrl = "test_directory/should/be/created/deleteme.txt";

            Assert.False(gitRepository.FileExistsByRelativePath(relativeFileUrl));

            await gitRepository.WriteTextByRelativePathAsync(relativeFileUrl, "this file should be here", true);

            Assert.True(gitRepository.FileExistsByRelativePath(relativeFileUrl));

            TestDataHelper.DeleteDirectory(Path.Join(gitRepository.RepositoryDirectory, "test_directory"));
        }

        [Fact]
        public void FileExistsByRelativePath_FileDontExits_ShouldReturnFalse()
        {
            var gitRepository = GetTestRepository("ttd", "hvem-er-hvem", "testUser");

            Assert.False(gitRepository.FileExistsByRelativePath("this.dont.exists.schema.json"));
        }

        [Theory]
        [InlineData(@"App/models/HvemErHvem.json")]
        [InlineData(@"App\models\HvemErHvem.json")]
        [InlineData(@"/App/models/HvemErHvem.json")]
        [InlineData(@"\App\models\HvemErHvem.json")]
        public void FileExistsByRelativePath_FileExits_ShouldReturnTrue(string relativePath)
        {
            var gitRepository = GetTestRepository("ttd", "hvem-er-hvem", "testUser");

            Assert.True(gitRepository.FileExistsByRelativePath(relativePath));
        }

        [Fact]
        public void CopyRepository_DirectoryAlreadyExists_AllFilesSuccessfullyCopied()
        {
            // Arrange
            string targetPath = TestDataHelper.CreateEmptyDirectory("cloneDirectory");
            var gitRepository = GetTestRepository("ttd", "hvem-er-hvem", "testUser");

            try
            {
                // Act
                gitRepository.CopyRepository(targetPath);
                int actualFileCount = Directory.GetFiles(targetPath, "*", SearchOption.AllDirectories).Length;

                // Assert
                int expectedFileCount = Directory.GetFiles(gitRepository.RepositoryDirectory, "*", SearchOption.AllDirectories).Length;

                Assert.Equal(expectedFileCount, actualFileCount);
            }
            finally
            {
                Directory.Delete(targetPath, true);
            }
        }

        [Fact]
        public void CopyRepository_DirDoestNotExists_DirCreatedAndFilesCopied()
        {
            // Arrange
            string targetPath = $"{TestDataHelper.GetTestDataRepositoriesRootDirectory()}/newClonedApp";
            var gitRepository = GetTestRepository("ttd", "hvem-er-hvem", "testUser");

            try
            {
                // Act
                gitRepository.CopyRepository(targetPath);
                int actualFileCount = Directory.GetFiles(targetPath, "*", SearchOption.AllDirectories).Length;

                // Assert
                int expectedFileCount = Directory.GetFiles(gitRepository.RepositoryDirectory, "*", SearchOption.AllDirectories).Length;

                Assert.True(Directory.Exists(targetPath));
                Assert.Equal(expectedFileCount, actualFileCount);
            }
            finally
            {
                Directory.Delete(targetPath, true);
            }
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
