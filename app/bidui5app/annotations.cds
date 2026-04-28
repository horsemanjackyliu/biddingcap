using AuctionService as service from '../../srv/auction_service';
using from '@sap/cds/common';


annotate service.AuctionsAuc with @(
    UI.FieldGroup #GeneratedGroup: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: description,
            },
            {
                $Type: 'UI.DataField',
                Value: scope,
            },
            {
                $Type: 'UI.DataField',
                Value: amount,
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
                $Type: 'UI.DataField',
                Value: contactPerson,
            },
            {
                $Type: 'UI.DataField',
                Value: contactPhone,
            },
            {
                $Type: 'UI.DataField',
                Value: contactFax,
            },
            {
                $Type: 'UI.DataField',
                Value: email,
            },
            {
                $Type: 'UI.DataField',
                Value: status,
            },
            {
                $Type: 'UI.DataField',
                Value: project_ID,
            },
            {
                $Type: 'UI.DataField',
                Value: currency_code,
            },
            {
                $Type: 'UI.DataField',
                Value: supplier_Supplier,
            },
        ],
    },
    UI.Facets                    : [{
        $Type : 'UI.ReferenceFacet',
        ID    : 'GeneratedFacet1',
        Label : 'General Information',
        Target: '@UI.FieldGroup#GeneratedGroup',
    }, ],
    UI.LineItem                  : [
        {
            $Type: 'UI.DataField',
            Value: description,
        },
        {
            $Type: 'UI.DataField',
            Value: scope,
        },
        {
            $Type: 'UI.DataField',
            Value: amount,
        },
        {
            $Type: 'UI.DataField',
            Value: currency_code,
        },
        {
            $Type: 'UI.DataField',
            Value: startDate,
        },
        {
            $Type             : 'UI.DataFieldForAction',
            Action            : 'AuctionService.submitBid',
            Label             : '{i18n>submitBid}',
            InvocationGrouping: #ChangeSet,
        },
        {
            $Type             : 'UI.DataFieldForAction',
            Action            : 'AuctionService.embedAttachments',
            Label             : '{i18n>embedAttachments}',
            InvocationGrouping: #ChangeSet,
        },
    ],
    UI.Identification            : [
        {
            $Type : 'UI.DataFieldForAction',
            Action: 'AuctionService.submitBid',
            Label : '{i18n>submitBid}',
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action: 'AuctionService.embedAttachments',
            Label : '{i18n>embedAttachments}',
        },
    ],
);

annotate service.Currencies with {
    code @(
        Common.ValueList               : {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'Currencies',
            Parameters    : [{
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: code,
                ValueListProperty: 'code',
            }, ],
        },
        Common.ValueListWithFixedValues: true,
        Common.Text                    : descr,
        Common.Text.@UI.TextArrangement: #TextLast,
    )
};

annotate service.AuctionsAuc with {
    currency @(
        Common.Label                   : '{i18n>currency}',
        Common.ValueList               : {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'Currencies',
            Parameters    : [
                {
                    $Type            : 'Common.ValueListParameterInOut',
                    LocalDataProperty: currency_code,
                    ValueListProperty: 'code',
                },
                {
                    $Type            : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'name',
                }
            ],
        },
        Common.ValueListWithFixedValues: true,
        Common.Text                    : currency.name,
        Common.TextArrangement         : #TextFirst
    )
};

annotate service.AuctionsAuc with {
    project @(
        Common.FieldControl   : #Mandatory,
        Common.ValueList      : {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'ProjectsAuc',
            Parameters    : [
                {
                    $Type            : 'Common.ValueListParameterInOut',
                    LocalDataProperty: project_ID,
                    ValueListProperty: 'ID',
                },
                {
                    $Type            : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'title',
                }
            ],
        },
        Common.Text           : project.title,
        Common.TextArrangement: #TextFirst
    )
};

annotate service.AuctionsAuc with {
    supplier @(
        Common.ValueList      : {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'SupplierAuc',
            Parameters    : [
                {
                    $Type            : 'Common.ValueListParameterInOut',
                    LocalDataProperty: supplier_Supplier,
                    ValueListProperty: 'Supplier',
                },
                {
                    $Type            : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'SupplierName',
                }
            ],
        },
        Common.Text           : supplier.SupplierName,
        Common.TextArrangement: #TextFirst
    )
};

// Status value help with code list
annotate service.AuctionsAuc with {
    status @(
        Common.Label                   : '{i18n>status}',
        Common.ValueList               : {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'AuctionStatusesAuc',
            Parameters    : [
                {
                    $Type            : 'Common.ValueListParameterInOut',
                    LocalDataProperty: status,
                    ValueListProperty: 'code',
                },
                {
                    $Type            : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'name',
                }
            ],
        },
        Common.ValueListWithFixedValues: true,
        Common.Text                    : status,
        Common.TextArrangement         : #TextOnly
    )
};
