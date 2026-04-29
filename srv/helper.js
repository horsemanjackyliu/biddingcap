const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const pdfParse = require('pdf-parse');
const cds = require('@sap/cds');
const { SELECT } = require('@sap/cds/lib/ql/cds-ql');
const embeddingModel = 'text-embedding-3-large';


// Helper method to convert embeddings to buffer for insertion
let array2VectorBuffer = (data) => {
    const sizeFloat = 4;
    const sizeDimensions = 4;
    const bufferSize = data.length * sizeFloat + sizeDimensions;
    const buffer = Buffer.allocUnsafe(bufferSize);
    // write size into buffer
    buffer.writeUInt32LE(data.length, 0);
    data.forEach((value, index) => {
        buffer.writeFloatLE(value, index * sizeFloat + sizeDimensions);
    });
    return buffer;
};


async function embeding(params) {
    const { OrchestrationEmbeddingClient, OrchestrationClient } = await import('@sap-ai-sdk/orchestration');

    const embeddingClient = new OrchestrationEmbeddingClient(
        {
            embeddings: {
                model: {
                    name: embeddingModel,
                    version: 'latest'
                }
            }
        },
        { resourceGroup: 'default' },
        { destinationName: 'bid-aicore' }
    );
    const response = await embeddingClient.embed({
        input: params
    });

    return response.getEmbeddings();

}

async function splitPdfContent(attachmentBuffer, fileName, projectID, auctionID, attachID) {

    console.log('projectId' + projectID);
    console.log('auctionID' + auctionID);
    console.log('attachID' + attachID);

    console.log("Splitting the document into text chunks.");

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1500,
        chunkOverlap: 150,
        addStartIndex: true
    });

    const parsed = await pdfParse(attachmentBuffer);
    const textChunks = await splitter.createDocuments([parsed.text]);
    // Batch all chunk texts into a single embedding API call instead of N serial calls
    const chunkTexts = textChunks.map(chunk => chunk.pageContent);
    console.log(`Embedding ${chunkTexts.length} chunks in a single batched call for attachment ${attachID}`);
    const embeddingResults = await embeding(chunkTexts);
    if (!embeddingResults || embeddingResults.length !== chunkTexts.length) {
        throw new Error(`Embedding returned unexpected results for attachment ${attachID}: expected ${chunkTexts.length}, got ${embeddingResults ? embeddingResults.length : 0}`);
    }

    const textChunkEntries = embeddingResults.map((embResult, embedIndex) => {
        // Batch getEmbeddings() returns [{embedding: number[], index: N}, ...]
        // Each embResult is a single embedding object, not an array
        const embeddingArray = embResult && embResult.embedding ? embResult.embedding
            : Array.isArray(embResult) ? embResult
                : null;
        if (!embeddingArray || !Array.isArray(embeddingArray)) {
            throw new Error(`Invalid embedding format for chunk ${embedIndex} of attachment ${attachID}`);
        }
        return {
            project: projectID,
            auction: auctionID,
            attachmentID: attachID,
            chunkIndex: embedIndex,
            text_chunk: chunkTexts[embedIndex],
            metadata_column: fileName,
            embedding: JSON.stringify(embeddingArray)
        };
    });

    return textChunkEntries;


}


async function getContent(attachmentID, attEntity, fileName, mimeType, projectID, auctionID) {

    console.log(attEntity);



    const AttachmentsSrv = await cds.connect.to('attachments');
    const keys = { ID: attachmentID }
    const myAttachmentContent = await AttachmentsSrv.get(attEntity, keys);

    if (!myAttachmentContent) {
        throw new Error(`Attachment content not found for ID: ${attachmentID}. Ensure the attachment has been uploaded and content is accessible.`);
    }

    let attachmentBuffer;
    if (Buffer.isBuffer(myAttachmentContent) || myAttachmentContent instanceof Uint8Array) {
        // basic.js (SQLite/local dev) returns a Buffer directly
        attachmentBuffer = Buffer.from(myAttachmentContent);
    } else {
        // Object store implementations (S3, GCP, Azure) return a ReadableStream
        const dockBytes = [];
        await new Promise((resolve, reject) => {
            myAttachmentContent.on('data', chunk => dockBytes.push(chunk));
            myAttachmentContent.on('end', resolve);
            myAttachmentContent.on('error', reject);
        });
        attachmentBuffer = Buffer.concat(dockBytes);
    }

    if (mimeType == 'application/pdf') {
        return await splitPdfContent(attachmentBuffer, fileName, projectID, auctionID, attachmentID);
    }

}


// Call BTP AI Core LLM to evaluate a supplier bid against a guidance criterion
async function callLLM(guidance, biddingDocChunks, bidDocChunks) {

    const { OrchestrationClient } = await import('@sap-ai-sdk/orchestration');

    const biddingContext = biddingDocChunks.map(c => c.text_chunk).join('\n---\n');
    const bidContext = bidDocChunks.map(c => c.text_chunk).join('\n---\n');
    // console.log('biddingContext:' + biddingContext);
    console.log('bidContext:' + bidContext);

    const client = new OrchestrationClient(
        {
            scenario: 'foundation-models',
            name: 'bidevaluationtemplate',
            version: 'latest'
        },
        { resourceGroup: 'default' },
        { destinationName: 'bid-aicore' });

    const response = await client.chatCompletion({
        placeholderValues: {
            guidance,
            biddingContext,
            bidContext
        }
    });
    const content = response.getContent();

    try {
        return JSON.parse(content);
    } catch {
        // Fallback: extract JSON from response if wrapped in markdown
        const match = content.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error(`LLM returned unparseable response: ${content}`);
    }
}

async function findSimilarChunks(filter, queryVector, topN = 5) {
    const db = await cds.connect.to('db');
    const embeddingStr = JSON.stringify(queryVector);
    const AttachmentEmbeddingsDb = cds.entities('bidauction').AttachmentEmbeddings;
    try {
        const results = await db.run(
            SELECT.from(AttachmentEmbeddingsDb)
                .columns('text_chunk', 'embedding')
                .where(filter)
                .orderBy({
                    xpr: [{
                        func: 'cosine_similarity',
                        args: [
                            { ref: ['embedding'] },
                            { func: 'to_real_vector', args: [{ val: embeddingStr }] }
                        ]
                    }],
                    sort: 'desc'
                })
                .limit(topN)
        );
        return results.map(r => ({ text_chunk: r.text_chunk }));
    } catch {
        // SQLite fallback: fetch all rows and sort by JS cosine similarity
        const all = await SELECT.from(AttachmentEmbeddingsDb)
            .columns('text_chunk', 'embedding')
            .where(filter);
        const scored = all
            .filter(r => r.embedding != null)
            .map(r => {
                const vec = JSON.parse(r.embedding);
                let dot = 0, na = 0, nb = 0;
                for (let i = 0; i < queryVector.length; i++) {
                    dot += queryVector[i] * vec[i];
                    na += queryVector[i] ** 2;
                    nb += vec[i] ** 2;
                }
                return { text_chunk: r.text_chunk, score: dot / (Math.sqrt(na) * Math.sqrt(nb)) };
            });
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, topN).map(r => ({ text_chunk: r.text_chunk }));
    }
}

module.exports = { embeding, getContent, callLLM, findSimilarChunks };
