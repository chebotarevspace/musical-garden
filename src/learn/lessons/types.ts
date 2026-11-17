export interface Lesson {
  id: string;
  part: string;
  title: string;
  /** One sentence shown in the course list. */
  summary: string;
  minutes: number;
  Body: () => JSX.Element;
}
