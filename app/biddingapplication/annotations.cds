using BidAuctionService as service from '../../srv/service';
annotate service.Projects with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : title,
            },
            {
                $Type : 'UI.DataField',
                Value : description,
            },
            {
                $Type : 'UI.DataField',
                Value : scope,
            },
            {
                $Type : 'UI.DataField',
                Value : budget,
            },
            {
                $Type : 'UI.DataField',
                Label : 'currency_code',
                Value : currency_code,
            },
            {
                $Type : 'UI.DataField',
                Value : type,
            },
            {
                $Type : 'UI.DataField',
                Value : status,
            },
            {
                $Type : 'UI.DataField',
                Value : startDate,
            },
            {
                $Type : 'UI.DataField',
                Value : endDate,
            },
            {
                $Type : 'UI.DataField',
                Value : manager,
            },
            {
                $Type : 'UI.DataField',
                Value : email,
            },
        ],
    },
    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'GeneratedFacet1',
            Label  : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'EvaluationGuidancesFacet',
            Label  : 'Evaluation Guidances',
            Target : 'evaluationGuidances/@UI.LineItem',
        },
    ],
);

annotate service.EvaluationGuidances with {
    guidance @UI.MultiLineText;
};

annotate service.EvaluationGuidances with @(
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Index',
            Value : index,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Guidance',
            Value : guidance,
        },
    ],
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Evaluate Guidance',
            ID : 'EvaluateGuidance',
            Target : '@UI.FieldGroup#EvaluateGuidance',
        },
    ],
    UI.FieldGroup #EvaluateGuidance : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : index,
                Label : 'index',
            },
            {
                $Type : 'UI.DataField',
                Value : guidance,
                Label : 'guidance',
            },
        ],
    },
);

