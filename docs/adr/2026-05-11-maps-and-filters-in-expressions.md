# Support mapping and filtering in Altinn Studio expressions

- Status: Accepted
- Deciders: Altinn Studio squad Data
- Date: 11.05.2026

## Result

We have chosen alternative A6, using the JMESPath standard. We will first implement the variant with a separate,
source-independent function. Then we will need to discuss further on how to extend the `dataModel` and `component`
functions in a way that keeps the support for row context.

## Problem context

Altinn Studio supports a JSON-based expression language which runs in both backend and frontend. Currently, this
language only supports handling primitive values (strings, numbers and booleans). We have been requested to add list and
object support to make it possible to run functions with lists as input, such as sum and average. But those functions
are not sufficient by themselves. It must also be possible for the user to extract the list from a list of objects,
implying that we need to support mapping and filtering.

## Decision drivers

- **B1:** The solution should support projection (mapping).
- **B2:** It should support filtering.
- **B3:** It should theoretically (that is to say, not considering memory limits) support selection of data from
  composite objects and lists with an unlimited number of levels.
- **B4:** There should be no considerable risk for different outcomes in frontend and backend.
- **B5:** There must be a way to perform the extraction based on context data in repeating groups.
- **B6:** It should be convenient to implement and maintain.
- **B7:** It should not need to depend on lambda functions. (This might be considered 'nice to have' since there is a
  strong likelihood we will need lambda functions at some point anyway. However, that introduces a whole new area of
  decisions requiring careful consideration. Therefore, this point is crucial for finishing on time.)
- **B8:** Nice to have: It should be easily readable.
- **B9:** Nice to have: It should work on any list and object from any source, including hard-coded values.
- **B10:** Nice to have: It should not introduce new dependencies.
- **B11:** Nice to have: It should fit well together with the current `dataModel` selection syntax.
- **B12:** Nice to have: It should support "group by" operations.

## Alternatives considered

- **A1:** Function for mapping a list of objects to a single property. Example:
  ```json
  [
    "pluck",
    ["list", { "name": "Ola", "city": "Oslo" }, { "name": "Kari", "city": "Hamar" }],
    "name"
  ]
  ```
  returns
  ```json
  ["Ola", "Kari"]
  ```
- **A2:** Map and filter functions with lambda functions as input parameters. Example:
  ```json
  [
    "filter",
    ["list", { "name": "Ola", "city": "Oslo" }, { "name": "Kari", "city": "Hamar" }],
    ["Lambda function for filtering goes here. We still need to agree on some syntax for this."]
  ]
  ```
- **A3:** String formatted mapping using a syntax we define by ourselves.

  Example extracting names from a list of people in the `dataModel` function:

  ```json
  ["dataModel", "listOfPeople.name"]
  ```

  Example as separate function:

  ```json
  [
    "query",
    ["list", { "name": "Ola", "city": "Oslo" }, { "name": "Kari", "city": "Hamar" }],
    "name"
  ]
  ```

- **A4:** String formatted mapping and filtering using a syntax we define by ourselves.

  Example extracting names of people aged 18 years or older in the `dataModel` function:

  ```json
  ["dataModel", "listOfPeople[ageInYears>=18].name"]
  ```

  Example as separate function:

  ```json
  [
    "query",
    [
      "list",
      { "name": "Ola", "city": "Oslo", "ageInYears": 17 },
      { "name": "Kari", "city": "Hamar", "ageInYears": 18 }
    ],
    "[ageInYears>=18].name"
  ]
  ```

- **A5:** String formatted syntax using [the JSONPath standard](https://www.rfc-editor.org/rfc/rfc9535).

  Example in the `dataModel` function:

  ```json
  ["dataModel", "$.listOfPeople[?@.ageInYears>=18].name"]
  ```

  Example as separate function:

  ```json
  [
    "jsonpath",
    [
      "list",
      { "name": "Ola", "city": "Oslo", "ageInYears": 17 },
      { "name": "Kari", "city": "Hamar", "ageInYears": 18 }
    ],
    "$[?@.ageInYears>=18].name"
  ]
  ```

- **A6:** String formatted syntax using [the JMESPath standard](https://jmespath.org/).

  Example in the `dataModel` function:

  ```json
  ["dataModel", "listOfPeople[?ageInYears>=`18`].name"]
  ```

  Example as separate function:

  ```json
  [
    "jmespath",
    [
      "list",
      { "name": "Ola", "city": "Oslo", "ageInYears": 17 },
      { "name": "Kari", "city": "Hamar", "ageInYears": 18 }
    ],
    "[?ageInYears>=`18`].name"
  ]
  ```

- **A7:** String formatted syntax using [the JSONata standard](https://jsonata.org/).

  Example in the `dataModel` function:

  ```json
  ["dataModel", "listOfPeople[ageInYears>=18].name"]
  ```

  Example as separate function:

  ```json
  [
    "jsonata",
    [
      "list",
      { "name": "Ola", "city": "Oslo", "ageInYears": 17 },
      { "name": "Kari", "city": "Hamar", "ageInYears": 18 }
    ],
    "$[ageInYears>=18].name"
  ]
  ```

## Pros and cons

### A1

- Good: Adheres to B1, B4, B5, B6, B7, B8, B9, B10 and B11.
- Bad: It does not fulfill B2, B3 or B12.

### A2

- Good: Adheres to B1, B2, B3, B4, B5, B6, B9, B10 and B11.
- Bad: It does not fulfill B7, meaning we cannot implement this before we have developed a specification for lambda
  functions.
- Bad: It probably does not fulfill B8.
  - No matter what syntax we choose for lambda functions, the expressions will quickly become very verbose, particularly
    when nesting several map and filter functions together.
- Neutral: This alternative does not support B12 by itself, but having it in place, it should be fairly easy to add this
  functionality as well.

### A3

- Good: Adheres to B1, B3, B4, B5, B7, B8, B9, B10 and B11.
- Bad: It does not fulfill B2 (unless we implement filtering with lambda functions, which eliminates B7) or B12.
- Neutral: Fulfills B6 given that we have decided on the string syntax.

### A4

- Good: Adheres to B1, B2, B3, B4, B5, B7, B8, B9, B10 and B11.
- Bad: Does not fulfill B6.
  - We need to create a specification for the string syntax.
  - We need to implement a new way to write comparison expressions that we already have.
- Bad: Does not fulfill B12.

### A5

- Good: Adheres to B1, B2, B3, B6, B7, B8 and B9.
- Bad: Does not fulfill B4.
  - [Lack of consensus on certain features makes libraries treat the queries differently.](https://cburgmer.github.io/json-path-comparison/)
- Neutral: Does not fulfill B5 in the sense that it is not possible to define custom functions, but we may solve this by
  preprocessing. The use case may also be resolved by combining an isolated `jsonpath` function with the `component`
  function.
- Bad: Does not fulfill B10.
  - Introduces new dependencies and subdependencies in frontend and backend.
- Bad: Does not fulfill B11.
  - Our `dataModel` selection syntax is similar, but there are slight differences (in particular when considering row
    context). This means we need to find a convenient way to merge them together if we want to extend the `dataModel`
    and `component` functions with this syntax.
- Bad: Does not fulfill B12.

### A6

- Good: Adheres to B1, B2, B3, B6, B7, B8, B9 and B12.
- Good: Fulfills B4.
  - It has had an unambiguous specification from the very beginning and a compliance test suite that libraries must
    pass.
- Neutral: Does not fulfill B5 in the sense that it is not possible to define custom functions, but we may solve this by
  preprocessing. The use case may also be resolved by combining an isolated `jmespath` function with the `component`
  function.
- Bad: Does not fulfill B10.
  - Good: [The Javascript library](https://www.npmjs.com/package/jmespath) has no subdependencies.
  - Bad: [The Nuget package](https://www.nuget.org/packages/JmesPath.Net) depends on `Newtonsoft.Json`, which we are in
    the process of replacing with `System.Text.Json`.
- Bad: Does not fulfill B11.
  - Our `dataModel` selection syntax is similar, but there are slight differences (in particular when considering row
    context). This means we need to find a convenient way to merge them together if we want to extend the `dataModel`
    and `component` functions with this syntax.

### A7

- Good: Adheres to B1, B2, B3, B6, B7, B8, B9 and B12.
- Neutral: Does not fully support B4, but:
  - [The Javascript library](https://www.npmjs.com/package/jsonata) is the official one
  - [The maintainers of the C# library are planning to fix the few ways it currently differs from the Javascript library](https://github.com/mikhail-barg/jsonata.net.native#jsonata-language-features-support)
- Good: Fulfills B5.
  - We may define a custom function for this.
- Bad: Does not fulfill B10.
  - Good: [The Javascript library](https://www.npmjs.com/package/jsonata) has no subdependencies.
  - Bad: [The Nuget package](https://www.nuget.org/packages/Jsonata.Net.Native) depends on `Newtonsoft.Json`, which we
    are in the process of replacing with `System.Text.Json`.
- Bad: Does not fulfill B11.
  - Our `dataModel` selection syntax is similar, but there are slight differences (in particular when considering row
    context). This means we need to find a convenient way to merge them together if we want to extend the `dataModel`
    and `component` functions with this syntax.
- Bad: Not as widely established in the industry as JSONPath and JMESPath.
- Bad: Comes with an extensive set of functionality that we do not need or that our expression language already
  supports. (But we might consider using this as a replacement for our entire expression language.)

### Table

| Decision driver | A1  | A2  | A3  | A4  | A5  | A6  | A7  |
| --------------- | --- | --- | --- | --- | --- | --- | --- |
| B1              | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   |
| B2              | ✗   | ✓   | ✗   | ✓   | ✓   | ✓   | ✓   |
| B3              | ✗   | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   |
| B4              | ✓   | ✓   | ✓   | ✓   | ✗   | ✓   | —   |
| B5              | ✓   | ✓   | ✓   | ✓   | —   | —   | ✓   |
| B6              | ✓   | ✓   | —   | ✗   | ✓   | ✓   | ✓   |
| B7              | ✓   | ✗   | ✓   | ✓   | ✓   | ✓   | ✓   |
| B8              | ✓   | ✗   | ✓   | ✓   | ✓   | ✓   | ✓   |
| B9              | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   |
| B10             | ✓   | ✓   | ✓   | ✓   | ✗   | ✗   | ✗   |
| B11             | ✓   | ✓   | ✓   | ✓   | ✗   | ✗   | ✗   |
| B12             | ✗   | —   | ✗   | ✗   | ✗   | ✓   | ✓   |
