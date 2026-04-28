using {AuctionService} from './auction_service';

annotate AuctionService.AuctionsAuc with @UI: {SelectionFields: [
    project_ID,
    supplier_Supplier,
    startDate,
    endDate,
    status

], };


annotate AuctionService.AuctionsAuc with {


    startDate @assert: (case
                            when startDate > endDate
                                 then 'Start Date must be before End Date'
                        end);
    email     @(assert.format: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
    amount    @assert: (case
                            when amount < 0
                                 then 'Amount must be greater than 0'
                        end);

}

annotate AuctionService.AttachmentAuc with {
    content @Core.AcceptableMediaTypes: ['application/pdf'];
    content @Validation.Maximum       : '50MB';
}

annotate AuctionService.AuctionsAuc actions {
    embedAttachments @(Core.OperationAvailable: canEmbedAttachments);
    submitBid        @(Core.OperationAvailable: canSubmitBid)
}
