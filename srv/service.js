const cds = require('@sap/cds');
const { SELECT } = require('@sap/cds/lib/ql/cds-ql');
const e = require('express');

// const { AzureOpenAiEmbeddingClient } = import('@sap-ai-sdk/langchain');

const { getContent, callLLM, embeding, findSimilarChunks } = require('./helper');



// Generate embeddings for semantic search

module.exports = cds.service.impl(async function () {

    // const { Projects, Auctions, EvaluationResults, Attachments } = this.entities;

    const { Projects, Auctions, EvaluationResults, Attachments, AttachmentEmbeddings } = cds.entities('BidAuctionService');

    this.before('DELETE', Projects, async (req) => {
        const { ID } = req.params[0];
        const { EvaluationGuidances } = cds.entities('BidAuctionService');
        await DELETE.from(EvaluationResults).where({ project_ID: ID });
        await DELETE.from(AttachmentEmbeddings).where({ project: ID });
        await DELETE.from(EvaluationGuidances).where({ project_ID: ID });
        await DELETE.from(Auctions).where({ project_ID: ID });
    });

    // Before CREATE - Validation for Auctions


    this.after('READ', Projects, results => {
        const items = Array.isArray(results) ? results : [results];
        for (const p of items) {
            p.canActivateProject = p.status === 'O';
            p.canEmbedAttachments = p.status === 'A';
            p.canDeleteEmbeding = p.status === 'E';
            p.canEvaluateProject = p.status === 'E';
            p.canCloseProject = p.status === 'V';
        }
    });

    this.on('embedAttachments', Projects, async (req) => {
        const { ID } = req.params[0];
        try {
            // 1. Get the project with its attachments
            const project = await SELECT.one.from(Projects, ID).columns(p => {
                p.ID,
                    p.status,
                    p.attachments(a => {
                        a.ID,
                            a.filename,
                            a.mimeType
                    });
            });

            if (!project) {
                req.error(404, 'Project not found');
                return;
            }

            if (project.status === 'O') {
                req.error(400, 'Project must be activated before embedding attachments');
                return;
            } else if (project.status === 'E') {
                req.error(400, 'Attachments have already been embedded for this project');
                return;
            } else if (project.status === 'C') {
                req.error(400, 'Project is closed');
                return;
            } else if (project.status !== 'A') {
                req.error(400, `Cannot embed attachments in status '${project.status}'`);
                return;
            }

            if (!project.attachments || project.attachments.length === 0) {
                req.error(400, 'No attachments found for this project');
                return;
            }

            // 2. Embed each attachment and 3. insert embeddings into AttachmentEmbeddings
            for (const attachment of project.attachments) {
                console.log(`Embedding attachment: ${attachment.filename}`);
                const chunks = await getContent(
                    attachment.ID,
                    Attachments,          // CDS entity object required by @cap-js/attachments for HANA table resolution
                    attachment.filename,
                    attachment.mimeType,
                    ID,                   // projectID
                    null                  // auctionID (not applicable for project attachments)
                );
                await INSERT.into(AttachmentEmbeddings).entries(chunks);
                console.log(`Embedded ${chunks.length} chunks for attachment: ${attachment.filename}`);
            }

            // Update project status to 'E' (EMBEDED) after successful embedding
            await UPDATE(Projects).set({ status: 'E' }).where({ ID });
            console.log(`Project ${ID} status updated to EMBEDED`);

        } catch (error) {
            console.error('Error embedding project attachments:', error);
            req.error(500, `Failed to embed attachments: ${error.message}`);
        }
    });


    this.on('activateProject', Projects, async (req) => {
        const { ID } = req.params[0];

        try {
            // Get current project
            const project = await SELECT.one.from(Projects).where({ ID });

            if (!project) {
                req.error(400, 'Project not found');
                return false;
            }
            console.log(project.status);
            // Check if project is in OPEN status
            if (project.status !== 'O') {
                req.error(400, `Project cannot be activated. Current status is '${project.status}'. Only projects with status 'O' (OPEN) can be activated.`);
                return false;
            }

            // Update project status to 'A' (ACTIVE)
            await UPDATE(Projects).set({ status: 'A' }).where({ ID });
            console.log(`Project ${ID} status updated to ACTIVE`);

            return {
                message: `Successfully activated project ${ID}`,
                status: 'A'
            };
        } catch (error) {
            console.error('Error activating project:', error);
            req.error(500, `Failed to activate project: ${error.message}`);
            return false;
        }
    });

    this.on('deleteEmbeding', Projects, async (req) => {
        const { ID } = req.params[0];
        const { AttachmentEmbeddings } = cds.entities;
        try {
            // Delete all embeddings associated with this project
            const deleteResult = await DELETE.from(AttachmentEmbeddings).where({ project: ID });

            // Update project status to 'A' (ACTIVE) after deleting embeddings
            await UPDATE(Projects).set({ status: 'A' }).where({ ID });
            console.log(`Project ${ID} status updated to ACTIVE after deleting embeddings`);

            console.log('DeleteResult:' + deleteResult);
            if (deleteResult == 0) {
                console.log('Activate has been called in delete embeding');
                await UPDATE(Projects).set({ status: 'A' }).where({ ID });
            }
            return {
                message: `Successfully deleted embeddings for project ${ID}`,
                deletedCount: deleteResult
            };
        } catch (error) {
            console.error('Error deleting embeddings:', error);
            req.error(500, `Failed to delete embeddings: ${error.message}`);
            return false;
        }
    });

    // Action: Evaluate Project
    this.on('evaluateProject', Projects, async (req) => {
        const { ID } = req.params[0];
        const { EvaluationGuidances } = cds.entities('BidAuctionService');

        try {
            // Step 1 – Validate: project must be 'E' and ALL auction attachments must also be embedded
            const project = await SELECT.one.from(Projects, ID).columns(p => {
                p.ID, p.status,
                    p.auctions(a => { a.ID, a.status, a.supplier_Supplier });
            });

            if (!project) {
                req.error(404, 'Project not found');
                return;
            }
            if (project.status !== 'E') {
                req.error(400, `Project must be in status 'E' (Embedded) to evaluate. Current status: '${project.status}'`);
                return;
            }

            const auctions = project.auctions || [];
            if (auctions.length === 0) {
                req.error(400, 'No auctions found for this project. At least one supplier bid is required.');
                return;
            }

            const notEmbedded = auctions.filter(a => a.status !== 'E');
            if (notEmbedded.length > 0) {
                req.error(400, `${notEmbedded.length} auction(s) have not been embedded yet. All supplier bids must be embedded before evaluation.`);
                return;
            }

            // Step 2 – Get evaluation guidances for this project
            const guidances = await SELECT.from(EvaluationGuidances)
                .where({ project_ID: ID })
                .orderBy('index');

            if (guidances.length === 0) {
                req.error(400, 'No evaluation guidances defined for this project.');
                return;
            }

            // Step 3 – For each auction × guidance: embed criterion, semantic search, call LLM
            const results = [];
            for (const auction of auctions) {
                for (const guidance of guidances) {
                    console.log(`Evaluating auction ${auction.ID} against guidance index ${guidance.index}`);

                    // Step 3a: Embed the guidance criterion text
                    const guidEmbedResults = await embeding([guidance.guidance]);
                    const guidEmbedding = guidEmbedResults[0].embedding
                        ? guidEmbedResults[0].embedding
                        : guidEmbedResults[0];

                    // Step 3b: Find most relevant project bidding doc chunks for this criterion
                    const biddingDocEmbeds = await findSimilarChunks(
                        { project: ID, auction: null },
                        guidEmbedding
                    );

                    // Step 3c: Find most relevant supplier bid chunks for this criterion
                    const bidDocEmbeds = await findSimilarChunks(
                        { auction: auction.ID },
                        guidEmbedding
                    );

                    if (bidDocEmbeds.length === 0) {
                        console.warn(`No embeddings found for auction ${auction.ID}, skipping guidance ${guidance.index}.`);
                        continue;
                    }

                    const { score, fullscore, confidence, explanation } = await callLLM(
                        guidance.guidance,
                        biddingDocEmbeds,
                        bidDocEmbeds
                    );

                    results.push({
                        project_ID: ID,
                        supplier: auction.supplier_Supplier,
                        evaluationGuidance_ID: guidance.ID,
                        auction_ID: auction.ID,
                        score: Math.min(5, Math.max(0, score)),
                        fullscore: Math.min(5, Math.max(0, fullscore ?? score)),
                        confidence: Math.min(1, Math.max(0, confidence)),
                        explanation
                    });
                }
            }

            // Step 4 – Write results in a single short DB transaction
            if (results.length > 0) {
                await INSERT.into(EvaluationResults).entries(results);
            }

            // Advance project status to 'V' (Evaluated)
            await UPDATE(Projects).set({ status: 'V' }).where({ ID });
            console.log(`Project ${ID} evaluated — ${results.length} result(s) saved, status → V`);

        } catch (error) {
            console.error('Error evaluating project:', error);
            req.error(500, `Failed to evaluate project: ${error.message}`);
        }
    });

    this.on('closeProject', Projects, async (req) => {
        const { ID } = req.params[0];
        const project = await SELECT.one(Projects).where({ ID });
        if (!project) return req.error(404, 'Project not found');
        if (project.status !== 'V') return req.error(400, 'Only evaluated projects can be closed');
        await UPDATE(Projects).set({ status: 'C' }).where({ ID });
    });

});
