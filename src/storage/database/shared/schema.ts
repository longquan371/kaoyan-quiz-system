import { pgTable, serial, timestamp, text, varchar, integer, jsonb, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { createSchemaFactory } from "drizzle-zod"

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 用户表
export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    username: varchar("username", { length: 100 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    role: varchar("role", { length: 20 }).notNull().default("student"), // 'student' or 'teacher'
    totalScore: integer("total_score").default(0).notNull(),
    cozeApiKey: text("coze_api_key"), // 学生需要填写豆包API Key
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index("users_username_idx").on(table.username),
    index("users_role_idx").on(table.role),
  ]
);

// 题目表
export const questions = pgTable(
  "questions",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    content: text("content").notNull(), // 题目内容
    type: varchar("type", { length: 20 }).notNull(), // 'choice' 或 'fill'
    options: jsonb("options"), // 选择题的选项：[{label: 'A', text: '选项内容'}, ...]
    correctAnswer: text("correct_answer").notNull(), // 正确答案
    sourceDocument: text("source_document"), // 来源文档
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("questions_type_idx").on(table.type),
  ]
);

// 答题记录表
export const scoreRecords = pgTable(
  "score_records",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 }).notNull(), // 外键：用户ID
    questionId: varchar("question_id", { length: 36 }).notNull(), // 外键：题目ID
    isCorrect: integer("is_correct").notNull(), // 1: 正确, 0: 错误
    scoreChange: integer("score_change").notNull(), // 分数变化
    userAnswer: text("user_answer").notNull(), // 用户答案
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("score_records_user_id_idx").on(table.userId),
    index("score_records_question_id_idx").on(table.questionId),
  ]
);

// 文档表
export const documents = pgTable(
  "documents",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    filename: varchar("filename", { length: 255 }).notNull(),
    fileUrl: text("file_url").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  }
);

// Zod schemas for validation
const { createInsertSchema: createCoercedInsertSchema } = createSchemaFactory({
  coerce: { date: true },
});

export const insertUserSchema = createCoercedInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  cozeApiKey: true,
});

export const insertQuestionSchema = createCoercedInsertSchema(questions).pick({
  content: true,
  type: true,
  options: true,
  correctAnswer: true,
  sourceDocument: true,
});

export const insertScoreRecordSchema = createCoercedInsertSchema(scoreRecords).pick({
  userId: true,
  questionId: true,
  isCorrect: true,
  scoreChange: true,
  userAnswer: true,
});

export const insertDocumentSchema = createCoercedInsertSchema(documents).pick({
  filename: true,
  fileUrl: true,
});

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;

export type ScoreRecord = typeof scoreRecords.$inferSelect;
export type InsertScoreRecord = typeof scoreRecords.$inferInsert;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
