import { getServiceClient } from "@/lib/supabase";

export type MLScanLogInput = {
  visitId?: string;
  customerId?: string;
  genderHint?: string;
  preferences?: Record<string, unknown>;
  features?: Record<string, unknown>;
  geminiAnalysis: Record<string, unknown>;
  latencyMs?: number;
  engineUsed?: "gemini" | "catboost" | "hybrid";
};

export type MLBarberFeedbackInput = {
  scanLogId?: string;
  visitId?: string;
  correctedFaceShape?: string;
  correctedHairTexture?: string;
  correctedHairDensity?: string;
  correctedHairLength?: string;
  correctedTopCm?: number;
  correctedSideCm?: number;
  correctedNapeCm?: number;
  chosenStyle: string;
  relevanceGrade?: number; // 0 to 3 for LightGBM LambdaMART
  customerRating?: number;
  barberNotes?: string;
};

/**
 * Fire-and-forget logger to record scans for CatBoost/LightGBM training.
 * Catches all errors internally so it NEVER fails the main user request.
 */
export async function logScanForTraining(input: MLScanLogInput): Promise<string | null> {
  try {
    if (!process.env.SUPABASE_SERVICE_KEY) return null;
    const client = getServiceClient();

    const { data, error } = await client
      .from("ml_scan_logs")
      .insert({
        visit_id: input.visitId || null,
        customer_id: input.customerId || null,
        gender_hint: input.genderHint || null,
        preferences: input.preferences || null,
        features: input.features || null,
        gemini_analysis: input.geminiAnalysis,
        latency_ms: input.latencyMs || null,
        engine_used: input.engineUsed || "gemini",
      })
      .select("id")
      .single();

    if (error) {
      console.warn("[mlLogger] Failed to log scan (non-fatal):", error.message);
      return null;
    }

    return data?.id ?? null;
  } catch (err) {
    console.warn("[mlLogger] Exception in logScanForTraining (non-fatal):", err);
    return null;
  }
}

/**
 * Records ground-truth feedback when a barber selects a style or overrides attributes.
 */
export async function logBarberFeedback(input: MLBarberFeedbackInput): Promise<boolean> {
  try {
    if (!process.env.SUPABASE_SERVICE_KEY) return false;
    const client = getServiceClient();

    const { error } = await client.from("ml_barber_feedback").insert({
      scan_log_id: input.scanLogId || null,
      visit_id: input.visitId || null,
      corrected_face_shape: input.correctedFaceShape || null,
      corrected_hair_texture: input.correctedHairTexture || null,
      corrected_hair_density: input.correctedHairDensity || null,
      corrected_hair_length: input.correctedHairLength || null,
      corrected_top_cm: input.correctedTopCm ?? null,
      corrected_side_cm: input.correctedSideCm ?? null,
      corrected_nape_cm: input.correctedNapeCm ?? null,
      chosen_style: input.chosenStyle,
      relevance_grade: input.relevanceGrade ?? 2,
      customer_rating: input.customerRating ?? null,
      barber_notes: input.barberNotes || null,
    });

    if (error) {
      console.warn("[mlLogger] Failed to log feedback (non-fatal):", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[mlLogger] Exception in logBarberFeedback (non-fatal):", err);
    return false;
  }
}
