import OpenAI from "openai";

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "default_key" });

/**
 * Generate metadata for a document
 * @param text Document text content
 * @param title Document title (optional)
 * @returns Object with summary, tags, and category
 */
export async function generateDocumentMetadata(
  text: string,
  title?: string
): Promise<{
  summary: string;
  tags: string[];
  category: string;
}> {
  try {
    const prompt = `
      Analyze the following ${title ? `document titled "${title}"` : 'document'} and extract key metadata:
      
      ${text.substring(0, 1500)}${text.length > 1500 ? '...' : ''}
      
      Provide the following information in JSON format:
      1. A concise summary (max 150 words)
      2. Up to 5 relevant tags or keywords
      3. A category that best describes this document (e.g., Research, Notes, Project, Academic, etc.)
      
      Response format: { "summary": string, "tags": string[], "category": string }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content);

    return {
      summary: result.summary,
      tags: result.tags,
      category: result.category,
    };
  } catch (error: any) {
    console.error("Error generating document metadata:", error);
    return {
      summary: "Failed to generate summary.",
      tags: [],
      category: "Uncategorized",
    };
  }
}

/**
 * Detect relationships between documents
 * @param sourceDoc Source document content
 * @param targetDocs Array of target documents to compare against
 * @returns Array of relationship objects
 */
export async function detectDocumentRelationships(
  sourceDoc: { id: number; title: string; content: string },
  targetDocs: Array<{ id: number; title: string; content: string }>
): Promise<Array<{
  sourceId: number;
  targetId: number;
  relationshipType: string;
  strength: number;
}>> {
  try {
    // Create a condensed version of the documents for the API call
    const condensedTargetDocs = targetDocs.map(doc => ({
      id: doc.id,
      title: doc.title,
      content: doc.content.substring(0, 300) + (doc.content.length > 300 ? '...' : '')
    }));

    const prompt = `
      I need to analyze relationships between documents. Here's the source document:
      
      ID: ${sourceDoc.id}
      Title: ${sourceDoc.title}
      Content: ${sourceDoc.content.substring(0, 500)}${sourceDoc.content.length > 500 ? '...' : ''}
      
      And here are the target documents to compare against:
      ${condensedTargetDocs.map(doc => `
        ID: ${doc.id}
        Title: ${doc.title}
        Content: ${doc.content}
      `).join('\n')}
      
      For each target document that is related to the source, provide:
      1. The source document ID
      2. The target document ID
      3. The relationship type (citation, reference, related, similar, continuation)
      4. A relationship strength score (1-10)
      
      Return the relationships as a JSON array of objects with the format:
      [{ "sourceId": number, "targetId": number, "relationshipType": string, "strength": number }]
      
      Only include relationships with a strength of 3 or higher.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content);
    return Array.isArray(result) ? result : [];
  } catch (error: any) {
    console.error("Error detecting document relationships:", error);
    return [];
  }
}

/**
 * Generate personalized recommendations based on user activity
 * @param userId User ID
 * @param userDocuments Array of user's documents
 * @param userTags Array of tags used by the user
 * @param recentActivity Recent user activity details
 * @returns Array of recommendation objects
 */
export async function generateRecommendations(
  userId: number,
  userDocuments: Array<{ id: number; title: string; tags: string[] }>,
  userTags: string[],
  recentActivity?: any
): Promise<Array<{
  type: string;
  title: string;
  description: string;
  relevance: number;
  documentId?: number;
}>> {
  try {
    const prompt = `
      Generate personalized content recommendations for a user based on their documents and activity.
      
      User has the following documents:
      ${userDocuments.map(doc => `- ${doc.title} (Tags: ${doc.tags.join(', ')})`).join('\n')}
      
      Frequently used tags:
      ${userTags.join(', ')}
      
      ${recentActivity ? `Recent activity: ${JSON.stringify(recentActivity)}` : ''}
      
      Based on this information, generate 3-5 recommendations that would be valuable for this user.
      Each recommendation should include:
      1. Type (existing_document, suggested_reading, task)
      2. Title (clear, concise title for the recommendation)
      3. Description (brief explanation of why this is recommended)
      4. Relevance (1-10 score)
      5. DocumentId (only if recommendation is an existing document from the user's collection)
      
      Return as a JSON array of objects with the format:
      [{ "type": string, "title": string, "description": string, "relevance": number, "documentId"?: number }]
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content);
    return Array.isArray(result) ? result : [];
  } catch (error: any) {
    console.error("Error generating recommendations:", error);
    return [];
  }
}
