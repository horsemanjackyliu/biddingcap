using {
    cuid,
    managed,
    Currency
} from '@sap/cds/common';
using {Attachments} from '@cap-js/attachments';
using from '@sap/cds-common-content';
using {API_BUSINESS_PARTNER.A_Supplier} from '../srv/external/API_BUSINESS_PARTNER';

namespace bidauction;


type ProjectType   : String enum {
    EQUIPMENT = 'E';
    BUILDING = 'B';
    OTHERS = 'O';
};

type ProjectStatus : String enum {
    OPEN = 'O';
    ACTIVE = 'A';
    EMBEDED = 'E';
    EVALUATED = 'V';
    CLOSED = 'C';
};

type AuctionStatus : String enum {
    OPEN = 'O'      @(title: 'Open');
    SUBMITED = 'S'  @(title: 'Submitted');
    EMBEDED = 'E'   @(title: 'Embedded');
    EVALUATED = 'V' @(title: 'Evaluated');
    CLOSED = 'C' @(title: 'Closed');
};

// Code list entity for AuctionStatus values
entity AuctionStatuses {
    key code : String(1);
        name : String(50);
}

@cds.search: {description}
entity Projects : cuid, managed {
    title               : String(200) @mandatory;
    description         : LargeString;
    scope               : LargeString;
    budget              : Decimal(15, 2);
    currency            : Currency;
    type                : ProjectType default 'E';
    status              : ProjectStatus default 'O';
    startDate           : Date;
    endDate             : Date;
    manager             : String(100);
    email               : String(100) @assert.format: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$';
    attachments         : Composition of many Attachments;
    evaluationGuidances : Composition of many EvaluationGuidances
                              on evaluationGuidances.project = $self;
    auctions            : Composition of many Auctions
                              on auctions.project = $self;
}

// Auctions entity
@cds.search: {description}
entity Auctions : cuid, managed {
    project           : Association to one Projects;
    supplier          : Association to one A_Supplier;
    description       : LargeString;
    scope             : LargeString;
    amount            : Decimal(15, 2);
    currency          : Currency;
    startDate         : DateTime;
    endDate           : DateTime;
    contactPerson     : String(100);
    contactPhone      : String(50);
    contactFax        : String(50);
    email             : String(100);
    status            : AuctionStatus default 'O';
    attachments       : Composition of many Attachments;
    evaluationResults : Composition of many EvaluationResults
                            on evaluationResults.auction = $self;
}

// EvaluationGuidances entity
entity EvaluationGuidances : cuid {
    project  : Association to Projects;
    index    : Integer;
    guidance : LargeString;
}

// EvaluationResults entity
entity EvaluationResults : cuid {
    project            : Association to Projects @assert.target;
    supplier           : String(10); // Business Partner ID
    evaluationGuidance : Association to EvaluationGuidances;
    auction            : Association to Auctions;
    score              : Decimal(5, 2);
    fullscore          : Decimal(5, 2);
    confidence         : Decimal(5, 2);
    explanation        : LargeString;
}

// AttachmentEmbeddings entity - Store vector embeddings for attachments
entity AttachmentEmbeddings : cuid, managed {
    project         : UUID;
    auction         : UUID;
    attachmentID    : UUID; // Reference to the attachment ID
    text_chunk      : LargeString;
    metadata_column : LargeString;
    embedding       : Vector(3072); // Vector embedding stored as JSON string
    chunkIndex      : Integer; // For large documents split into chunks
}
