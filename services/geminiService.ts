
import { GoogleGenAI, Type } from "@google/genai";
import { Heir, CalculationResult } from "../types";

/**
 * Uses Gemini API to perform complex Islamic inheritance (Faraid) calculations.
 */
export const getGeminiCalculation = async (heirs: Heir[], deceasedGender: 'Male' | 'Female'): Promise<CalculationResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Calculate Islamic inheritance (Faraid) shares for a deceased ${deceasedGender}.
  List of heirs and their counts: ${heirs.map(h => `${h.count} ${h.type}`).join(', ')}.
  
  Please ensure the calculation follows standard Islamic jurisprudence (e.g., Shafi'i or Hanafi rules).
  Identify the fixed shares (Zawil Furud) and the residuaries (Asaba).
  Provide the result labels in Malayalam language.
  
  Return ONLY a JSON object matching this schema:
  {
    "shares": [{"label": "Malayalam name of heir", "fraction": "e.g. 1/6", "percentage": "e.g. 16.67%"}],
    "complex": true,
    "warnings": ["Specific rules or conditions applied"]
  }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            shares: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  fraction: { type: Type.STRING },
                  percentage: { type: Type.STRING }
                },
                required: ["label", "fraction", "percentage"]
              }
            },
            complex: { type: Type.BOOLEAN },
            warnings: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["shares", "complex", "warnings"]
        }
      },
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response from Gemini");
    
    return JSON.parse(resultText.trim());
  } catch (error) {
    console.error("Gemini Calculation failed:", error);
    throw error;
  }
};

export const testConnection = async () => true;
