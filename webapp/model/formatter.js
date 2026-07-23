sap.ui.define([], function () {
    "use strict";
    return {
        poActionFormatter(sDocumentType) {
            switch (sDocumentType) {
                case "S": // Standard PO -> Goods Receipt
                    return "Goods Receipt";
                case "F": // Framework PO -> Service Entry Sheet
                    return "Service Entry Sheet";
                default:
                    return "N/A";
            }
        },
        draftCount(oDraftModel) {
            return oDraftModel.filter ? oDraftModel.filter((oElement) => oElement.purpose === "D").length : null;
        },

        templateCount(oDraftModel) {
            return oDraftModel.filter ? oDraftModel.filter((oElement) => oElement.purpose === "T").length : null;
        },

        draftTemplateCompanyCodeFormatter(aCompanyCodes) {
            // Remove duplicates and concatinate with "; "
            return [... new Set(aCompanyCodes)].join("; ");
        },

        /**
         *  Main View
         */
        inventoryStatusFormatter(_ISTAT) {
            switch (_ISTAT) {
                case "A":
                    return "Partially Counted";
                case "N":
                    return "Not Counted";

                default:
                    return _ISTAT;
            }

        },

        /**
         *  Document Detail View
         */

        countedTotal: function (items) {
            if (!Array.isArray(items)) {
                return "0 / 0";
            }

            const total = items.length;

            const counted = items.filter(function (i) {
                return i &&
                    i.MENGE !== undefined &&
                    i.MENGE !== null &&
                    i.MENGE !== "" &&
                    !isNaN(i.MENGE);
            }).length;

            return counted + " / " + total;
        },

        validateInteger: function (value) {
            // Check: value must be only digits AND a valid number >= 0
            return value;
        },

        valueStateInteger: function (value) {
            // Import ValueState
            var ValueState = sap.ui.core.ValueState;
            // If value is empty or null, don't show error
            if (value === null || value === undefined || value === "") {
                return ValueState.None;
            }

            return /^\d+$/.test(value) ? ValueState.None : ValueState.Error;
        },



    };
});