export interface Step { title: string; detail: string; code: string }
export interface LessonMeta {
  title: string; english: string; summary: string; insight: string; stage: number; steps: Step[]
}
export interface Lesson extends LessonMeta {
  id: string; number: string; html: string; text: string; minutes: number;
  headings: { id: string; title: string }[]; files: string[]
}
export interface SourceFile { path: string; raw: string; html: string; lines: number }
export interface Guide { id: string; title: string; html: string; headings: { id: string; title: string }[] }
export interface Course { lessons: Lesson[]; files: Record<string, SourceFile>; guides: Guide[] }
