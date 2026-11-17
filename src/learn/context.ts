import { createContext, useContext } from 'react';
import type { Settings } from '../lib/storage';

export interface LearnApi {
  /** Switch to a trainer section with the given settings (the patch includes `section`). */
  openPractice(patch: Partial<Settings>): void;
  openLesson(id: string): void;
}

export const LearnContext = createContext<LearnApi>({ openPractice() {}, openLesson() {} });
export const useLearn = () => useContext(LearnContext);
