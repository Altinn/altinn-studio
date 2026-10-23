using Acornima;
using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration;

/// <summary>
/// Lowers pure conditional functions to one expression, preserving assignments and return paths.
/// </summary>
public class JavaScriptExpressionParser
{
    public ParseResult ParseFunction(string functionCode)
    {
        try
        {
            var program = new Parser().ParseScript("(" + functionCode.Trim().TrimEnd(';') + "\n)");
            if (program.Body.Count != 1)
                throw new NotSupportedException("Expected one function");
            IFunction? function = program.Body[0] switch
            {
                FunctionDeclaration declaration => declaration,
                ExpressionStatement { Expression: FunctionExpression expression } => expression,
                ExpressionStatement { Expression: ArrowFunctionExpression arrow } => arrow,
                _ => null,
            };
            if (function == null || function.Async || function.Generator)
                throw new NotSupportedException("Expected a synchronous, non-generator function");
            if (function.Params.Count > 1 || (function.Params.Count == 1 && function.Params[0] is not Identifier))
                throw new NotSupportedException("Only one plain object parameter is supported");
            var parameter = function.Params.Count == 1 ? ((Identifier)function.Params[0]).Name : "obj";
            var statements = function.Body switch
            {
                BlockStatement block => block.Body.ToList(),
                Expression expression => [new ReturnStatement(expression)],
                _ => throw new NotSupportedException("Unsupported function body"),
            };
            var declarations = new HashSet<string>(StringComparer.Ordinal);
            CollectDeclarations(statements, declarations, parameter);
            var evaluated = new List<Expression>();
            var loweredStatements = 0;
            var expressionResult = Lower(statements, new Dictionary<string, Expression>(StringComparer.Ordinal));
            EnsureExpressionSize(expressionResult);
            foreach (var initializer in evaluated)
                EnsureExpressionSize(initializer);
            return new ParseResult
            {
                Success = true,
                ReturnExpression = expressionResult,
                ObjectParameterName = parameter,
                OriginalCode = functionCode,
                AllStatements = statements,
                EvaluatedExpressions = evaluated,
            };

            Expression Resolve(
                Expression expression,
                Dictionary<string, Expression> values,
                bool validateEvaluation = false
            )
            {
                var resolved =
                    new ValueSubstitution(values, declarations, parameter).Visit(expression) as Expression
                    ?? throw new NotSupportedException("Could not substitute expression");
                if (validateEvaluation)
                    evaluated.Add(resolved);
                return resolved;
            }

            Expression Lower(List<Statement> remaining, Dictionary<string, Expression> values)
            {
                for (var index = 0; index < remaining.Count; index++)
                {
                    if (++loweredStatements > 2000)
                        throw new NotSupportedException("Conditional rule has too many control-flow paths");
                    var statement = remaining[index];
                    switch (statement)
                    {
                        case EmptyStatement:
                            break;
                        case ReturnStatement result:
                            return result.Argument == null
                                ? new Identifier("undefined")
                                : Resolve(result.Argument, values);
                        case VariableDeclaration declaration:
                            foreach (var binding in declaration.Declarations)
                            {
                                if (binding.Id is Identifier identifier)
                                {
                                    if (binding.Init != null)
                                        values[identifier.Name] = Resolve(binding.Init, values, true);
                                }
                                else if (
                                    binding.Id is ObjectPattern pattern
                                    && binding.Init is Identifier source
                                    && source.Name == parameter
                                )
                                {
                                    foreach (var property in pattern.Properties)
                                    {
                                        if (
                                            property
                                            is not Property
                                            {
                                                Computed: false,
                                                Key: Identifier key,
                                                Value: Identifier local
                                            }
                                        )
                                            throw new NotSupportedException(
                                                "Only plain object destructuring is supported"
                                            );
                                        values[local.Name] = Resolve(
                                            new MemberExpression(source, key, false, false),
                                            values
                                        );
                                    }
                                }
                                else
                                    throw new NotSupportedException("Unsupported variable declaration");
                            }
                            break;
                        case ExpressionStatement { Expression: AssignmentExpression assignment }:
                            if (assignment.Operator != Operator.Assignment)
                                throw new NotSupportedException(
                                    "Compound assignments in conditional rules are not supported"
                                );
                            var assignmentKey = AssignmentKey(assignment.Left, parameter);
                            if (
                                assignmentKey == null
                                || (assignment.Left is Identifier && !declarations.Contains(assignmentKey))
                            )
                                throw new NotSupportedException(
                                    "Conditional rules cannot assign to global variables or replace their object parameter"
                                );
                            values[assignmentKey] = Resolve(assignment.Right, values, true);
                            break;
                        case IfStatement branch:
                            var test = Resolve(branch.Test, values);
                            var tail = remaining.Skip(index + 1).ToList();
                            var whenTrue = Lower(
                                BranchStatements(branch.Consequent).Concat(tail).ToList(),
                                new(values, StringComparer.Ordinal)
                            );
                            var whenFalse = Lower(
                                BranchStatements(branch.Alternate).Concat(tail).ToList(),
                                new(values, StringComparer.Ordinal)
                            );
                            return new ConditionalExpression(test, whenTrue, whenFalse);
                        case BlockStatement block:
                            return Lower(block.Body.Concat(remaining.Skip(index + 1)).ToList(), values);
                        default:
                            throw new NotSupportedException(
                                $"Unsupported conditional-rule statement: {statement.Type}"
                            );
                    }
                }
                // The caller converts the result to a boolean, so implicit undefined remains falsy.
                return new Identifier("undefined");
            }
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            return new ParseResult
            {
                Success = false,
                ErrorMessage = $"Could not lower conditional function: {exception.Message}",
                OriginalCode = functionCode,
            };
        }
    }

    private static IEnumerable<Statement> BranchStatements(Statement? statement) =>
        statement switch
        {
            null => [],
            BlockStatement block => block.Body,
            _ => [statement],
        };

    private static void EnsureExpressionSize(Expression expression)
    {
        var pending = new Stack<(Node Node, int Depth)>();
        pending.Push((expression, 0));
        var count = 0;
        while (pending.TryPop(out var current))
        {
            // Substituted locals can share an expression DAG. Count its expanded size,
            // since a short series of x = x || x doubles the eventual JSON each time.
            if (++count > 8000 || current.Depth > 48)
                throw new NotSupportedException("Expanded conditional expression exceeds the size limit");
            foreach (var child in current.Node.ChildNodes)
                pending.Push((child, current.Depth + 1));
        }
    }

    private static void CollectDeclarations(IEnumerable<Statement> statements, HashSet<string> names, string parameter)
    {
        foreach (var statement in statements)
        {
            switch (statement)
            {
                case VariableDeclaration declaration:
                    foreach (var binding in declaration.Declarations)
                    {
                        var locals = binding.Id switch
                        {
                            Identifier identifier => new[] { identifier.Name },
                            ObjectPattern pattern => pattern
                                .Properties.OfType<Property>()
                                .Select(property => (property.Value as Identifier)?.Name),
                            _ => throw new NotSupportedException("Unsupported variable binding"),
                        };
                        foreach (var local in locals)
                            if (local == null || local == parameter || !names.Add(local))
                                throw new NotSupportedException(
                                    "Shadowed or repeated variable declarations require manual conversion"
                                );
                    }
                    break;
                case IfStatement branch:
                    CollectDeclarations(BranchStatements(branch.Consequent), names, parameter);
                    CollectDeclarations(BranchStatements(branch.Alternate), names, parameter);
                    break;
                case BlockStatement block:
                    CollectDeclarations(block.Body, names, parameter);
                    break;
            }
        }
    }

    private static string? AssignmentKey(Node node, string parameter) =>
        node switch
        {
            Identifier identifier when identifier.Name != parameter => identifier.Name,
            MemberExpression { Object: Identifier source, Computed: false, Property: Identifier property }
                when source.Name == parameter => parameter + "." + property.Name,
            MemberExpression { Object: Identifier source, Computed: true, Property: StringLiteral property }
                when source.Name == parameter => parameter + "." + property.Value,
            _ => null,
        };

    private sealed class ValueSubstitution(
        Dictionary<string, Expression> values,
        HashSet<string> declarations,
        string parameter
    ) : AstRewriter
    {
        protected override object VisitIdentifier(Identifier node)
        {
            if (values.TryGetValue(node.Name, out var value))
                return value;
            if (declarations.Contains(node.Name))
                throw new NotSupportedException($"Variable '{node.Name}' is read before assignment");
            return node;
        }

        protected override object VisitMemberExpression(MemberExpression node)
        {
            var key = AssignmentKey(node, parameter);
            if (key != null && values.TryGetValue(key, out var value))
                return value;
            var resolved = new MemberExpression(
                Visit(node.Object) as Expression
                    ?? throw new NotSupportedException("Could not substitute member object"),
                node.Computed
                    ? Visit(node.Property) as Expression
                        ?? throw new NotSupportedException("Could not substitute computed property")
                    : node.Property,
                node.Computed,
                node.Optional
            );
            // An alias of the input object keeps its reference when a property changes.
            // Scalar aliases were already replaced above, so they keep their earlier value.
            key = AssignmentKey(resolved, parameter);
            return key != null && values.TryGetValue(key, out value) ? value : resolved;
        }

        protected override object VisitCallExpression(CallExpression node)
        {
            if (
                node.Callee is not MemberExpression { Computed: false, Property: Identifier method }
                || (
                    method.Name is not ("includes" or "indexOf" or "endsWith")
                    && node.Callee
                        is not MemberExpression { Object: Identifier { Name: "conditionalRuleHandlerObject" } }
                )
            )
                throw new NotSupportedException("Only pure string searches and conditional helper calls are supported");
            if (
                node.Callee is MemberExpression { Object: Identifier { Name: "conditionalRuleHandlerObject" } }
                && values.Keys.Any(key => key.StartsWith(parameter + ".", StringComparison.Ordinal))
            )
                throw new NotSupportedException(
                    "A helper called after changing its input object requires manual conversion"
                );
            return base.VisitCallExpression(node)
                ?? throw new NotSupportedException("Could not substitute call expression");
        }

        protected override object VisitAssignmentExpression(AssignmentExpression node) =>
            throw new NotSupportedException("Assignments inside expressions are not supported");

        protected override object VisitUnaryExpression(UnaryExpression node) =>
            node is UpdateExpression
                ? throw new NotSupportedException("Updates inside expressions are not supported")
                : base.VisitUnaryExpression(node)
                    ?? throw new NotSupportedException("Could not substitute unary expression");

        protected override object VisitNewExpression(NewExpression node) =>
            throw new NotSupportedException("Object construction is not supported");

        protected override object VisitSequenceExpression(SequenceExpression node) =>
            throw new NotSupportedException("Sequence expressions are not supported");

        protected override object VisitFunctionExpression(FunctionExpression node) =>
            throw new NotSupportedException("Local functions are not supported in conditional rules");

        protected override object VisitArrowFunctionExpression(ArrowFunctionExpression node) =>
            throw new NotSupportedException("Local functions are not supported in conditional rules");
    }
}

public class ParseResult
{
    public bool Success { get; set; }
    public Expression? ReturnExpression { get; set; }
    public string ObjectParameterName { get; set; } = "obj";
    public string? ErrorMessage { get; set; }
    public string OriginalCode { get; set; } = string.Empty;
    public List<Statement>? AllStatements { get; set; }
    public List<Expression> EvaluatedExpressions { get; set; } = [];
    public Dictionary<string, string> VariableMappings { get; set; } = new();
}
