using System.Text.Json;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Tests.LayoutExpressions.ExpressionEvaluatorTests;

public class ExpressionTests
{
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
        Assert.False(trueExpression.IsFunctionExpression);

        var falseExpression = Expression.False;
        Assert.False(falseExpression.ValueUnion.Bool);
        Assert.False(falseExpression.IsFunctionExpression);

        var nullExpression = Expression.Null;
        Assert.Equal(JsonValueKind.Null, nullExpression.ValueUnion.ValueKind);
        Assert.False(nullExpression.IsFunctionExpression);
    }
}
