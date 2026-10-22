import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CapturedPhoto } from "@/components/CameraCapture";
import { HairAnalysis } from "@/components/HairAIAutomation";

type CurrentCustomer = {
  name: string;
  phone: string;
  gender?: "male" | "female" | "other";
  acceptedTerms?: boolean;
  /** customers.id once the row exists in Supabase. */
  id?: string;
};

type Session = {
  id?: string;
  customer: CurrentCustomer;
  photos: CapturedPhoto[];
  analysis: HairAnalysis | null;
  savedStyles: { styleName: string; imageUrl: string }[];
};

type SalonProfile = {
  id: string;
  salon_name: string;
  city: string;
  plan_tier: string;
};

type Store = {
  profile: SalonProfile | null;
  setProfile: (p: SalonProfile | null) => void;

  currentCustomer: CurrentCustomer | null;
  setCurrentCustomer: (c: CurrentCustomer | null) => void;

  currentSession: Session | null;
  setCurrentSession: (s: Session | null) => void;
  updateSessionAnalysis: (analysis: HairAnalysis, photos: CapturedPhoto[]) => void;
  addSavedStyle: (styleName: string, imageUrl: string) => void;

  /** visits.id for the visit in progress — photos and checkout hang off this. */
  currentVisitId: string | null;
  setCurrentVisitId: (id: string | null) => void;

  /** barbers.id chosen for the current scan — attributed on the visit. */
  currentBarberId: string | null;
  setCurrentBarberId: (id: string | null) => void;
};

export const useStore = create<Store>()(
  persist(
    (set) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),

      currentCustomer: null,
      setCurrentCustomer: (currentCustomer) => set({ currentCustomer }),

      currentVisitId: null,
      setCurrentVisitId: (currentVisitId) => set({ currentVisitId }),

      currentBarberId: null,
      setCurrentBarberId: (currentBarberId) => set({ currentBarberId }),

      currentSession: null,
      setCurrentSession: (currentSession) => set({ currentSession }),
      updateSessionAnalysis: (analysis, photos) =>
        set((s) => ({
          currentSession: s.currentSession
            ? { ...s.currentSession, analysis, photos }
            : {
                customer: s.currentCustomer ?? { name: "Walk-in Guest", phone: "9999999999" },
                analysis,
                photos,
                savedStyles: [],
              },
        })),
      addSavedStyle: (styleName, imageUrl) =>
        set((s) => ({
          currentSession: s.currentSession
            ? {
                ...s.currentSession,
                savedStyles: [...s.currentSession.savedStyles, { styleName, imageUrl }],
              }
            : null,
        })),
    }),
    {
      name: "trimview-client-session",
      storage: createJSONStorage(() => ({
        getItem: (name: string) => {
          try {
            return typeof window !== "undefined" ? localStorage.getItem(name) : null;
          } catch {
            return null;
          }
        },
        setItem: (name: string, value: string) => {
          try {
            if (typeof window !== "undefined") localStorage.setItem(name, value);
          } catch (e) {
            console.warn("[store] Storage quota exceeded, skipping non-essential persist:", e);
          }
        },
        removeItem: (name: string) => {
          try {
            if (typeof window !== "undefined") localStorage.removeItem(name);
          } catch {
            // ignore
          }
        },
      })),
      partialize: (state) => ({
        profile: state.profile,
        currentCustomer: state.currentCustomer,
        currentVisitId: state.currentVisitId,
        currentBarberId: state.currentBarberId,
        currentSession: state.currentSession
          ? {
              customer: state.currentSession.customer,
              analysis: state.currentSession.analysis,
              savedStyles: state.currentSession.savedStyles,
              // Strip heavy base64 strings so they never exceed the 5MB browser quota.
              // Persistent storage in Supabase Storage holds the full images.
              photos: (state.currentSession.photos || []).map((p) => ({
                label: p.label,
                mediaType: p.mediaType,
                preview: p.preview?.startsWith("http") ? p.preview : "",
                base64: "",
              })),
            }
          : null,
      }),
    }
  )
);
