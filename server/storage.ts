import { 
  User, InsertUser, 
  Document, InsertDocument, 
  Tag, InsertTag, 
  DocumentTag, InsertDocumentTag,
  SemanticLink, InsertSemanticLink,
  Ontology, InsertOntology,
  Priority, InsertPriority,
  DocumentWithTags
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Document operations
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentWithTags(id: number): Promise<DocumentWithTags | undefined>;
  getDocumentsByUserId(userId: number): Promise<Document[]>;
  getUserDocumentsWithTags(userId: number): Promise<DocumentWithTags[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  
  // Tag operations
  getTagsByDocumentId(documentId: number): Promise<Tag[]>;
  getTagsByUserId(userId: number): Promise<Tag[]>;
  createTag(tag: InsertTag): Promise<Tag>;
  getOrCreateTag(name: string): Promise<Tag>;
  addTagToDocument(documentId: number, tagId: number): Promise<DocumentTag>;
  removeTagFromDocument(documentId: number, tagId: number): Promise<boolean>;
  
  // Semantic link operations
  getDocumentLinks(documentId: number): Promise<SemanticLink[]>;
  createSemanticLink(link: InsertSemanticLink): Promise<SemanticLink>;
  updateSemanticLink(id: number, link: Partial<SemanticLink>): Promise<SemanticLink | undefined>;
  deleteSemanticLink(id: number): Promise<boolean>;
  
  // Ontology operations
  getOntologies(userId: number): Promise<Ontology[]>;
  getOntology(id: number): Promise<Ontology | undefined>;
  createOntology(ontology: InsertOntology): Promise<Ontology>;
  updateOntology(id: number, ontology: Partial<Ontology>): Promise<Ontology | undefined>;
  deleteOntology(id: number): Promise<boolean>;
  
  // Priority operations
  getPriorities(userId: number): Promise<Priority[]>;
  createPriority(priority: InsertPriority): Promise<Priority>;
  updatePriority(id: number, priority: Partial<Priority>): Promise<Priority | undefined>;
  completePriority(id: number, completed: boolean): Promise<Priority | undefined>;
  deletePriority(id: number): Promise<boolean>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private documents: Map<number, Document>;
  private tags: Map<number, Tag>;
  private documentTags: Map<number, DocumentTag>;
  private semanticLinks: Map<number, SemanticLink>;
  private ontologies: Map<number, Ontology>;
  private priorities: Map<number, Priority>;
  
  sessionStore: session.SessionStore;
  
  private currentIds: {
    users: number;
    documents: number;
    tags: number;
    documentTags: number;
    semanticLinks: number;
    ontologies: number;
    priorities: number;
  };

  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.tags = new Map();
    this.documentTags = new Map();
    this.semanticLinks = new Map();
    this.ontologies = new Map();
    this.priorities = new Map();
    
    this.currentIds = {
      users: 1,
      documents: 1,
      tags: 1,
      documentTags: 1,
      semanticLinks: 1,
      ontologies: 1,
      priorities: 1
    };
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Document operations
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }
  
  async getDocumentWithTags(id: number): Promise<DocumentWithTags | undefined> {
    const document = this.documents.get(id);
    if (!document) {
      return undefined;
    }
    
    const tags = await this.getTagsByDocumentId(id);
    return {
      ...document,
      tags
    };
  }
  
  async getDocumentsByUserId(userId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      (document) => document.userId === userId
    );
  }
  
  async getUserDocumentsWithTags(userId: number): Promise<DocumentWithTags[]> {
    const userDocuments = await this.getDocumentsByUserId(userId);
    const documentsWithTags: DocumentWithTags[] = [];
    
    for (const document of userDocuments) {
      const tags = await this.getTagsByDocumentId(document.id);
      documentsWithTags.push({
        ...document,
        tags
      });
    }
    
    return documentsWithTags;
  }
  
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.currentIds.documents++;
    const now = new Date();
    const document: Document = { 
      ...insertDocument, 
      id,
      createdAt: now,
      updatedAt: now
    };
    this.documents.set(id, document);
    return document;
  }
  
  async updateDocument(id: number, documentUpdate: Partial<Document>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) {
      return undefined;
    }
    
    const updatedDocument = {
      ...document,
      ...documentUpdate,
      updatedAt: new Date()
    };
    
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }
  
  async deleteDocument(id: number): Promise<boolean> {
    // Also delete related document tags and semantic links
    const documentTags = Array.from(this.documentTags.values()).filter(
      (dt) => dt.documentId === id
    );
    
    for (const dt of documentTags) {
      this.documentTags.delete(dt.id);
    }
    
    const semanticLinks = Array.from(this.semanticLinks.values()).filter(
      (link) => link.sourceDocumentId === id || link.targetDocumentId === id
    );
    
    for (const link of semanticLinks) {
      this.semanticLinks.delete(link.id);
    }
    
    return this.documents.delete(id);
  }
  
  // Tag operations
  async getTagsByDocumentId(documentId: number): Promise<Tag[]> {
    const documentTagEntries = Array.from(this.documentTags.values()).filter(
      (dt) => dt.documentId === documentId
    );
    
    const tags: Tag[] = [];
    for (const entry of documentTagEntries) {
      const tag = this.tags.get(entry.tagId);
      if (tag) {
        tags.push(tag);
      }
    }
    
    return tags;
  }
  
  async getTagsByUserId(userId: number): Promise<Tag[]> {
    const userDocuments = await this.getDocumentsByUserId(userId);
    const userDocumentIds = userDocuments.map(doc => doc.id);
    
    const documentTagEntries = Array.from(this.documentTags.values()).filter(
      (dt) => userDocumentIds.includes(dt.documentId)
    );
    
    const tagIds = new Set(documentTagEntries.map(dt => dt.tagId));
    const tags: Tag[] = [];
    
    for (const tagId of tagIds) {
      const tag = this.tags.get(tagId);
      if (tag) {
        tags.push(tag);
      }
    }
    
    return tags;
  }
  
  async createTag(insertTag: InsertTag): Promise<Tag> {
    const id = this.currentIds.tags++;
    const tag: Tag = { ...insertTag, id };
    this.tags.set(id, tag);
    return tag;
  }
  
  async getOrCreateTag(name: string): Promise<Tag> {
    const existingTag = Array.from(this.tags.values()).find(
      (tag) => tag.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existingTag) {
      return existingTag;
    }
    
    return this.createTag({ name });
  }
  
  async addTagToDocument(documentId: number, tagId: number): Promise<DocumentTag> {
    // Check if the relationship already exists
    const existing = Array.from(this.documentTags.values()).find(
      (dt) => dt.documentId === documentId && dt.tagId === tagId
    );
    
    if (existing) {
      return existing;
    }
    
    const id = this.currentIds.documentTags++;
    const documentTag: DocumentTag = { id, documentId, tagId };
    this.documentTags.set(id, documentTag);
    return documentTag;
  }
  
  async removeTagFromDocument(documentId: number, tagId: number): Promise<boolean> {
    const docTag = Array.from(this.documentTags.values()).find(
      (dt) => dt.documentId === documentId && dt.tagId === tagId
    );
    
    if (!docTag) {
      return false;
    }
    
    return this.documentTags.delete(docTag.id);
  }
  
  // Semantic link operations
  async getDocumentLinks(documentId: number): Promise<SemanticLink[]> {
    return Array.from(this.semanticLinks.values()).filter(
      (link) => link.sourceDocumentId === documentId || link.targetDocumentId === documentId
    );
  }
  
  async createSemanticLink(insertLink: InsertSemanticLink): Promise<SemanticLink> {
    const id = this.currentIds.semanticLinks++;
    const link: SemanticLink = { ...insertLink, id };
    this.semanticLinks.set(id, link);
    return link;
  }
  
  async updateSemanticLink(id: number, linkUpdate: Partial<SemanticLink>): Promise<SemanticLink | undefined> {
    const link = this.semanticLinks.get(id);
    if (!link) {
      return undefined;
    }
    
    const updatedLink = {
      ...link,
      ...linkUpdate
    };
    
    this.semanticLinks.set(id, updatedLink);
    return updatedLink;
  }
  
  async deleteSemanticLink(id: number): Promise<boolean> {
    return this.semanticLinks.delete(id);
  }
  
  // Ontology operations
  async getOntologies(userId: number): Promise<Ontology[]> {
    return Array.from(this.ontologies.values()).filter(
      (ontology) => ontology.userId === userId
    );
  }
  
  async getOntology(id: number): Promise<Ontology | undefined> {
    return this.ontologies.get(id);
  }
  
  async createOntology(insertOntology: InsertOntology): Promise<Ontology> {
    const id = this.currentIds.ontologies++;
    const now = new Date();
    const ontology: Ontology = { 
      ...insertOntology, 
      id,
      createdAt: now,
      updatedAt: now
    };
    this.ontologies.set(id, ontology);
    return ontology;
  }
  
  async updateOntology(id: number, ontologyUpdate: Partial<Ontology>): Promise<Ontology | undefined> {
    const ontology = this.ontologies.get(id);
    if (!ontology) {
      return undefined;
    }
    
    const updatedOntology = {
      ...ontology,
      ...ontologyUpdate,
      updatedAt: new Date()
    };
    
    this.ontologies.set(id, updatedOntology);
    return updatedOntology;
  }
  
  async deleteOntology(id: number): Promise<boolean> {
    return this.ontologies.delete(id);
  }
  
  // Priority operations
  async getPriorities(userId: number): Promise<Priority[]> {
    return Array.from(this.priorities.values()).filter(
      (priority) => priority.userId === userId
    );
  }
  
  async createPriority(insertPriority: InsertPriority): Promise<Priority> {
    const id = this.currentIds.priorities++;
    const now = new Date();
    const priority: Priority = { 
      ...insertPriority, 
      id,
      createdAt: now
    };
    this.priorities.set(id, priority);
    return priority;
  }
  
  async updatePriority(id: number, priorityUpdate: Partial<Priority>): Promise<Priority | undefined> {
    const priority = this.priorities.get(id);
    if (!priority) {
      return undefined;
    }
    
    const updatedPriority = {
      ...priority,
      ...priorityUpdate
    };
    
    this.priorities.set(id, updatedPriority);
    return updatedPriority;
  }
  
  async completePriority(id: number, completed: boolean): Promise<Priority | undefined> {
    return this.updatePriority(id, { completed });
  }
  
  async deletePriority(id: number): Promise<boolean> {
    return this.priorities.delete(id);
  }
}

export const storage = new MemStorage();
