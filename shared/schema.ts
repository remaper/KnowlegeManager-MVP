import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
});

// Documents
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(),
  category: text("category"),
  summary: text("summary"),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  userId: true,
  title: true,
  filename: true,
  fileType: true,
  category: true,
  summary: true,
  content: true,
});

// Tags
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const insertTagSchema = createInsertSchema(tags).pick({
  name: true,
});

// Document Tags (many-to-many relationship)
export const documentTags = pgTable("document_tags", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  tagId: integer("tag_id").notNull(),
});

export const insertDocumentTagSchema = createInsertSchema(documentTags).pick({
  documentId: true,
  tagId: true,
});

// Semantic Links (document relationships)
export const semanticLinks = pgTable("semantic_links", {
  id: serial("id").primaryKey(),
  sourceDocumentId: integer("source_document_id").notNull(),
  targetDocumentId: integer("target_document_id").notNull(),
  linkType: text("link_type").notNull(), // citation, reference, related, etc.
  strength: integer("strength").default(1),
});

export const insertSemanticLinkSchema = createInsertSchema(semanticLinks).pick({
  sourceDocumentId: true,
  targetDocumentId: true,
  linkType: true,
  strength: true,
});

// Ontology
export const ontologies = pgTable("ontologies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  structure: jsonb("structure").notNull(), // JSON structure of concepts and relationships
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOntologySchema = createInsertSchema(ontologies).pick({
  userId: true,
  name: true,
  structure: true,
});

// Priorities (user tasks)
export const priorities = pgTable("priorities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPrioritySchema = createInsertSchema(priorities).pick({
  userId: true,
  title: true,
  description: true,
  dueDate: true,
  completed: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;

export type DocumentTag = typeof documentTags.$inferSelect;
export type InsertDocumentTag = z.infer<typeof insertDocumentTagSchema>;

export type SemanticLink = typeof semanticLinks.$inferSelect;
export type InsertSemanticLink = z.infer<typeof insertSemanticLinkSchema>;

export type Ontology = typeof ontologies.$inferSelect;
export type InsertOntology = z.infer<typeof insertOntologySchema>;

export type Priority = typeof priorities.$inferSelect;
export type InsertPriority = z.infer<typeof insertPrioritySchema>;

export interface DocumentWithTags extends Document {
  tags: Tag[];
}
