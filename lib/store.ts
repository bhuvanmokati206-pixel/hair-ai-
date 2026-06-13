import { create } from "zustand";
import { CapturedPhoto } from "@/components/CameraCapture";
import { HairAnalysis } from "@/components/HairAIAutomation";

type CurrentCustomer = {
  name: string;
  phone: string;
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
};

export const useStore = create<Store>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),

  currentCustomer: null,
  setCurrentCustomer: (currentCustomer) => set({ currentCustomer }),

  currentSession: null,
  setCurrentSession: (currentSession) => set({ currentSession }),
  updateSessionAnalysis: (analysis, photos) =>
    set((s) => ({
      currentSession: s.currentSession
        ? { ...s.currentSession, analysis, photos }
        : null,
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
}));
