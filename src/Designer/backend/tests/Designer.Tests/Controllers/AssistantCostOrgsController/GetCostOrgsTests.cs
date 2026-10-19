using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Evaluators;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;
using CostOrg = Altinn.Studio.Designer.Controllers.AssistantCostOrgsController.AssistantCostOrg;

namespace Designer.Tests.Controllers.AssistantCostOrgsController;

public class GetCostOrgsTests
{
    [Fact]
    public async Task GetCostOrgs_ReturnsEligibleOrganizations()
    {
        var evaluator = new Mock<ICanUseAiAssistantEvaluator>();
        evaluator
            .Setup(e => e.GetEligibleCostOrgsAsync())
            .ReturnsAsync(
                new List<Organization> { new(username: "ttd", fullName: "Testdepartementet"), new(username: "nfk") }
            );
        var controller = new Altinn.Studio.Designer.Controllers.AssistantCostOrgsController(evaluator.Object);

        var result = await controller.GetCostOrgs();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var costOrgs = Assert.IsAssignableFrom<IEnumerable<CostOrg>>(okResult.Value).ToList();
        Assert.Equal([new CostOrg("ttd", "Testdepartementet"), new CostOrg("nfk", null)], costOrgs);
    }
}
