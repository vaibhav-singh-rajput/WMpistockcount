sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "../model/formatter",

], (Controller, MessageBox, Fragment, Filter, FilterOperator, formatter) => {
    "use strict";

    return Controller.extend("com.triumph.pistockcount.controller.Main", {
        formatter: formatter,

        onInit() {

            this.errorSound = new Audio($.sap.getModulePath('com.triumph.pistockcount', '/audio/error.mp3'));
            //@ts-ignore
            this.successSound = new Audio($.sap.getModulePath('com.triumph.pistockcount', '/audio/success.mp3'));
            //@ts-ignore
            this.informationSound = new Audio($.sap.getModulePath('com.triumph.pistockcount', '/audio/information.mp3'));
            //@ts-ignore
            this.confirmationSound = new Audio($.sap.getModulePath('com.triumph.pistockcount', '/audio/confirm.mp3'));

            this._oModel = this.getOwnerComponent().getModel();
            this._oAppModel = this.getOwnerComponent().getModel("appModel");
            this._oDocumentModel = this.getOwnerComponent().getModel("documentModel");

            // remove for taking Warehouse input from user - skiping for development
            // this._oAppModel.setProperty("/selectedWarehouse", "AU1");

            this.getRouter().getRoute("Main").attachPatternMatched(this._handleRouteMatched, this);

        },
        _handleRouteMatched: function (oEvent) {
            console.log("_handleRouteMatched");

            if (this._oAppModel.getProperty("/selectedWarehouse")) {
                this._requestDocumentList();
            } else {
                // Show dialog when view is loaded
                this._openWarehouseDialog();
            }
        },


        /* =========================================================== */
        /* Just For Dev- Mock Server using Json                        */
        /* =========================================================== */
        readTest: function () {
            var oModel = this.getOwnerComponent().getModel();
            oModel.read("/Products", {
                method: "GET",
                success: (oData) => {
                    console.log(oData);
                },
                error: (oError) => {
                    MessageBox.error("Error : " + oError.responseText, {
                        emphasizedAction: MessageBox.Action.CLOSE
                    });
                    console.error("Error during readTest.");
                }
            });
        },
        createTest: function () {
            var oPayload = {
                "ID": 5,
                "Name": "Product E",
                "Price": 500
            };

            var oModel = this.getOwnerComponent().getModel();
            oModel.create("/Products", oPayload, {
                method: "POST",
                success: (oData) => {
                    console.log(oData);
                },
                error: (oError) => {
                    MessageBox.error("Error : " + oError.responseText, {
                        emphasizedAction: MessageBox.Action.CLOSE
                    });
                    console.error("Error during createTest.");
                },
            });
        },
        updateTest: function () {
            var oPayload = {
                "ID": 5,
                "Name": "Product E",
                "Price": 500
            };

            var oModel = this.getOwnerComponent().getModel();
            oModel.update("/Products", oPayload, {
                success: (oData) => {
                    console.log(oData);
                },
                error: (oError) => {
                    MessageBox.error("Error : " + oError.responseText, {
                        emphasizedAction: MessageBox.Action.CLOSE
                    });
                    console.error("Error during removeTest");
                },
            });
        },
        /* =========================================================== */


        /* =========================================================================== */
        /* For Dialog of Enter Warehous Number and loading  data with warehouse Number */
        /* ============================================================================ */
        // --- Dialog Handling ---
        _openWarehouseDialog: function () {
            if (!this._oDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "com.triumph.pistockcount.view.fragment.WarehouseDialog",
                    controller: this
                }).then((oDialog) => {
                    this._oDialog = oDialog;
                    this.getView().addDependent(this._oDialog);
                    this._oDialog.open();
                });
            } else {
                this._oDialog.open();
            }
        },
        onSubmitWarehouse: function () {
            let oInput = this.byId("idWarehouseInput");
            let sWarehouse = this.byId("idWarehouseInput").getValue();
            if (!sWarehouse) {
                MessageBox.warning("Please enter a warehouse number.");
                return;
            }
            // Allow only letters + numbers, no spaces, no special chars
            let bValid = /^[A-Za-z0-9]*$/.test(sWarehouse);

            if (!bValid || sWarehouse.length === 0) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Only letters and numbers allowed (no spaces or special characters).");
                return;
            } else {
                oInput.setValueState("None");
            }
            this._oAppModel.setProperty("/selectedWarehouse", sWarehouse.toUpperCase());
            this._oDialog.close();
            this._requestDocumentList(sWarehouse);
        },
        /* ============================================================================ */


        /* =========================================================================== */
        /* For loading  data with warehouse Number                                      */
        /* ============================================================================ */
        _requestDocumentList: function () {
            // this._oModel.read("/InvHeaderSet", {
            this._oModel.read("/PhyInvInfoSet", {
                method: "GET",
                filters: [
                    new Filter(
                        "Whse",
                        "EQ",
                        this._oAppModel.getProperty("/selectedWarehouse"))
                ],
                success: (oData) => {
                    this.successSound.play();
                    this.successSound.volume = 0.01;
                    console.debug("Document list oData response:\n", oData);
                    this._oDocumentModel.setProperty("/documents", oData.results);
                },
                error: () => {
                    this.errorSound.play();
                    MessageBox.error("Error during request of Document. Please contact an application administrator.");
                }
            });
        },


        /* =========================================================================== */
        /* Data Menuplation Of Table                                                   */
        /* =========================================================================== */

        /* Sorting Document Table */
        onFilterInventoryStatus: function (oEvent) {
            console.log("inventory statusfilter");
            var oButton = oEvent.getSource();
            var oView = this.getView();

            // Create popover only once and reuse
            if (!this._oStatusFilterPopover) {
                this._oStatusFilterPopover = new sap.m.ResponsivePopover({
                    showHeader: false, // 🔥 removes the header/title
                    placement: "VerticalPreferredBottom",
                    content: [
                        new sap.m.Select({
                            id: oView.createId("statusFilterSelect"),
                            width: "12rem",
                            items: [
                                new sap.ui.core.Item({ key: "", text: "All" }),
                                new sap.ui.core.Item({ key: "A", text: "Partially Counted" }),
                                new sap.ui.core.Item({ key: "N", text: "Not Counted" })
                            ],
                            change: this.onStatusFilterChange.bind(this)
                        })
                    ]
                });
                oView.addDependent(this._oStatusFilterPopover);
            }

            // Open popover next to filter button
            this._oStatusFilterPopover.openBy(oButton);

        },

        /*Status Filter */
        onStatusFilterChange: function (oEvent) {
            var sSelectedKey = oEvent.getParameter("selectedItem").getKey();
            var oTable = this.byId("idWarehouseTable");
            var oBinding = oTable.getBinding("items");

            if (sSelectedKey) {
                var oFilter = new sap.ui.model.Filter("InvStatus", sap.ui.model.FilterOperator.EQ, sSelectedKey);
                oBinding.filter([oFilter]);
            } else {
                oBinding.filter([]); // Show all if "All" is selected
            }
        },

        /* Searching On Table */
        onSearch: function (oEvent) {
            const sQuery = oEvent.getParameter("newValue");
            const oTable = this.byId("idWarehouseTable");
            const oBinding = oTable.getBinding("items");

            // Create filter for both columns
            const aFilters = [];
            if (sQuery && sQuery.length > 0) {
                aFilters.push(new sap.ui.model.Filter({
                    filters: [
                        new sap.ui.model.Filter("Ivnum", sap.ui.model.FilterOperator.EQ, sQuery),
                        new sap.ui.model.Filter("InvStatus", sap.ui.model.FilterOperator.Contains, sQuery)
                    ],
                    and: false // OR condition
                }));
            }

            // Apply the filter
            oBinding.filter(aFilters);
        },


        /* =========================================================================== */
        /* Navigations                                                                 */
        /* ============================================================================ */

        /* Navigation Document Table */
        onWarehouseItemPress: function (oEvent) {
            // Get the binding context of the pressed row
            var oSelectedItem = oEvent.getSource();
            var oContext = oSelectedItem.getBindingContext("documentModel");
            var oSelectedDocument = oContext.getObject(); // This will be the data of the selected row

            // Set the selected document to the appModel property "/selectedDocument"
            this._oAppModel.setProperty("/selectedDocument", oSelectedDocument);

            // You can now navigate or perform other actions, e.g., routing
            this._navigateToDetailPage(oSelectedDocument);
        },

        // Optionally, define a navigation function if you want to route to another page
        _navigateToDetailPage: function (oSelectedDocument) {
            // Pass the Ivnum (Document ID) as part of the route parameters
            var sDocID = oSelectedDocument.Ivnum;  // Assuming Ivnum is the Document ID

            // Navigate to the DocumentDetail page with the docID parameter
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("DocumentDetail", {
                docID: sDocID  // Pass the docID as the parameter to the route
            });
        },

    });
});