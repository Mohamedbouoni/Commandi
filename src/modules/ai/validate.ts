// =============================================================================
// LLM Output Parsing
// =============================================================================
// Free/open models are less strict about JSON than paid ones: they wrap output
// in markdown fences, add a sentence around it, or leave trailing commas.
// =============================================================================

/** Removes commas directly before } or ], leaving string contents untouched. */
function stripTrailingCommas(json: string): string {
  let out = "";
  let inString = false;
  for (let i = 0; i < json.length; i++) {
    const ch = json[i]!;
    if (inString) {
      out += ch;
      if (ch === "\\") out += json[++i] ?? "";
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    if (ch === ",") {
      const next = json.slice(i + 1).match(/^\s*([}\]])/);
      if (next) continue;
    }
    out += ch;
  }
  return out;
}

export function extractJson(rawText: string): unknown {
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const body = fenced?.[1] ?? trimmed;

  try {
    return JSON.parse(body);
  } catch {
    // Some models add a sentence before/after the object — take the outermost braces
    const start = body.indexOf("{");
    const end = body.lastIndexOf("}");
    if (start === -1 || end <= start) throw new SyntaxError("No JSON object in model output.");
    const object = body.slice(start, end + 1);
    try {
      return JSON.parse(object);
    } catch {
      // Free models often leave a trailing comma before } or ]
      return JSON.parse(stripTrailingCommas(object));
    }
  }
}
