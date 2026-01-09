
import { GoogleGenAI, Type } from "@google/genai";

const getClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const COUNSELOR_SYSTEM_INSTRUCTION = `
You are the "Islamic Inheritance Assistant (Faraid Malayalam)" Counselor. 
Your goal is to guide the user through the process of listing assets and heirs for Islamic inheritance according to Shafi'i Fiqh (commonly followed in Kerala).
Respond in a mix of Malayalam and English (Manglish/Malayalam script) as appropriate for a Kerala audience.
Be respectful, compassionate, and precise with Islamic terminology (e.g., Faraid, Asaba, Zawil Furud).
Do not perform final mathematical calculations of shares yourself; instead, help the user ensure their data is correct.
If the user asks about a specific relative, explain their general eligibility.
Keep responses concise and supportive.
`;

const ENGINE_SYSTEM_INSTRUCTION = `
ROLE / PERSONA:
You are an Islamic Faraid (Inheritance) Knowledge Engine. 
Your sole task is to calculate shares based on family data and return structured JSON.

STRICT BEHAVIOR RULES:
- OUTPUT MUST BE VALID JSON ONLY. No preamble, no post-text, no commentary.
- NO RELIGIOUS OPINIONS, FATWAS, OR EXTRA COMMENTARY.
- DO NOT say "Allah knows best" or similar.
- IF DATA IS INSUFFICIENT OR INVALID (e.g. no survivors or impossible family structure like a husband for a male deceased), return validation: "invalid" and a short technical reason.

INHERITANCE ALLOCATION RULES:
1. Husband: 1/2 if no children/grandchildren. 1/4 if they exist.
2. Wife/Wives: 1/4 if no children/grandchildren. 1/8 collectively if they exist.
3. Father: 
   - 1/6 if sons exist.
   - 1/6 (fixed) + Residuary if only daughters exist.
   - Residuary (entire remainder) if no children exist.
4. Mother: 1/6 if children exist OR if there are 2 or more siblings. Otherwise 1/3.
5. Daughters: 1/2 if only one. 2/3 collectively if 2 or more (if no sons). If sons exist, daughters share the remainder with sons in 2:1 ratio (Male:Female).
6. Sons: Always take the remainder as residuaries (Asaba). If daughters exist, they share the residue in 2:1 ratio.
7. Maternal Siblings (Uterine): 1/6 if one. 1/3 collectively if 2 or more. Only inherit if no children and no male ascendants (Father/Grandfather).
8. Full Siblings: Residuaries if no father and no sons. Male:Female = 2:1 ratio.

BLOCKING (EXCLUSION) RULES:
- Father blocks ALL Siblings (Full, Consanguine, Uterine) and the Paternal Grandfather.
- Father blocks Grandfather.
- Mother blocks the Maternal Grandmother.
- Sons block ALL Siblings and further descendants.
- Blocked heirs MUST be moved to the 'excluded_heirs' array and receive NO share.

OUTPUT SCHEMA (STRICT JSON):
{
  "eligible_heirs": ["List of heirs who receive a share"],
  "excluded_heirs": ["List of heirs provided in input but are blocked"],
  "shares": {
    "Heir Type": "Fraction (e.g., 1/8) or 'Residuary'"
  },
  "fraction_math": "Detailed mathematical explanation of common denominators and remainder distribution.",
  "distribution_notes": "Technical notes on the specific rules applied for this case.",
  "validation": "valid" | "invalid",
  "reason": "Technical reason string required ONLY if validation is 'invalid'."
}

EXAMPLE CASE:
Input: { "gender": "female", "husband": 1, "daughters": 1, "father": 1, "mother": 1 }
Output: {
  "eligible_heirs": ["Husband", "Daughter", "Mother", "Father"],
  "excluded_heirs": [],
  "shares": {
    "Husband": "1/4",
    "Daughter": "1/2",
    "Mother": "1/6",
    "Father": "Residuary"
  },
  "fraction_math": "Fixed shares: Husband (1/4) + Daughter (1/2) + Mother (1/6). Common denominator 12: (3/12) + (6/12) + (2/12) = 11/12. Remainder (1/12) goes to Father as Residuary. Father also has 1/6 (2/12) base share if daughters exist. Total for Father = 2/12 + 1/12 = 3/12 = 1/4.",
  "validation": "valid"
}
`;

export const sendFaraidMessage = async (prompt: string, context?: string) => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: context ? `Context: ${context}\n\nUser: ${prompt}` : prompt,
      config: {
        systemInstruction: COUNSELOR_SYSTEM_INSTRUCTION,
      }
    });
    return response.text || "ക്ഷമിക്കണം, എനിക്ക് മറുപടി നൽകാൻ സാധിച്ചില്ല. (Sorry, I couldn't respond.)";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const calculateInheritance = async (input: any) => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: JSON.stringify(input),
      config: {
        systemInstruction: ENGINE_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            eligible_heirs: { type: Type.ARRAY, items: { type: Type.STRING } },
            excluded_heirs: { type: Type.ARRAY, items: { type: Type.STRING } },
            shares: { 
              type: Type.OBJECT,
              properties: {},
              additionalProperties: { type: Type.STRING }
            },
            fraction_math: { type: Type.STRING },
            distribution_notes: { type: Type.STRING },
            validation: { type: Type.STRING, enum: ["valid", "invalid"] },
            reason: { type: Type.STRING }
          },
          required: ["eligible_heirs", "excluded_heirs", "shares", "fraction_math", "distribution_notes", "validation"]
        }
      }
    });

    const text = response.text || "{}";
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Calculation Engine Error:", error);
    return { 
      validation: "invalid", 
      reason: "API connection error.", 
      eligible_heirs: [], 
      excluded_heirs: [], 
      shares: {}, 
      fraction_math: "", 
      distribution_notes: "" 
    };
  }
};

export const testConnection = async () => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'Assalamu Alaikum',
    });
    return !!response.text;
  } catch (error) {
    return false;
  }
};
