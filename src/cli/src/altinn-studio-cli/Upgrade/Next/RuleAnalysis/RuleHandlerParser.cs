using Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis.Models;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis;

/// <summary>
/// Parses RuleHandler.js files to extract function implementations
/// </summary>
internal class RuleHandlerParser
{
    private readonly string _ruleHandlerPath;
    private readonly Dictionary<string, JavaScriptFunction> _conditionalFunctions = new();
    private readonly Dictionary<string, JavaScriptFunction> _dataProcessingFunctions = new();

    public RuleHandlerParser(string ruleHandlerPath)
    {
        _ruleHandlerPath = ruleHandlerPath;
    }

    /// <summary>
    /// Parse the RuleHandler.js file
    /// </summary>
    public void Parse()
    {
        if (!File.Exists(_ruleHandlerPath))
        {
            // It's okay if the file doesn't exist - some layout sets may not have it
            return;
        }

        var jsContent = File.ReadAllText(_ruleHandlerPath);

        // Extract conditional rendering functions
        ExtractFunctionsFromObject(jsContent, "conditionalRuleHandlerObject", _conditionalFunctions);

        // Extract data processing functions
        ExtractFunctionsFromObject(jsContent, "ruleHandlerObject", _dataProcessingFunctions);
    }

    /// <summary>
    /// Get conditional rendering function by name
    /// </summary>
    public JavaScriptFunction? GetConditionalFunction(string functionName)
    {
        return _conditionalFunctions.GetValueOrDefault(functionName);
    }

    /// <summary>
    /// Get data processing function by name
    /// </summary>
    public JavaScriptFunction? GetDataProcessingFunction(string functionName)
    {
        return _dataProcessingFunctions.GetValueOrDefault(functionName);
    }

    /// <summary>
    /// Extract functions from a JavaScript object declaration
    /// </summary>
    private void ExtractFunctionsFromObject(
        string jsContent,
        string objectName,
        Dictionary<string, JavaScriptFunction> targetDict
    )
    {
        // Find the object declaration
        var objectPattern = $"var {objectName} = {{";
        var objectStart = jsContent.IndexOf(objectPattern);
        if (objectStart == -1)
        {
            return; // Object not found
        }

        // Find the closing brace of the object
        var objectEnd = FindMatchingBrace(jsContent, objectStart + objectPattern.Length - 1);
        if (objectEnd == -1)
        {
            return;
        }

        var objectContent = jsContent.Substring(
            objectStart + objectPattern.Length,
            objectEnd - (objectStart + objectPattern.Length)
        );

        // Extract each function
        ExtractFunctions(objectContent, targetDict);
    }

    /// <summary>
    /// Extract individual functions from object content
    /// </summary>
    private void ExtractFunctions(string objectContent, Dictionary<string, JavaScriptFunction> targetDict)
    {
        var pos = 0;
        while (pos < objectContent.Length)
        {
            // Look for pattern: functionName: function(paramName) {
            var functionMatch = FindNextFunction(objectContent, pos);
            if (functionMatch == null)
            {
                break;
            }

            targetDict[functionMatch.Name] = functionMatch;
            pos = functionMatch.EndPosition;
        }
    }

    /// <summary>
    /// Find the next function in the content
    /// </summary>
    private FunctionMatch? FindNextFunction(string content, int startPos)
    {
        // Look for pattern: identifier: function(param) {
        var colonPos = content.IndexOf(':', startPos);
        if (colonPos == -1)
        {
            return null;
        }

        // Extract function name (work backwards from colon)
        var nameStart = colonPos - 1;
        while (nameStart >= startPos && char.IsWhiteSpace(content[nameStart]))
        {
            nameStart--;
        }
        var nameEnd = nameStart;
        while (
            nameStart >= startPos
            && (char.IsLetterOrDigit(content[nameStart]) || content[nameStart] == '_' || content[nameStart] == '$')
        )
        {
            nameStart--;
        }
        nameStart++;

        if (nameStart > nameEnd || nameStart < startPos)
        {
            // Not a valid function name, try next colon
            return FindNextFunction(content, colonPos + 1);
        }

        var functionName = content.Substring(nameStart, nameEnd - nameStart + 1);

        // Look for "function(" after the colon
        var afterColon = colonPos + 1;
        while (afterColon < content.Length && char.IsWhiteSpace(content[afterColon]))
        {
            afterColon++;
        }

        if (!content.Substring(afterColon).StartsWith("function"))
        {
            // Not a function, try next
            return FindNextFunction(content, colonPos + 1);
        }

        // Find the opening paren
        var parenStart = content.IndexOf('(', afterColon);
        if (parenStart == -1)
        {
            return FindNextFunction(content, colonPos + 1);
        }

        // Find the closing paren to get parameter name
        var parenEnd = content.IndexOf(')', parenStart);
        if (parenEnd == -1)
        {
            return FindNextFunction(content, colonPos + 1);
        }

        var paramName = content.Substring(parenStart + 1, parenEnd - parenStart - 1).Trim();

        // Find the opening brace of function body
        var braceStart = content.IndexOf('{', parenEnd);
        if (braceStart == -1)
        {
            return FindNextFunction(content, colonPos + 1);
        }

        // Find matching closing brace
        var braceEnd = FindMatchingBrace(content, braceStart);
        if (braceEnd == -1)
        {
            return FindNextFunction(content, colonPos + 1);
        }

        // Extract the full function implementation
        var functionImpl = "function(" + paramName + ") " + content.Substring(braceStart, braceEnd - braceStart + 1);

        return new FunctionMatch
        {
            Name = functionName,
            Implementation = functionImpl,
            ParameterName = paramName,
            EndPosition = braceEnd + 1,
        };
    }

    /// <summary>
    /// Find the matching closing brace for an opening brace
    /// </summary>
    private int FindMatchingBrace(string content, int openBracePos)
    {
        var depth = 1;
        var pos = openBracePos + 1;
        var inString = false;
        var stringChar = '\0';
        var inComment = false;
        var inLineComment = false;

        while (pos < content.Length && depth > 0)
        {
            var ch = content[pos];
            var prevCh = pos > 0 ? content[pos - 1] : '\0';

            // Handle string literals
            if (!inComment && !inLineComment && (ch == '"' || ch == '\''))
            {
                if (!inString)
                {
                    inString = true;
                    stringChar = ch;
                }
                else if (ch == stringChar && prevCh != '\\')
                {
                    inString = false;
                }
            }

            // Handle comments
            if (!inString)
            {
                if (ch == '/' && pos + 1 < content.Length)
                {
                    if (content[pos + 1] == '*')
                    {
                        inComment = true;
                        pos++;
                    }
                    else if (content[pos + 1] == '/')
                    {
                        inLineComment = true;
                        pos++;
                    }
                }
                else if (inComment && ch == '*' && pos + 1 < content.Length && content[pos + 1] == '/')
                {
                    inComment = false;
                    pos++;
                }
                else if (inLineComment && ch == '\n')
                {
                    inLineComment = false;
                }
            }

            // Count braces only when not in string or comment
            if (!inString && !inComment && !inLineComment)
            {
                if (ch == '{')
                {
                    depth++;
                }
                else if (ch == '}')
                {
                    depth--;
                }
            }

            pos++;
        }

        return depth == 0 ? pos - 1 : -1;
    }

    private class FunctionMatch : JavaScriptFunction
    {
        public int EndPosition { get; set; }
    }
}
