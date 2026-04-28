using {bidauction as db} from '../db/schema';
using {API_BUSINESS_PARTNER as external} from './external/API_BUSINESS_PARTNER';

service BidAuctionService @(path: '/service/bidauction') {

    // Projects - Draft enabled
    @odata.draft.enabled
    entity Projects             as
        projection on db.Projects {
            key ID                  @(title: 'Project ID'),
                title               @mandatory @(title: 'Project Title'),
                description         @mandatory @(title: 'Project Description'),
                scope               @mandatory @(title: 'Project Scope'),
                budget              @mandatory @(title: 'Project Budget'),
                currency            @mandatory @(title: 'Project Currency'),
                type                @mandatory @(title: 'Project Type'),
                status              @mandatory @(title: 'Project Status'),
                startDate           @mandatory @(title: 'Project Start Date'),
                endDate             @mandatory @(title: 'Project End Date'),
                manager             @mandatory @(title: 'Project Manager'),
                email               @mandatory @(title: 'Project Contact Email'),
                attachments         @(title: 'Project Attachments'),
                evaluationGuidances @(title: 'Evaluation Guidances'),
                auctions            @(title: 'Auctions'),
                virtual canActivateProject  : Boolean,
                virtual canEmbedAttachments : Boolean,
                virtual canDeleteEmbeding   : Boolean,
                virtual canEvaluateProject  : Boolean,
                virtual canCloseProject     : Boolean
        }
        actions {
            action closeProject();
            action activateProject();
            action evaluateProject();
            action embedAttachments();
            action deleteEmbeding();
        };


    entity Attachments          as projection on db.Projects.attachments;

    entity Auctions             as projection on db.Auctions;

    // EvaluationGuidances
    entity EvaluationGuidances  as projection on db.EvaluationGuidances;

    entity AttachmentEmbeddings as
        projection on db.AttachmentEmbeddings
        excluding {
            embedding
        };

    // EvaluationResults - Read-only
    @readonly
    entity EvaluationResults    as projection on db.EvaluationResults;


    @readonly
    entity Suppliers            as
        projection on external.A_BusinessPartner {
            key BusinessPartner          as ID,
                BusinessPartnerFullName  as name,
                BusinessPartnerIsBlocked as isBlocked
        };
}


annotate BidAuctionService.Attachments with {
    content @Core.AcceptableMediaTypes: ['application/pdf'];
    content @Validation.Maximum       : '50MB';
}

annotate BidAuctionService.Projects with {

    startDate @assert: (case
                            when startDate > endDate
                                 then 'Start Date must be before End Date'
                        end);

};

annotate BidAuctionService.Projects with @(
    UI.LineItem      : [
        {
            $Type: 'UI.DataField',
            Value: title,
        },
        {
            $Type: 'UI.DataField',
            Value: status,
        },
        {
            $Type: 'UI.DataField',
            Value: startDate,
        },
        {
            $Type: 'UI.DataField',
            Value: endDate,
        },
        {
            $Type             : 'UI.DataFieldForAction',
            Action            : 'BidAuctionService.activateProject',
            Label             : '{i18n>activateProject}',
            InvocationGrouping: #ChangeSet,
        },
        {
            $Type             : 'UI.DataFieldForAction',
            Action            : 'BidAuctionService.embedAttachments',
            Label             : '{i18n>embedAttachments}',
            InvocationGrouping: #ChangeSet,
        },
        {
            $Type             : 'UI.DataFieldForAction',
            Action            : 'BidAuctionService.deleteEmbeding',
            Label             : '{i18n>deleteEmbeding}',
            InvocationGrouping: #ChangeSet,
        },
        {
            $Type             : 'UI.DataFieldForAction',
            Action            : 'BidAuctionService.evaluateProject',
            Label             : '{i18n>evaluateProject}',
            InvocationGrouping: #ChangeSet,
        },
        {
            $Type             : 'UI.DataFieldForAction',
            Action            : 'BidAuctionService.closeProject',
            Label             : '{i18n>closeProject}',
            InvocationGrouping: #ChangeSet,
        },
    ],
    UI.Identification: [
        {
            $Type : 'UI.DataFieldForAction',
            Action: 'BidAuctionService.activateProject',
            Label : '{i18n>activateProject}',
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action: 'BidAuctionService.embedAttachments',
            Label : '{i18n>embedAttachments}',
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action: 'BidAuctionService.deleteEmbeding',
            Label : '{i18n>deleteEmbeding}',
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action: 'BidAuctionService.evaluateProject',
            Label : '{i18n>evaluateProject}',
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action: 'BidAuctionService.closeProject',
            Label : '{i18n>closeProject}',
        },
    ],
);

annotate BidAuctionService.Projects actions {
    activateProject  @(Core.OperationAvailable: canActivateProject);
    embedAttachments @(Core.OperationAvailable: canEmbedAttachments);
    deleteEmbeding   @(Core.OperationAvailable: canDeleteEmbeding);
    evaluateProject  @(Core.OperationAvailable: canEvaluateProject);
    closeProject     @(Core.OperationAvailable: canCloseProject);
}
