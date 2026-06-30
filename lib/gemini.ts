import { GoogleGenAI } from "@google/genai";

let geminiClient: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    const useVertex = process.env.USE_VERTEX === 'true' || !key;

    if (useVertex) {
      console.log("[Gemini Client] Initializing in GCP Vertex AI mode...");
      geminiClient = new GoogleGenAI({
        vertexai: true,
        project: process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'diya-task-planner-os',
        location: process.env.GCP_LOCATION || 'asia-south1'
      });
    } else {
      console.log("[Gemini Client] Initializing in Developer AI Studio mode...");
      geminiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return geminiClient;
}

/**
 * Executes a generateContent call with intelligent model-level fallback and retries.
 * If gemini-3.5-flash is experiencing 503 high demand or other API failures,
 * we try gemini-flash-latest, followed by gemini-3.1-flash-lite.
 */
export async function generateWithFallback(
  ai: GoogleGenAI,
  params: {
    model?: string;
    contents: any;
    config?: any;
  }
) {
  const modelsToTry = [
    params.model || 'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-2.5-pro',
    'gemini-1.5-pro',
    'gemini-3.1-pro-preview'
  ];

  // Remove duplicates while preserving order
  const uniqueModels = Array.from(new Set(modelsToTry));

  let lastError: any = null;

  for (let i = 0; i < uniqueModels.length; i++) {
    const currentModel = uniqueModels[i];
    try {
      console.log(`[Gemini API] Attempting generateContent with model: ${currentModel} (Attempt ${i + 1}/${uniqueModels.length})`);
      const response = await ai.models.generateContent({
        ...params,
        model: currentModel,
      });
      console.log(`[Gemini API] Success using model: ${currentModel}`);

      // Inject the model that successfully completed the request
      (response as any).modelUsed = currentModel;

      return response;
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || '';
      console.warn(`[Gemini API] Failed with model ${currentModel}:`, errMsg);

      // If it is the last model, we break
      if (i === uniqueModels.length - 1) {
        break;
      }

      console.log(`[Gemini API] Falling back from ${currentModel} to next available model...`);
      // Add a tiny delay (100ms) before retry
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  throw lastError;
}
