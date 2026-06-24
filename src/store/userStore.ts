import { User } from "@/types/user";
import { create } from "zustand";

interface UserStore {
  user: User | null;
  hasHydrated: boolean;
  profileReady: boolean;
  setUser: (user: User | null) => void;
  setHasHydrated: (v: boolean) => void;
  setProfileReady: (v: boolean) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  hasHydrated: false,
  profileReady: false,
  setUser: (user) => set({ user }),
  setHasHydrated: (v) => set({ hasHydrated: v }),
  setProfileReady: (v) => set({ profileReady: v }),
}));
