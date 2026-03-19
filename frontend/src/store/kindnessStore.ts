import { create } from "zustand";
import type { KindnessRecord, UserProfile } from "../hooks/useSorobanContract";

// ─── State shape ──────────────────────────────────────────────────────────────

interface KindnessState {
    records: KindnessRecord[];
    activeProfile: UserProfile | null;
    walletAddress: string | null;

    // Actions
    setWalletAddress: (address: string | null) => void;
    addRecord: (record: KindnessRecord) => void;
    setRecords: (records: KindnessRecord[]) => void;
    setActiveProfile: (profile: UserProfile | null) => void;
    clearStore: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useKindnessStore = create<KindnessState>((set) => ({
    records: [],
    activeProfile: null,
    walletAddress: null,

    setWalletAddress: (address) => set({ walletAddress: address }),

    addRecord: (record) =>
        set((state) => ({
            records: [record, ...state.records],
        })),

    setRecords: (records) => set({ records }),

    setActiveProfile: (profile) => set({ activeProfile: profile }),

    clearStore: () =>
        set({ records: [], activeProfile: null, walletAddress: null }),
}));
