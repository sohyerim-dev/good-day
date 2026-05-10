import { User } from "@/types/user";
import { create } from "zustand";

interface UserStore {
  user: User | null;
  hasHydrated: boolean;
  setUser: (user: User | null) => void;
  setHasHydrated: (v: boolean) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  hasHydrated: false,
  setUser: (user) => set({ user }),
  setHasHydrated: (v) => set({ hasHydrated: v }),
}));

// 풀어서 쓰면
// create<UserStore>(function(set) {
//   return {
//     user: null,
//     setUser: function(user) {
//       set({ user });
//     },
//   };
// });
