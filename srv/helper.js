const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const pdfParse = require('pdf-parse');
const cds = require('@sap/cds');
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
    // const orchestrationClient = new OrchestrationClient({
    //     promptTemplating: {
    //         model: {
    //             name: 'gpt-4o'
    //         },
    //         prompt: {
    //             template: [
    //                 { role: 'user', content: 'Answer the question: {{?question}}' }
    //             ]
    //         }
    //     }
    // });


    // const response = await orchestrationClient.chatCompletion({
    //     placeholderValues: {
    //         question: 'Why is the phrase "Hello world!" so famous?'
    //     }
    // });


    // console.log(response.getContent());

    // const pdfDoc = await PDFDocument.create();

    const embeddingClient = new OrchestrationEmbeddingClient(
        {
            embeddings: {
                model: {
                    name: embeddingModel,
                    version: 'latest'
                }
            }
        },
        { resourceGroup: 'default-grounding' },
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

    const prompt = `你是一位专业的采购评估专家，精通中文商务和技术文件。以下所有内容均以中文撰写，请直接以中文进行分析，无需翻译。

## 评估标准 (Evaluation Criterion)
${guidance}

## 招标文件 (Project Bidding Document - reference requirements)
${biddingContext}

## 投标文件 (Supplier Bid Document - to evaluate)
${bidContext}

## 评分规则

1. ${guidance}会给出满分及评分规则。
2. **逐档对照**：找到投标文件中与该评审因素对应的内容，与各评分档位的描述逐一比对后归档。
3. **就高不就低**：若投标内容介于两档之间，参照评分标准措辞（如"基本满足"、"较好满足"）判断归档。
4. **资质与业绩项**：对于涉及证书、合同金额、工程业绩等可验证项，若投标文件未提供对应材料或信息不完整，按评分标准中"不满足"条件处理。
5. **置信度**：若投标文件对该因素表述模糊、内容缺失或关键章节空白，请相应降低置信度。


- 提供置信度（0–1），若中文表述模糊、使用高度专业术语或关键章节缺失，请降低置信度。
- 用中文撰写2–4句简洁说明，阐述评分理由，并引用投标文件中的关键中文原文作为佐证。
- 满分 从${guidance}得到，如缺失，按100分算。
- 仅输出以下格式的JSON对象，不得包含其他内容：
{"score": <按该因素评分档位实际得分，数字>,“fullscore":<满分> "confidence": <0-1>, "explanation": "<text in Chinese>"}`;

    const client = new OrchestrationClient({
        promptTemplating: {
            model: {
                name: 'gpt-4o',
                params: { max_tokens: 16383, temperature: 0 }
            },
            prompt: {
                template: [{ role: 'user', content: prompt }]
            }
        }
    },
        { resourceGroup: 'default-grounding' },
        { destinationName: 'bid-aicore' });

    const response = await client.chatCompletion();
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

module.exports = { embeding, getContent, callLLM };
