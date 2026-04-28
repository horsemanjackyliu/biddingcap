const cds = require('@sap/cds');
const { SELECT } = require('@sap/cds/lib/ql/cds-ql');
const express = require('express');

// const { AzureOpenAiEmbeddingClient } = import('@sap-ai-sdk/langchain');

const { getContent } = require('./helper');


module.exports = cds.service.impl(async function () {
    const AuctionsAuc = cds.entities['AuctionService.AuctionsAuc'];
    const AttachmentAuc = cds.entities['AuctionService.AttachmentAuc'];
    const SupplierAuc = cds.entities['AuctionService.SupplierAuc'];

    // Delegate SupplierAuc reads to the external API_BUSINESS_PARTNER service (lazy connect)
    this.on('READ', SupplierAuc, async req => {
        const BP = await cds.connect.to('API_BUSINESS_PARTNER');
        return BP.run(req.query);
    });

    const AttachmentEmbeddings = cds.entities['BidAuctionService.AttachmentEmbeddings'];

    this.before('DELETE', AuctionsAuc, async (req) => {
        const { ID } = req.params[0];
        await DELETE.from(AttachmentEmbeddings).where({ auction: ID });
    });

    this.after('READ', AuctionsAuc, results => {
        const items = Array.isArray(results) ? results : [results];
        for (const a of items) {
            a.canEmbedAttachments = a.status === 'S';
            a.canSubmitBid = a.status === 'O';
        }
    });

    this.on('embedAttachments', AuctionsAuc, async (req) => {
        const { ID } = req.params[0];

        try {
            // 1. Get the auction with its attachments
            const auction = await SELECT.one.from(AuctionsAuc, ID).columns(a => {
                a.ID,
                    a.status,
                    a.project(p => p.ID),
                    a.attachments(att => {
                        att.ID,
                            att.filename,
                            att.mimeType,
                            att.up__ID
                    });
            });

            if (!auction) {
                req.error(404, 'Auction not found');
                return;
            }

            if (auction.status === 'O') {
                req.error(400, 'Bid must be submitted before embedding attachments');
                return;
            } else if (auction.status === 'E') {
                req.error(400, 'Attachments have already been embedded for this auction');
                return;
            } else if (auction.status === 'C') {
                req.error(400, 'Auction is closed');
                return;
            } else if (auction.status !== 'S') {
                req.error(400, `Cannot embed attachments in status '${auction.status}'`);
                return;
            }

            if (!auction.attachments || auction.attachments.length === 0) {
                req.error(400, 'No attachments found for this auction');
                return;
            }

            // 2. Embed each attachment and 3. insert embeddings into AttachmentEmbeddings
            for (const attachment of auction.attachments) {
                console.log(`Embedding attachment: ${attachment.filename}`);
                const chunks = await getContent(
                    attachment.ID,
                    AttachmentAuc,        // CDS entity object required by @cap-js/attachments for HANA table resolution
                    attachment.filename,
                    attachment.mimeType,
                    auction.project.ID,   // projectID from expanded association
                    attachment.up__ID     // auctionID (up__ID is the parent Auction ID)
                );
                await INSERT.into(AttachmentEmbeddings).entries(chunks);
                console.log(`Embedded ${chunks.length} chunks for attachment: ${attachment.filename}`);
            }

            // Update auction status to 'E' (EMBEDED) after all attachments processed
            await UPDATE(AuctionsAuc).set({ status: 'E' }).where({ ID });
            console.log(`Auction ${ID} status updated to EMBEDED`);

        } catch (error) {
            console.error('Error embedding auction attachments:', error);
            req.error(500, `Failed to embed attachments: ${error.message}`);
        }
    });

    this.on('submitBid', AuctionsAuc, async (req) => {
        const { ID } = req.params[0];

        try {
            // Get current auction
            const auction = await SELECT.one.from(AuctionsAuc).where({ ID });

            if (!auction) {
                req.error(400, 'Auction not found');
                return false;
            }

            // Check if auction is in OPEN status
            if (auction.status !== 'O') {
                req.error(400, `Auction cannot be submitted. Current status is '${auction.status}'. Only auctions with status 'O' (OPEN) can be submitted.`);
                return false;
            }

            // Update auction status to 'S' (SUBMITED)
            await UPDATE(AuctionsAuc).set({ status: 'S' }).where({ ID });
            console.log(`Auction ${ID} status updated to SUBMITED`);

            return {
                message: `Successfully submitted auction ${ID}`,
                status: 'S'
            };
        } catch (error) {
            console.error('Error submitting auction:', error);
            req.error(500, `Failed to submit auction: ${error.message}`);
            return false;
        }
    });

})
