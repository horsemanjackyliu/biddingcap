using BidAuctionService as service from '../../srv/service';
annotate service.EvaluationResults with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : project.description,
            },
            {
                $Type : 'UI.DataField',
                Value : evaluationGuidance.guidance,
                Label : 'guidance',
            },
            {
                $Type : 'UI.DataField',
                Value : auction.supplier_Supplier,
                Label : 'supplier_Supplier',
            },
            {
                $Type : 'UI.DataField',
                Label : 'supplier',
                Value : supplier,
            },
            {
                $Type : 'UI.DataField',
                Label : 'score',
                Value : score,
            },
            {
                $Type : 'UI.DataField',
                Value : fullscore,
                Label : 'fullscore',
            },
            {
                $Type : 'UI.DataField',
                Label : 'confidence',
                Value : confidence,
            },
            {
                $Type : 'UI.DataField',
                Label : 'explanation',
                Value : explanation,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : project.description,
        },
        {
            $Type : 'UI.DataField',
            Value : auction.supplier_Supplier,
            Label : 'supplier_Supplier',
        },
        {
            $Type : 'UI.DataField',
            Value : evaluationGuidance.index,
            Label : 'index',
        },
        {
            $Type : 'UI.DataField',
            Value : evaluationGuidance.guidance,
            Label : 'guidance',
        },
        {
            $Type : 'UI.DataField',
            Label : 'supplier',
            Value : supplier,
        },
        {
            $Type : 'UI.DataField',
            Label : 'score',
            Value : score,
        },
        {
            $Type : 'UI.DataField',
            Value : fullscore,
            Label : 'fullscore',
        },
        {
            $Type : 'UI.DataField',
            Label : 'confidence',
            Value : confidence,
        },
        {
            $Type : 'UI.DataField',
            Label : 'explanation',
            Value : explanation,
        },
    ],
);

annotate service.EvaluationResults with {
    project @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Projects',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : project_ID,
                ValueListProperty : 'ID',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'title',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'description',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'scope',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'budget',
            },
        ],
    }
};

annotate service.EvaluationResults with {
    evaluationGuidance @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'EvaluationGuidances',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : evaluationGuidance_ID,
                ValueListProperty : 'ID',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'index',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'guidance',
            },
        ],
    }
};

annotate service.EvaluationResults with {
    auction @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Auctions',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : auction_ID,
                ValueListProperty : 'ID',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'supplier_Supplier',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'description',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'scope',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'amount',
            },
        ],
    }
};

