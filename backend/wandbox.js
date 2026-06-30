export const COMPILERS = {
    cpp: "gcc-head",
    python: "cpython-head",
    javascript: "nodejs-20.17.0",
    csharp: "mono-6.12.0.199"
};

export const fetchWithRetry = async (url, options, maxRetries = 3, timeoutMs = 10000) => {
    for (let i = 0; i < maxRetries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const fetchOptions = { ...options, signal: controller.signal };
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);
            if (response.status === 429) throw new Error('Rate Limited');
            return response;
        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                throw new Error('TIMEOUT');
            }
            if (i === maxRetries - 1) throw err;
            const waitTime = Math.pow(2, i) * 1000;
            console.log(`Wandbox API rate limit. Retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
};

export const generateTestScript = (userCode, testCases, language) => {
    if (language === 'cpp') {
        let script = `#include <iostream>\n#include <string>\n#include <exception>\n\n${userCode}\n// --- Server Test Environment ---\nint main() {\n`;
        testCases.forEach((test, i) => {
            script += `  try {\n    auto res${i} = solve(${test.input});\n    if (res${i} == ${test.expected}) {\n      std::cout << "[TEST] ${i + 1}|PASS" << std::endl;\n    } else {\n      std::cout << "[TEST] ${i + 1}|FAIL|Expected: ${test.expected} | Got: " << res${i} << std::endl;\n    }\n  } catch (const std::exception& e) {\n    std::cout << "[TEST] ${i + 1}|ERROR|" << e.what() << std::endl;\n  } catch (...) {\n    std::cout << "[TEST] ${i + 1}|ERROR|Unknown exception" << std::endl;\n  }\n`;
        });
        script += `  return 0;\n}\n`;
        return script;
    } else if (language === 'python') {
        let script = `${userCode}\n\n# --- Server Test Environment ---\nif __name__ == '__main__':\n`;
        testCases.forEach((test, i) => {
            script += `    try:\n        res${i} = solve(${test.input})\n        if res${i} == ${test.expected}:\n            print("[TEST] ${i + 1}|PASS")\n        else:\n            print(f"[TEST] ${i + 1}|FAIL|Expected: ${test.expected} | Got: {res${i}}")\n    except Exception as e:\n        print(f"[TEST] ${i + 1}|ERROR|{e}")\n`;
        });
        return script;
    } else if (language === 'javascript') {
        let script = `${userCode}\n\n// --- Server Test Environment ---\n`;
        testCases.forEach((test, i) => {
            script += `try {\n    let res${i} = solve(${test.input});\n    if (res${i} === ${test.expected}) {\n        console.log("[TEST] ${i + 1}|PASS");\n    } else {\n        console.log("[TEST] ${i + 1}|FAIL|Expected: ${test.expected} | Got: " + res${i});\n    }\n} catch (e) {\n    console.log("[TEST] ${i + 1}|ERROR|" + e.message);\n}\n`;
        });
        return script;
    } else if (language === 'csharp') {
        let script = `${userCode}\n\n// --- Server Test Environment ---\npublic class ServerTestEnvironment {\n  public static void Main() {\n`;
        testCases.forEach((test, i) => {
            script += `    try {\n      var res${i} = Solution.solve(${test.input});\n      if (res${i}.Equals(${test.expected})) {\n        System.Console.WriteLine("[TEST] ${i + 1}|PASS");\n      } else {\n        System.Console.WriteLine("[TEST] ${i + 1}|FAIL|Expected: ${test.expected} | Got: " + res${i});\n      }\n    } catch (System.Exception e) {\n      System.Console.WriteLine("[TEST] ${i + 1}|ERROR|" + e.Message);\n    }\n`;
        });
        script += `  }\n}\n`;
        return script;
    }
    return userCode;
};

export const executeCodeOnWandbox = async (code, language) => {
    const compiler = COMPILERS[language];
    if (!compiler) throw new Error("Unsupported language");

    const response = await fetchWithRetry('https://wandbox.org/api/compile.json', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            compiler: compiler,
            code: code,
            save: false
        })
    });

    if (!response.ok) {
        throw new Error('Wandbox API execution failed');
    }

    return await response.json();
};
