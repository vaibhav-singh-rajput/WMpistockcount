sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "../model/formatter"
], (Controller, MessageBox, MessageToast, Fragment, Filter, FilterOperator, formatter) => {
    "use strict";

    return Controller.extend("com.triumph.pistockcount.controller.DocumentDetail", {
        formatter: formatter,

        /* =======================================================
         * INIT
         * ======================================================= */
        onInit() {

            // Sounds
            this.errorSound = new Audio($.sap.getModulePath('com.triumph.pistockcount', '/audio/error.mp3'));
            this.successSound = new Audio($.sap.getModulePath('com.triumph.pistockcount', '/audio/success.mp3'));
            this.informationSound = new Audio($.sap.getModulePath('com.triumph.pistockcount', '/audio/information.mp3'));
            this.confirmationSound = new Audio($.sap.getModulePath('com.triumph.pistockcount', '/audio/confirm.mp3'));

            // Models
            this._oModel = this.getOwnerComponent().getModel();
            this._oAppModel = this.getOwnerComponent().getModel("appModel");
            this._oDocumentModel = this.getOwnerComponent().getModel("documentModel");
            this._oItemModel = this.getOwnerComponent().getModel("itemModel");

            this._sCurrentDocumentId = null;

            // Route  
            this.getRouter().getRoute("DocumentDetail").attachPatternMatched(this._handleRouteMatched, this);

            // Message manager
            sap.ui.getCore().getMessageManager().registerObject(this.getView(), true);
            this.initializeMessageManager();

            this._huScanChars = [];

            // Scanner key listener removed — kept your minimal logic
            $(document).unbind("keypress").bind("keypress", oEvent => { /* your scan logic kept */ });

        },

        onAfterRendering() {
            this.createMessagePopover();
        },

        /* =======================================================
         * ROUTE MATCH
         * ======================================================= */
        _handleRouteMatched(oEvent) {
            sap.ui.getCore().getMessageManager().removeAllMessages();

            const sUrlDocumentId = oEvent.getParameter("arguments").docID;
            const sSelected = this._oAppModel.getProperty("/selectedDocument");

            if (!sSelected || sUrlDocumentId !== sSelected.Ivnum) {
                return this._handleNoDocumentSelected();
            }

            if (sUrlDocumentId !== this._sCurrentDocumentId) {

                // Reset model (NO `/items` anymore)
                this._oItemModel.setData({
                    allItems: [],
                    currentPage: 1,
                    totalPages: 0,
                    itemsPerPage: 5
                }, true);

                this._sCurrentDocumentId = sUrlDocumentId;

                this._requestItemList(sUrlDocumentId);
            }
        },

        _handleNoDocumentSelected() {
            MessageBox.error("Error : No Document selected, please select any document first!", {
                onClose: () => {
                    const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                    oRouter.navTo("Main", {}, true);
                }
            });
        },

        /* =======================================================
         * LOAD ITEMS
         * ======================================================= */
        _requestItemList(sDocumentId) {

            this._oModel.read("/Items", {
                filters: [new Filter("IVNUM", "EQ", sDocumentId)],

                success: (oData) => {

                    oData.results.forEach((item, i) => {
                        item.Flag = false;
                        // item.MENGE = null;
                        item.INDEX = i; // needed for pagination filter
                    });

                    this._oItemModel.setProperty("/allItems", oData.results);

                    this._updatePagination();
                },

                error: () => {
                    MessageBox.error("Error during request of Document. Please contact admin.");
                }
            });
        },

        /* =======================================================
         * PAGINATION (FILTER BASED)
         * ======================================================= */
        _updatePagination() {
            const allItems = this._oItemModel.getProperty("/allItems") || [];
            const pageSize = this._oItemModel.getProperty("/itemsPerPage");

            const totalPages = Math.max(1, Math.ceil(allItems.length / pageSize));
            this._oItemModel.setProperty("/totalPages", totalPages);

            let currentPage = this._oItemModel.getProperty("/currentPage");
            if (currentPage > totalPages) currentPage = totalPages;
            this._oItemModel.setProperty("/currentPage", currentPage);

            this._applySearchAndPagination();
        },

        _applySearchAndPagination() {
            const sQuery = this.byId("idItemSearch")?.getValue() || "";


            ////////////////////////////////////ADDED EXTRA FOR SEARCH ISSUE NOT COMMING ON FIRST PAGE DELETE IF COUSE ANY ISSU OR REQUERED////

            let allItems = this._oItemModel.getProperty("/allItems") || [];

            // -----------------------------
            // 1. FILTER ITEMS FOR SEARCH
            // -----------------------------
            let filteredItems = allItems;
            if (sQuery) {
                const q = sQuery.toLowerCase();
                filteredItems = allItems.filter(item =>
                    (item.IVPOS && item.IVPOS.toString().includes(q)) ||
                    (item.MATNR && item.MATNR.toLowerCase().includes(q)) ||
                    (item.LGPLA && item.LGPLA.toLowerCase().includes(q)) ||
                    (item.Charg && item.Charg.toLowerCase().includes(q))
                );
            }

            // -----------------------------
            // 2. REASSIGN INDEX FOR PAGINATION
            // -----------------------------
            filteredItems.forEach((item, idx) => item.INDEX = idx);

            // -----------------------------
            // 3. UPDATE TOTAL PAGES BASED ON FILTERED ITEMS
            // -----------------------------
            const size = this._oItemModel.getProperty("/itemsPerPage");
            const totalPages = Math.max(1, Math.ceil(filteredItems.length / size));
            this._oItemModel.setProperty("/totalPages", totalPages);

            let page = this._oItemModel.getProperty("/currentPage");
            if (page > totalPages) page = totalPages;
            this._oItemModel.setProperty("/currentPage", page);




            ///////////////////////////////////////////////////////////////////////////////////////////WITHOUT ABOVE THING IT STILL WORK BUT SEARCHING WILL F**////


            // const page = this._oItemModel.getProperty("/currentPage");
            // const size = this._oItemModel.getProperty("/itemsPerPage");
            const start = (page - 1) * size;
            const end = start + size;

            const oTable = this.byId("idItemTable");
            const oBinding = oTable.getBinding("items");

            const aFilters = [];

            // Search filter  
            if (sQuery) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("IVPOS", FilterOperator.EQ, sQuery),
                        new Filter("MATNR", FilterOperator.Contains, sQuery),
                        new Filter("LGPLA", FilterOperator.Contains, sQuery),
                        new Filter("Charg", FilterOperator.Contains, sQuery)
                    ],
                    and: false
                }));
            }

            // Pagination filter  
            aFilters.push(new Filter({
                path: "INDEX",
                test: val => val >= start && val < end
            }));

            oBinding.filter(aFilters);
        },

        onPrevPage() {
            let page = this._oItemModel.getProperty("/currentPage");
            if (page > 1) {
                this._oItemModel.setProperty("/currentPage", page - 1);
                this._applySearchAndPagination();
            }
        },

        onNextPage() {
            let page = this._oItemModel.getProperty("/currentPage");
            const total = this._oItemModel.getProperty("/totalPages");

            if (page < total) {
                this._oItemModel.setProperty("/currentPage", page + 1);
                this._applySearchAndPagination();
            }
        },

        /* =======================================================
         * SEARCH
         * ======================================================= */
        onSearch(oEvent) {
            this._oItemModel.setProperty("/currentPage", 1);
            this._applySearchAndPagination();
        },

        /* =======================================================
         * SELECTION
         * ======================================================= */
        onItemSelect(oEvent) {
            const selected = oEvent.getParameter("selected");
            const ctx = oEvent.getSource().getBindingContext("itemModel");

            ctx.getModel().setProperty(ctx.getPath() + "/Flag", selected);
        },

        /* =======================================================
         * ZERO COUNT  &  INPUT COUNT VALUE CHANGE
         * ======================================================= */
        onZeroCount() {

            var allItems = this._oItemModel.getProperty("/allItems");
            const selectedItems = allItems.filter(i => i.Flag === true);

            if (selectedItems.length === 0) {
                return MessageToast.show("No items selected for zero count.");
            }

            const ivPosValues = selectedItems.map(i => i.IVPOS).join(", ");

            const oDialog = new sap.m.Dialog({
                title: "Confirm Zero Count",
                type: "Message",
                content: new sap.m.Text({
                    text: `Submit zero count for items: (${ivPosValues})?`
                }),
                beginButton: new sap.m.Button({
                    text: "OK",
                    type: "Emphasized",
                    press: () => {

                        allItems.forEach(item => {
                            if (item.Flag === true) {
                                item.MENGE = 0;
                                item.Flag = false;
                            }
                        });

                        this._oItemModel.setProperty("/allItems", allItems);
                        this._oItemModel.refresh(true);

                        // this._applySearchAndPagination();

                        this.successSound.play();
                        MessageToast.show("Zero count applied successfully");

                        oDialog.close();
                    }
                }),
                endButton: new sap.m.Button({
                    text: "Cancel",
                    press: () => oDialog.close()
                }),
                afterClose: () => oDialog.destroy()
            });

            oDialog.open();
        },

        onInputCountChange: function () {
            this._oItemModel.refresh(true);
        },

        /* =======================================================
         * DRAFT & SUBMIT
         * ======================================================= */
        _openConfirmDialog(action) {
            this._pendingAction = action;

            const allItems = this._oItemModel.getProperty("/allItems") || [];

            const filtered = allItems.filter(item =>
                item.MENGE !== null &&
                item.MENGE !== "" &&
                !isNaN(Number(item.MENGE))
            );

            const oConfirmModel = new sap.ui.model.json.JSONModel({ items: filtered });
            this.getView().setModel(oConfirmModel, "confirmModel");

            if (!this._oConfirmDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "com.triumph.pistockcount.view.fragment.ConfirmDialog",
                    controller: this
                }).then(oDialog => {
                    this._oConfirmDialog = oDialog;
                    this.getView().addDependent(oDialog);
                    oDialog.open();
                });
            } else {
                this._oConfirmDialog.open();
            }
        },

        onConfirmOk() {
            this._oConfirmDialog.close();

            if (this._pendingAction === "draft") this._callODataSaveDraft();
            if (this._pendingAction === "submit") this._callODataSubmit();
        },

        onConfirmCancel() {
            this._oConfirmDialog.close();
        },

        // onSaveDraft() { this._openConfirmDialog("draft"); },
        // onSubmit() { this._openConfirmDialog("submit"); },

        //Button clicks
        onSaveDraft() { this.onErrorCheck("draft"); },
        onSubmit() { this.onErrorCheck("submit"); },

        /* =======================================================
         * ERROR CHECK BEFORE SUBMIT
         * ======================================================= */
        onErrorCheck(action) {

            sap.ui.getCore().getMessageManager().removeAllMessages();

            const allItems = this._oItemModel.getProperty("/allItems") || [];

            const counted = allItems.filter(i => i.MENGE !== null && i.MENGE !== "");

            if (counted.length === 0) {
                this.createErrorMessage("Please start Counting first.", "");
                this.refreshMessagePopover();
                return;
            }

            let errors = 0;

            counted.forEach(item => {
                const v = Number(item.MENGE);

                if (!/^[0-9]+$/.test(item.MENGE)) {
                    this.createErrorMessage("Only integer numbers (0–9) allowed", "");
                    errors++;
                }

                if (v < 0) {
                    this.createErrorMessage(`Batch ${item.Charg}: Count less than limit`, "");
                    errors++;
                }

                if (v >= 999999999999999) {
                    this.createErrorMessage(`Batch ${item.Charg}: Count more than limit`, "");
                    errors++;
                }
            });

            if (errors !== 0) this.refreshMessagePopover();

            if (errors === 0) {
                sap.ui.getCore().getMessageManager().removeAllMessages();
                this._openConfirmDialog(action);
            }
        },

        /* =======================================================
         * BACKEND CALLS
         * ======================================================= */
        //Draft
        _callODataSaveDraft() {

            const items = this._oItemModel.getProperty("/allItems");

            this._oModel.create("/DraftSaveSet", { Items: items }, {
                success: () => {
                    MessageToast.show("Draft saved successfully");
                    this.onNavToMain();
                },
                error: () => MessageToast.show("Error while saving draft")
            });
        },

        //Submit
        _odataCreate: function (sPath, oPayload) {
            return new Promise((resolve, reject) => {
                this._oModel.create(sPath, oPayload, {
                    success: resolve,
                    error: reject
                });
            });
        },

        async _callODataSubmit() {
            const oView = this.getView();
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            const items = this._oItemModel.getProperty("/allItems");

            try {
                oView.setBusy(true);               // Busy ON

                // --- OData call in async way ---
                await this._odataCreate("/SubmitSet", { Items: items });

                // Artificial delay only for testing busy indicator visibility
                await new Promise(resolve => setTimeout(resolve, 3000));

                oView.setBusy(false);              // Busy OFF

                await new Promise(resolve => {
                    MessageBox.success(
                        "Count for the Material is saved successfully in SAP. Please select PI Document to start counting.",
                        {
                            onClose: resolve        // Continue after user closes the dialog
                        }
                    );
                });

                oRouter.navTo("Main", {}, true);

            } catch (oError) {
                // Artificial delay only for testing busy indicator visibility
                await new Promise(resolve => setTimeout(resolve, 3000));
                oView.setBusy(false);              // Busy OFF
                await new Promise(resolve => {
                    MessageBox.error(
                        "Error while submitting: Please try again.",
                        { onClose: resolve }
                    );
                });
            }
        },


        /* =======================================================
         * SCANNER
         * ======================================================= */
        onScannerIconPress() {
            const oInput = this.byId("idInputScanner");
            oInput.setValue("");
            setTimeout(() => oInput.focus(), 100);
            MessageToast.show("Scan...");
        },

        onScannerInputChange(oEvent) {
            if (!oEvent.mParameters.newValue) return;
            this._huScanChars = [];
            const scanned = oEvent.mParameters.newValue;
            if (this.validateAndUpdateScannedBatch(scanned)) return;
        },

        validateAndUpdateScannedBatch(scanned_ean) {
            const all = this._oItemModel.getProperty("/allItems") || [];
            let updated = false;

            all.forEach(item => {
                if (item.Charg === scanned_ean) {
                    const current = Number(item.MENGE);
                    const safe = isNaN(current) ? 0 : current;
                    item.MENGE = safe + 1;
                    updated = true;
                }
            });

            if (updated) {

                this.byId("idItemSearch").setValue(scanned_ean);
                this.byId("idItemSearch").fireLiveChange({ newValue: scanned_ean });

                this.successSound.play();

                this._oItemModel.setProperty("/allItems", all);
                this._oItemModel.refresh(true);

                this._applySearchAndPagination();

            } else {
                this.byId("idItemSearch").setValue("");
                this.byId("idItemSearch").fireLiveChange({ newValue: "" });
                this.errorSound.play();
            }

            this.resetScannerInput();
            return updated;
        },

        resetScannerInput() {
            const i = this.byId("idInputScanner");
            i.setValue("");
            i.focus();
        },

        /* =======================================================
         * NAVIGATION
         * ======================================================= */

        onNavToMain: function () {
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("Main", {}, true);
        },

        onNavToNewEntry: function () {
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("NewEntry", {}, true);
        },
    });
});
