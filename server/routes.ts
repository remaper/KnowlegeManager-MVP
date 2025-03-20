import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { generateDocumentMetadata, detectDocumentRelationships, generateRecommendations } from "./openai";
import { z } from "zod";
import { insertDocumentSchema, insertPrioritySchema, insertOntologySchema, insertSemanticLinkSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { existsSync, mkdirSync } from "fs";

// Set up multer for file upload
const uploadDir = path.join(process.cwd(), "uploads");
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Helper to check authentication
const ensureAuthenticated = (req: Request, res: Response, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Document routes
  app.get("/api/documents", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const documents = await storage.getUserDocumentsWithTags(userId);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/:id", ensureAuthenticated, async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocumentWithTags(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      if (document.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.post("/api/documents", ensureAuthenticated, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { title, category } = req.body;
      const userId = req.user!.id;
      
      // Read file content (for text-based files)
      const filePath = req.file.path;
      let content = "";
      
      if (req.file.mimetype.includes("text") || req.file.mimetype.includes("application/pdf")) {
        try {
          // For simplicity, just read as text. In a real app, you'd use libraries to extract text from PDFs, etc.
          content = await fs.readFile(filePath, "utf-8");
        } catch (error) {
          console.error("Error reading file content:", error);
        }
      }
      
      // Generate metadata if requested
      let summary = "";
      let tagNames: string[] = [];
      let documentCategory = category || "";
      
      if (req.body.generateMetadata === "true") {
        try {
          const metadata = await generateDocumentMetadata(content || "", title);
          summary = metadata.summary;
          tagNames = metadata.tags;
          documentCategory = documentCategory || metadata.category;
        } catch (error) {
          console.error("Error generating metadata:", error);
        }
      }
      
      // Create document in storage
      const document = await storage.createDocument({
        userId,
        title: title || req.file.originalname,
        filename: req.file.filename,
        fileType: req.file.mimetype,
        category: documentCategory,
        summary,
        content,
      });
      
      // Add tags
      if (tagNames.length > 0) {
        for (const tagName of tagNames) {
          const tag = await storage.getOrCreateTag(tagName);
          await storage.addTagToDocument(document.id, tag.id);
        }
      }
      
      // Add user-provided tags
      if (req.body.tags) {
        const userTags = req.body.tags.split(",").map((tag: string) => tag.trim());
        for (const tagName of userTags) {
          if (tagName) {
            const tag = await storage.getOrCreateTag(tagName);
            await storage.addTagToDocument(document.id, tag.id);
          }
        }
      }
      
      // Return document with tags
      const documentWithTags = await storage.getDocumentWithTags(document.id);
      res.status(201).json(documentWithTags);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.put("/api/documents/:id", ensureAuthenticated, async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      if (document.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { title, category, summary } = req.body;
      const updatedDocument = await storage.updateDocument(documentId, {
        title,
        category,
        summary
      });
      
      // Handle tags if provided
      if (req.body.tags) {
        // Get current tags
        const currentTags = await storage.getTagsByDocumentId(documentId);
        const currentTagNames = currentTags.map(tag => tag.name);
        
        // Parse new tags
        const newTagNames = req.body.tags.split(",").map((tag: string) => tag.trim()).filter(Boolean);
        
        // Add new tags
        for (const tagName of newTagNames) {
          if (!currentTagNames.includes(tagName)) {
            const tag = await storage.getOrCreateTag(tagName);
            await storage.addTagToDocument(documentId, tag.id);
          }
        }
        
        // Remove tags that are no longer in the list
        for (const tag of currentTags) {
          if (!newTagNames.includes(tag.name)) {
            await storage.removeTagFromDocument(documentId, tag.id);
          }
        }
      }
      
      const documentWithTags = await storage.getDocumentWithTags(documentId);
      res.json(documentWithTags);
    } catch (error) {
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.delete("/api/documents/:id", ensureAuthenticated, async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      if (document.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteDocument(documentId);
      
      // Delete file if it exists
      if (document.filename) {
        const filePath = path.join(uploadDir, document.filename);
        try {
          await fs.unlink(filePath);
        } catch (error) {
          console.error("Error deleting file:", error);
        }
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Tag routes
  app.get("/api/tags", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const tags = await storage.getTagsByUserId(userId);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  // Semantic links routes
  app.get("/api/documents/:id/links", ensureAuthenticated, async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      if (document.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const links = await storage.getDocumentLinks(documentId);
      res.json(links);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch document links" });
    }
  });

  app.post("/api/semantic-links", ensureAuthenticated, async (req, res) => {
    try {
      const linkSchema = insertSemanticLinkSchema.parse(req.body);
      
      // Check if both documents exist and belong to the user
      const sourceDoc = await storage.getDocument(linkSchema.sourceDocumentId);
      const targetDoc = await storage.getDocument(linkSchema.targetDocumentId);
      
      if (!sourceDoc || !targetDoc) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      if (sourceDoc.userId !== req.user!.id || targetDoc.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const link = await storage.createSemanticLink(linkSchema);
      res.status(201).json(link);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create semantic link" });
    }
  });

  app.post("/api/documents/:id/analyze-relationships", ensureAuthenticated, async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const sourceDoc = await storage.getDocument(documentId);
      
      if (!sourceDoc) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      if (sourceDoc.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get other documents by the same user
      const allUserDocs = await storage.getDocumentsByUserId(req.user!.id);
      const targetDocs = allUserDocs.filter(doc => doc.id !== documentId);
      
      if (targetDocs.length === 0) {
        return res.json({ relationships: [] });
      }
      
      // Detect relationships
      const relationships = await detectDocumentRelationships(
        {
          id: sourceDoc.id,
          title: sourceDoc.title,
          content: sourceDoc.content || ""
        },
        targetDocs.map(doc => ({
          id: doc.id,
          title: doc.title,
          content: doc.content || ""
        }))
      );
      
      // Create semantic links for detected relationships
      for (const rel of relationships) {
        await storage.createSemanticLink({
          sourceDocumentId: rel.sourceId,
          targetDocumentId: rel.targetId,
          linkType: rel.relationshipType,
          strength: rel.strength
        });
      }
      
      res.json({ relationships });
    } catch (error) {
      res.status(500).json({ message: "Failed to analyze document relationships" });
    }
  });

  // Ontology routes
  app.get("/api/ontologies", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const ontologies = await storage.getOntologies(userId);
      res.json(ontologies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ontologies" });
    }
  });

  app.get("/api/ontologies/:id", ensureAuthenticated, async (req, res) => {
    try {
      const ontologyId = parseInt(req.params.id);
      const ontology = await storage.getOntology(ontologyId);
      
      if (!ontology) {
        return res.status(404).json({ message: "Ontology not found" });
      }
      
      if (ontology.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(ontology);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ontology" });
    }
  });

  app.post("/api/ontologies", ensureAuthenticated, async (req, res) => {
    try {
      const ontologySchema = insertOntologySchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      
      const ontology = await storage.createOntology(ontologySchema);
      res.status(201).json(ontology);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create ontology" });
    }
  });

  app.put("/api/ontologies/:id", ensureAuthenticated, async (req, res) => {
    try {
      const ontologyId = parseInt(req.params.id);
      const ontology = await storage.getOntology(ontologyId);
      
      if (!ontology) {
        return res.status(404).json({ message: "Ontology not found" });
      }
      
      if (ontology.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { name, structure } = req.body;
      const updatedOntology = await storage.updateOntology(ontologyId, {
        name,
        structure
      });
      
      res.json(updatedOntology);
    } catch (error) {
      res.status(500).json({ message: "Failed to update ontology" });
    }
  });

  // Priority routes
  app.get("/api/priorities", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const priorities = await storage.getPriorities(userId);
      res.json(priorities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch priorities" });
    }
  });

  app.post("/api/priorities", ensureAuthenticated, async (req, res) => {
    try {
      const prioritySchema = insertPrioritySchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      
      const priority = await storage.createPriority(prioritySchema);
      res.status(201).json(priority);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create priority" });
    }
  });

  app.put("/api/priorities/:id/complete", ensureAuthenticated, async (req, res) => {
    try {
      const priorityId = parseInt(req.params.id);
      const { completed } = req.body;
      
      const priority = await storage.completePriority(priorityId, completed);
      
      if (!priority) {
        return res.status(404).json({ message: "Priority not found" });
      }
      
      res.json(priority);
    } catch (error) {
      res.status(500).json({ message: "Failed to update priority" });
    }
  });

  // Recommendations
  app.get("/api/recommendations", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Get all user documents with tags
      const userDocuments = await storage.getUserDocumentsWithTags(userId);
      
      // Get all tags used by the user
      const userTags = await storage.getTagsByUserId(userId);
      
      // Check if we have documents to generate recommendations from
      if (userDocuments.length === 0) {
        return res.json([
          {
            type: "info",
            title: "Add some documents",
            description: "Upload or create documents to get personalized recommendations.",
            relevance: 1.0
          }
        ]);
      }
      
      try {
        // Generate recommendations
        const recommendations = await generateRecommendations(
          userId,
          userDocuments.map(doc => ({
            id: doc.id,
            title: doc.title,
            tags: doc.tags.map(tag => tag.name)
          })),
          userTags.map(tag => tag.name)
        );
        
        res.json(recommendations);
      } catch (apiError: any) {
        console.error("Error generating recommendations:", apiError);
        
        // Check for OpenAI API quota errors
        if (apiError.code === 'insufficient_quota' || 
            (apiError.message && apiError.message.includes('quota'))) {
          return res.json([
            {
              type: "quota_error",
              title: "API Quota Exceeded",
              description: "The AI service quota has been exceeded. Recommendations will be available later.",
              relevance: 1.0
            }
          ]);
        }
        
        // Generic error fallback
        res.json([
          {
            type: "error",
            title: "Recommendation Error",
            description: "Could not generate recommendations at this time. Please try again later.",
            relevance: 1.0
          }
        ]);
      }
    } catch (error) {
      console.error("Recommendations API error:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
