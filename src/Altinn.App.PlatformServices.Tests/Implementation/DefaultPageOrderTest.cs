using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Common.Models;
using Altinn.App.PlatformServices.Models;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;
using Moq;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Implementation
{
    public class DefaultPageOrderTest
    {
        private readonly Mock<IAltinnApp> altinnAppMock;
        private readonly Mock<IAppResources> appResourcesMock;

        public DefaultPageOrderTest()
        {
            altinnAppMock = new Mock<IAltinnApp>();
            appResourcesMock = new Mock<IAppResources>();
        }

        [Fact]
        public async Task GetPageOrder_Returns_PageOrder_From_IAltinnApp()
        {
            // Arrange
            AppIdentifier appIdentifier = new AppIdentifier("ttd", "best-app");
            Guid guid = Guid.NewGuid();
            InstanceIdentifier instanceIdentifier = new InstanceIdentifier(1337, guid);
            string layoutSetId = "layoutSetId";
            string currentPage = "currentPage";
            string dataTypeId = "dataTypeId";
            object formData = new object();

            List<string> expected = new List<string> { "page1", "page2" };
            altinnAppMock.Setup(aa => aa.GetPageOrder("ttd", "best-app", 1337, guid, layoutSetId, currentPage, dataTypeId, formData)).Returns(Task.FromResult(expected));

            // Act
            DefaultPageOrder target = new DefaultPageOrder(altinnAppMock.Object, appResourcesMock.Object);

            List<string> actual = await target.GetPageOrder(appIdentifier, instanceIdentifier, layoutSetId, currentPage, dataTypeId, formData);

            // Assert
            Assert.Equal(expected, actual);
            altinnAppMock.Verify(aa => aa.GetPageOrder("ttd", "best-app", 1337, guid, layoutSetId, currentPage, dataTypeId, formData), Times.Once);
            appResourcesMock.VerifyNoOtherCalls();
            altinnAppMock.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task GetPageOrder_Returns_LayoutSettingsForSet_when_NoInstance_and_layoutSetId_is_defined()
        {
            // Arrange
            AppIdentifier appIdentifier = new AppIdentifier("ttd", "best-app");
            Guid guid = Guid.NewGuid();
            InstanceIdentifier instanceIdentifier = InstanceIdentifier.NoInstance;
            string layoutSetId = "layoutSetId";
            string currentPage = "page1";
            string dataTypeId = "dataTypeId";
            object formData = new object();

            List<string> expected = new List<string> { "page2", "page3" };
            appResourcesMock.Setup(ar => ar.GetLayoutSettingsForSet(layoutSetId)).Returns(new LayoutSettings { Pages = new Pages { Order = expected } });

            // Act
            DefaultPageOrder target = new DefaultPageOrder(altinnAppMock.Object, appResourcesMock.Object);

            List<string> actual = await target.GetPageOrder(appIdentifier, instanceIdentifier, layoutSetId, currentPage, dataTypeId, formData);

            // Assert
            Assert.Equal(expected, actual);
            appResourcesMock.Verify(ar => ar.GetLayoutSettingsForSet(layoutSetId), Times.Once);
            altinnAppMock.VerifyNoOtherCalls();
            appResourcesMock.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task GetPageOrder_Returns_LayoutSettings_when_NoInstance_and_layoutSetId_is_null()
        {
            // Arrange
            AppIdentifier appIdentifier = new AppIdentifier("ttd", "best-app");
            Guid guid = Guid.NewGuid();
            InstanceIdentifier instanceIdentifier = InstanceIdentifier.NoInstance;
            string layoutSetId = null;
            string currentPage = "page1";
            string dataTypeId = "dataTypeId";
            object formData = new object();

            List<string> expected = new List<string> { "page2", "page3" };
            appResourcesMock.Setup(ar => ar.GetLayoutSettings()).Returns(new LayoutSettings { Pages = new Pages { Order = expected } });

            // Act
            DefaultPageOrder target = new DefaultPageOrder(altinnAppMock.Object, appResourcesMock.Object);

            List<string> actual = await target.GetPageOrder(appIdentifier, instanceIdentifier, layoutSetId, currentPage, dataTypeId, formData);

            // Assert
            Assert.Equal(expected, actual);
            appResourcesMock.Verify(ar => ar.GetLayoutSettings(), Times.Once);
            altinnAppMock.VerifyNoOtherCalls();
            appResourcesMock.VerifyNoOtherCalls();
        }
    }
}