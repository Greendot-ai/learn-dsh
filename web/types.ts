export interface Step { title: string; detail: string; code: string }
export interface LessonMeta {
  title: string; english: string; summary: string; insight: string; stage: number; steps: Step[]
}
export interface Lesson extends LessonMeta {
  id: string; number: string; raw: string; minutes: number; files: string[]
}
export interface SourceFile { path: string; raw: string; lines: number }
export interface Guide { id: string; path: string; title: string; raw: string }
export interface Course { lessons: Lesson[]; files: Record<string, SourceFile>; guides: Guide[] }
