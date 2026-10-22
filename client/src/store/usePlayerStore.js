import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const usePlayerStore = create(
  persist(
    (set) => ({
      id: null,
      nickname: '',
      setPlayer: (player) => {
        // Strike Wing이 iframe에서 직접 읽을 수 있도록 별도 키로도 저장
        try { localStorage.setItem('pingpong-player-id', String(player.id)); } catch (e) {}
        set({ id: player.id, nickname: player.nickname });
      },
      clearPlayer: () => {
        try { localStorage.removeItem('pingpong-player-id'); } catch (e) {}
        set({ id: null, nickname: '' });
      },
    }),
    { name: 'pingpong-player' }
  )
);

export default usePlayerStore;
