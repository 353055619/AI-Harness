# algo-coach MCP 工具参考

> 参数名和类型严格对应 algo-coach-mcp 0.3.0 的 JSON Schema。

## get_topic_roadmap

获取可用主题列表和学习路线图。

- 参数：无
- 返回：`{ topics: [{ id, name, order, problemCount }] }`

## get_theory

获取指定主题的理论基础文章。

- 参数：`topic` (string, required) — 可选值：array / linked-list / hash-table / string / two-pointers / stack-queue / binary-tree / backtracking / greedy / dynamic-programming / monotonic-stack / graph
- 返回：`{ topic, content }`

## pick_problem

从指定主题中随机选取一道练习题。

- 参数：
  - `topic` (string, optional) — 可选值同 get_theory
  - `difficulty` (string, optional) — 可选值：easy / medium / hard
- 返回：`{ slug, title, number, difficulty, topic, leetcodeSlug, description, algorithms, signatures }`

## generate_test_cases

为指定题目生成测试用例。

- 参数：`slug` (string, required) — 题目 slug，使用 pick_problem 返回的 slug 字段原值（如 `"0001.两数之和"`）
- 返回：`{ problemSlug, functionName, cases: [{ input, expected, description, category }] }`

## run_user_code

执行用户提交的 Python 代码并验证结果。

- 参数：
  - `code` (string, required) — 用户完整 Python 代码（含辅助函数和数据结构定义）
  - `functionName` (string, required) — 被测函数名（必须是独立函数，非类方法）
  - `testCases` (array, required) — 测试用例数组，每个元素：`{ input: any[], expected: any, description?: string, category?: string }`
  - `language` (string, optional) — 目前仅支持 `"python"`
  - `timeoutMs` (number, optional) — 超时毫秒数，默认 5000
- 返回：`{ passed, totalCases, passedCases, failedCase?, stdout, stderr, timeMs }`

## get_solution

获取代码随想录的参考解法。

- 参数：
  - `slug` (string, required) — 题目 slug（如 `"0001.两数之和"`）
  - `language` (string, optional) — 可选值：python / java / cpp / go / javascript / typescript，默认 python
- 返回：`{ slug, title, language, code, availableLanguages, keyPoints }`

## get_real_world_cases

获取算法在实际工程中的应用案例。

- 参数：`algorithm` (string, required) — 算法英文 slug（如 `"hash-table"`、`"binary-search"`）
- 返回：`{ algorithm, cases: [{ title, domain, description, codeSnippet?, sourceProject }] }`
