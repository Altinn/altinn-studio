using Altinn.Studio.Designer.Configuration;
using Xunit;

namespace Designer.Tests.Configuration
{
    public class ServiceConfigurationTests
    {
        [Fact]
        public void ServiceConfiguration_CanSetCustomTemplatePath()
        {
            // Arrange & Act
            var config = new ServiceConfiguration
            {
                RepositoryName = "test-repo",
                ServiceName = "test-service", 
                CustomTemplatePath = "/path/to/custom/template"
            };

            // Assert
            Assert.Equal("test-repo", config.RepositoryName);
            Assert.Equal("test-service", config.ServiceName);
            Assert.Equal("/path/to/custom/template", config.CustomTemplatePath);
        }

        [Fact]
        public void ServiceConfiguration_CustomTemplatePathCanBeNull()
        {
            // Arrange & Act
            var config = new ServiceConfiguration
            {
                RepositoryName = "test-repo",
                ServiceName = "test-service", 
                CustomTemplatePath = null
            };

            // Assert
            Assert.Null(config.CustomTemplatePath);
        }

        [Fact]
        public void ServiceConfiguration_CustomTemplatePathCanBeEmpty()
        {
            // Arrange & Act
            var config = new ServiceConfiguration
            {
                RepositoryName = "test-repo",
                ServiceName = "test-service", 
                CustomTemplatePath = ""
            };

            // Assert
            Assert.Equal("", config.CustomTemplatePath);
        }

        [Fact]
        public void ServiceConfiguration_DefaultCustomTemplatePathIsNull()
        {
            // Arrange & Act
            var config = new ServiceConfiguration
            {
                RepositoryName = "test-repo",
                ServiceName = "test-service"
                // CustomTemplatePath not set
            };

            // Assert
            Assert.Null(config.CustomTemplatePath);
        }
    }
}