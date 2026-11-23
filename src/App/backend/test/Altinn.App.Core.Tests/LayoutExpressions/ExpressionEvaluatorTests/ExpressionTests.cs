using System.Text.Json;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;

namespace Altinn.App.Core.Tests.LayoutExpressions.ExpressionEvaluatorTests;

public class ExpressionTests
{
    [Theory]
    [InlineData("""["multiply", ["divide", 10, 1e-28], 1e-28]""")]
    [InlineData("""["multiply", ["divide", 7.922816251426434e27, 0.1], 0.1]""")]
    [InlineData("""["multiply", 1e20, 1e10]""")]
    public async Task Arithmetic_RejectsIntermediateDecimalOverflow(string json)
    {
        // Finite JavaScript results can still require intermediates outside decimal's range.
        // Such calculations must stay in the upgrader's C# fallback.
        var expression = JsonSerializer.Deserialize<Expression>(json);

        var exception = await Assert.ThrowsAsync<ExpressionEvaluatorTypeErrorException>(() =>
            EvaluateLiteral(expression)
        );

        Assert.StartsWith("Arithmetic overflow:", exception.Message);
    }

    [Theory]
    [InlineData("""["multiply", ["divide", 1e-28, 10], 1e28]""", 0d)]
    [InlineData("""["multiply", ["divide", 3e-28, 2], 1e28]""", 2d)]
    [InlineData("""["multiply", ["divide", 1e-28, 1], 1e28]""", 1d)]
    public async Task Division_RoundsIntermediateResultsToDecimalPrecision(string json, double expected)
    {
        var expression = JsonSerializer.Deserialize<Expression>(json);

        var result = await EvaluateLiteral(expression);

        Assert.Equal(expected, Assert.IsType<double>(result));
    }

    [Fact]
    public async Task Division_WithLiteralBelowDecimalPrecision_Throws()
    {
        var expression = JsonSerializer.Deserialize<Expression>("""["divide", 0.1, 1e-29]""");

        var exception = await Assert.ThrowsAsync<ExpressionEvaluatorTypeErrorException>(() =>
            EvaluateLiteral(expression)
        );

        Assert.Contains("cannot divide by 0", exception.Message);
    }

    [Fact]
    public async Task Division_OfSmallRepresentableDecimals_ReturnsOne()
    {
        var expression = JsonSerializer.Deserialize<Expression>("""["divide", 1e-28, 1e-28]""");

        var result = await EvaluateLiteral(expression);

        Assert.Equal(1d, Assert.IsType<double>(result));
    }

    private static Task<object?> EvaluateLiteral(Expression expression)
    {
        var accessor = new InstanceDataAccessorFake(
            instance: new(),
            applicationMetadata: null,
            translationService: Moq.Mock.Of<ITranslationService>(),
            layout: null,
            frontEndSettings: new(),
            gatewayAction: null,
            language: null
        );
        return ExpressionEvaluator.EvaluateExpression(
            accessor.GetLayoutEvaluatorState(),
            expression,
            new ComponentContext(accessor, null, null, null)
        );
    }

    [Fact()]
    public void TestExpressionEquality()
    {
        Assert.Throws<NotImplementedException>(() => Expression.Null != Expression.False);
        // Expression expr1 = new Expression(ExpressionFunction.countDataElements, new Expression(5), new Expression(10));
        // Expression expr2 = new Expression(
        //     ExpressionFunction.countDataElements,
        //     [new Expression(5), new Expression(10)]
        // );
        // Expression expr3 = new Expression(ExpressionFunction.countDataElements, new Expression(10));
        // Expression expr4 = new Expression(ExpressionFunction.dataModel, new Expression("test"));
        //
        // Assert.Equal("""["countDataElements",5,10]""", expr1.ToString());
        // Assert.Equal("""["countDataElements",5,10]""", expr2.ToString());
        // Assert.Equal("""["countDataElements",10]""", expr3.ToString());
        // Assert.Equal("""["dataModel","test"]""", expr4.ToString());
        //
        // // compare 1 and 2 (same expressions)
        // Assert.Equal(expr1, expr2);
        // Assert.Equal(expr1.GetHashCode(), expr2.GetHashCode());
        // Assert.True(expr1 == expr2);
        // Assert.False(expr1 != expr2);
        // // compare 1 and 3 (not equal)
        // Assert.NotEqual(expr1, expr3);
        // Assert.True(expr1 != expr3);
        // Assert.False(expr1 == expr3);
        // Assert.NotEqual(expr1.GetHashCode(), expr3.GetHashCode());
        // // compare 1 and 4 (not equal)
        // Assert.NotEqual(expr1, expr4);
        // Assert.True(expr1 != expr4);
        // Assert.False(expr1 == expr4);
        // Assert.NotEqual(expr1.GetHashCode(), expr4.GetHashCode());
        // // compare 2 and 3 (not equal)
        // Assert.NotEqual(expr2, expr3);
        // Assert.True(expr2 != expr3);
        // Assert.False(expr2 == expr3);
        // Assert.NotEqual(expr2.GetHashCode(), expr3.GetHashCode());
        // // compare 2 and 4 (not equal)
        // Assert.NotEqual(expr2, expr4);
        // Assert.True(expr2 != expr4);
        // Assert.False(expr2 == expr4);
        // Assert.NotEqual(expr2.GetHashCode(), expr4.GetHashCode());
        // // compare 3 and 4 (not equal)
        // Assert.NotEqual(expr3, expr4);
        // Assert.True(expr3 != expr4);
        // Assert.False(expr3 == expr4);
        // Assert.NotEqual(expr3.GetHashCode(), expr4.GetHashCode());
        //
        // Assert.False(expr4.Equals(null));
    }

    [Fact]
    public void TestShortcuts()
    {
        var trueExpression = Expression.True;
        Assert.True(trueExpression.ValueUnion.Bool);
        Assert.True(trueExpression.IsLiteralValue);

        var falseExpression = Expression.False;
        Assert.False(falseExpression.ValueUnion.Bool);
        Assert.True(falseExpression.IsLiteralValue);

        var nullExpression = Expression.Null;
        Assert.Equal(JsonValueKind.Null, nullExpression.ValueUnion.ValueKind);
        Assert.True(nullExpression.IsLiteralValue);
    }
}
