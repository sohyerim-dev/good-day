import { User } from "@/types/user";
import { create } from "zustand";

interface UserStore {
  user: User | null;
  // AuthProvider가 Supabase에서 user를 가져온 후 true로 변경됨
  // false인 동안은 user가 아직 로드되지 않은 상태 → user에 의존하는 동작(저장 버튼 등)을 비활성화하는 데 사용
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
