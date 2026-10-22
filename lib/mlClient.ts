/**
 * Client for the local CatBoost + LightGBM ML service.
 * Runs on http://127.0.0.1:8001.
 * If the ML server is unreachable, returns null so the caller can fall back to Gemini.
 */

export type MLPredictResult = {
  source: string;
  confidence: number;
  confidences: Record<string, number>;
  analysis: Record<string, unknown>;
};

export async function predictLocalML(params: {
  gender?: string;
  features?: Record<string, unknown>;
}): Promise<MLPredictResult | null> {
  const mlUrl = process.env.LOCAL_ML_URL || "http://127.0.0.1:8001";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s maximum timeout

  try {
    const res = await fetch(`${mlUrl}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gender: params.gender || "male",
        features: params.features || {},
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[localML] Server responded with status ${res.status}`);
      return null;
    }

    const data = (await res.json()) as MLPredictResult;
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    // Server down or offline - non fatal
    console.info("[localML] Local ML server offline or unreachable; using cloud fallback.");
    return null;
  }
}
