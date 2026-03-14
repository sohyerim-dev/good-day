import { User } from "@/types/user";
import { create, StateCreator } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface UserStoreState {
  user: User | null;
  setUser: (user: User | null) => void;
  resetUser: () => void;
}

// 로그인한 사용자 정보를 관리하는 스토어 생성
// StateCreator: Zustand의 유틸리티 타입으로, set 함수의 타입을 자동으로 추론해줌
// 복잡한 타입 정의 없이도 set 함수가 올바른 타입으로 인식됨

const UserStore: StateCreator<UserStoreState> = (set) => ({
  user: null,
  setUser: (user: User | null) => set({ user }),
  resetUser: () => set({ user: null }),
});

// 스토리지를 사용하지 않을 경우
// const useUserStore = create<UserStoreState>(UserStore);

// 스토리지를 사용할 경우 (sessionStorage에 저장)
const useUserStore = create<UserStoreState>()(
  persist(UserStore, {
    name: "user",
    storage: createJSONStorage(() => sessionStorage), //기본은 localStorage
  }),
);

export default useUserStore;
