import { pgTable, varchar, text, timestamp, serial, index, jsonb, integer, unique, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const documents = pgTable("documents", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	filename: varchar({ length: 255 }).notNull(),
	fileUrl: text("file_url").notNull(),
	uploadedAt: timestamp("uploaded_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const questions = pgTable("questions", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	content: text().notNull(),
	type: varchar({ length: 20 }).notNull(),
	options: jsonb(),
	correctAnswer: text("correct_answer").notNull(),
	sourceDocument: text("source_document"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("questions_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const scoreRecords = pgTable("score_records", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	userId: varchar("user_id", { length: 36 }).notNull(),
	questionId: varchar("question_id", { length: 36 }).notNull(),
	isCorrect: integer("is_correct").notNull(),
	scoreChange: integer("score_change").notNull(),
	userAnswer: text("user_answer").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("score_records_question_id_idx").using("btree", table.questionId.asc().nullsLast().op("text_ops")),
	index("score_records_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const users = pgTable("users", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	username: varchar({ length: 100 }).notNull(),
	password: varchar({ length: 255 }).notNull(),
	role: varchar({ length: 20 }).default('student').notNull(),
	totalScore: integer("total_score").default(0).notNull(),
	cozeApiKey: text("coze_api_key"),
	volcengineApiKey: text("volcengine_api_key"), // 火山方舟 API Key ID
	cozePatToken: text("coze_pat_token"), // 扣子 PAT 令牌
	selectedDocument: text("selected_document"),
	sequentialMode: boolean("sequential_mode").default(false),
	currentParagraphIndex: integer("current_paragraph_index").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("users_role_idx").using("btree", table.role.asc().nullsLast().op("text_ops")),
	index("users_username_idx").using("btree", table.username.asc().nullsLast().op("text_ops")),
	unique("users_username_unique").on(table.username),
]);
