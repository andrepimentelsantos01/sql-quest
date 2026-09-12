import { useSyncExternalStore } from "react";

const query = "(max-width: 560px), (max-width: 1024px) and (pointer: coarse)";
const getSnapshot = () => window.matchMedia(query).matches;
const subscribe = (notify) => {
  const media = window.matchMedia(query);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};

export default function useMobileLayout() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
