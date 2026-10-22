import { useEffect, useRef } from 'react';

export const MAIN_TRACKS = [
  { src: '/bgm.mp3', startAt: 20 },
];

export const PONG_TRACKS = [
  { src: '/jonasblakewood-synthwave-driving-618634.mp3', startAt: 0 },
];

// 인스턴스별 오디오 객체 전역 보관
const store = {};

function getStore(key) {
  if (!store[key]) store[key] = { audio: null };
  return store[key];
}

function killAudio(key) {
  const s = getStore(key);
  if (s.audio) {
    s.audio.onended = null;
    s.audio.pause();
    s.audio.src = '';
    s.audio = null;
  }
}

function startAudio(key, tracks, volume) {
  killAudio(key);
  const s     = getStore(key);
  const track = tracks[Math.floor(Math.random() * tracks.length)];
  const audio = new Audio(track.src);
  audio.loop   = false;
  audio.volume = 0;
  s.audio = audio;

  if (track.startAt > 0) {
    audio.addEventListener('loadedmetadata', () => {
      if (audio.currentTime < track.startAt) audio.currentTime = track.startAt;
    }, { once: true });
  }

  audio.onended = () => startAudio(key, tracks, volume);

  const doPlay = () => {
    audio.play()
      .then(() => {
        // 페이드인
        const fade = setInterval(() => {
          if (!s.audio || s.audio !== audio) { clearInterval(fade); return; }
          audio.volume = Math.min(audio.volume + 0.02, volume);
          if (audio.volume >= volume) clearInterval(fade);
        }, 50);
      })
      .catch(() => {});
  };

  audio.play().then(() => {
    const fade = setInterval(() => {
      if (!s.audio || s.audio !== audio) { clearInterval(fade); return; }
      audio.volume = Math.min(audio.volume + 0.02, volume);
      if (audio.volume >= volume) clearInterval(fade);
    }, 50);
  }).catch(() => {
    const retry = () => { doPlay(); document.removeEventListener('click', retry); document.removeEventListener('keydown', retry); };
    document.addEventListener('click',   retry, { once: true });
    document.addEventListener('keydown', retry, { once: true });
  });
}

export default function useBgm(volume = 0.28, active = true, instanceKey = 'main', tracks = MAIN_TRACKS) {
  const prevActive = useRef(null);

  useEffect(() => {
    if (active && prevActive.current !== true) {
      startAudio(instanceKey, tracks, volume);
    } else if (!active && prevActive.current !== false) {
      killAudio(instanceKey);
    }
    prevActive.current = active;
  }, [active, instanceKey, volume]);

  // 언마운트 시 정지
  useEffect(() => {
    return () => {
      killAudio(instanceKey);
      prevActive.current = null;
    };
  }, [instanceKey]);
}
