using {bidauction as db} from '../db/schema';
using {API_BUSINESS_PARTNER as api} from './external/API_BUSINESS_PARTNER';

service AuctionService @(path: '/service/auction') {

    // Status code list for value help
    @readonly
    entity AuctionStatusesAuc as projection on db.AuctionStatuses;

    // Auctions - Draft enabled
    @odata.draft.enabled
    entity AuctionsAuc        as
        projection on db.Auctions {
            key ID                                    @(title: '{i18n>auctionId}'),
                project  : redirected to ProjectsAuc  @(title: '{i18n>project}')  @assert.target,
                project.title                         @(title: '{i18n>projectName}'),
                supplier : redirected to SupplierAuc  @(title: '{i18n>supplier}'),
                description                           @mandatory                  @(title: '{i18n>description}'),
                scope                                 @mandatory                  @(title: '{i18n>scope}'),
                amount                                @mandatory                  @(title: '{i18n>amount}'),
                currency                              @mandatory                  @(title: '{i18n>currency}'),
                currency.code                         @mandatory                  @(title: '{i18n>currencyCode}'),
                startDate                             @mandatory                  @(title: '{i18n>startDate}'),
                endDate                               @mandatory                  @(title: '{i18n>endDate}'),
                contactPerson                         @mandatory                  @(title: '{i18n>contactPerson}'),
                contactPhone                          @mandatory                  @(title: '{i18n>contactPhone}'),
                contactFax                            @(title: '{i18n>fax}'),
                email                                 @mandatory                  @(title: '{i18n>email}'),
                status                                @readonly @(title: '{i18n>status}'),
                attachments                           @(title: '{i18n>attachments}'),
                evaluationResults                     @(title: '{i18n>evaluationResults}'),
                virtual canEmbedAttachments : Boolean,
                virtual canSubmitBid        : Boolean
        }
        actions {
            action submitBid();
            action embedAttachments();
        };

    entity AttachmentAuc      as projection on db.Auctions.attachments;

    @cds.persistence.skip: true
    entity SupplierAuc        as projection on api.A_Supplier;

    @cds.redirection.target: true
    entity ProjectsAuc        as projection on db.Projects;
}
