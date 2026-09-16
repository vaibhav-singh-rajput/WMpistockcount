
sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/core/Fragment",
  "../model/formatter"
], (BaseController, JSONModel, MessageBox, MessageToast, Filter, FilterOperator, Fragment, formatter) => {
  "use strict";
  return BaseController.extend("com.triumph.pistockcount.controller.NewEntry", {
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
      this._sCurrentDocument = null;
      this._sCurrentStorageBin = null;

      //Set focus into first field of page - scanner
      var that = this;
      this.getView().addEventDelegate({
        onAfterShow: function (evt) {
          setTimeout(function () {
            document.getElementById(that.getView().byId("idInputScanner").getFocusDomRef().id).focus();
          }, 2000);
        }
      });
      // remove after development complition 
      this._DevMode = false;
      this.getRouter().getRoute("NewEntry").attachPatternMatched(this._handleRouteMatched, this);
      // Validation and -message manager
      sap.ui.getCore().getMessageManager().registerObject(this.getView(), true);
      this.initializeMessageManager();
    },
    _handleRouteMatched: function (oEvent) {
      console.log("_handleRouteMatched-NewEntry");
      if (this._DevMode) {
        this.createFreshEntry();
      } else {
        if (this._oAppModel.getProperty("/selectedWarehouse") && this._oAppModel.getProperty("/selectedDocument") && this._oAppModel.getProperty("/selectedStorageBin")) {
          if (this._sCurrentDocument && this._sCurrentStorageBin) {
            if (this._sCurrentDocument == this._oAppModel.getProperty("/selectedDocument") && this._sCurrentStorageBin == this._oAppModel.getProperty("/selectedStorageBin")) {
              console.log("Skipped  as this._sCurrentDocument == this._oAppModel.getProperty(/selectedDocument) && this._sCurrentStorageBin == this._oAppModel.getProperty(/selectedStorageBin) ");
            } else {
              this._sCurrentDocument = this._oAppModel.getProperty("/selectedDocument");
              this._sCurrentStorageBin = this._oAppModel.getProperty("/selectedStorageBin");
              this.createFreshEntry(); //current doc and selected doc mis match
              console.log("Fresh entry created as this._sCurrentDocument != this._oAppModel.getProperty(/selectedDocument) ");
            }
          } else {
            this._sCurrentDocument = this._oAppModel.getProperty("/selectedDocument");
            this._sCurrentStorageBin = this._oAppModel.getProperty("/selectedStorageBin");
            this.createFreshEntry();
            console.log("Fresh entry created _sCurrentDocument was null");
          }
        } else {
          this._navigateToMain();
        }
      }
    },
    onAfterRendering: function (oEvent) {
      // Initialize -message manager
      this.createMessagePopover();
    },
    createFreshEntry: function () {
      const oComponent = this.getOwnerComponent();
      // Check if a previous model exists (user navigated back)
      let oEntryModel = oComponent.getModel("entryModel");
      // if (!oEntryModel) {
      // First time open -> Create model with 10 blank rows
      oEntryModel = new JSONModel({
        Items: this._getInitialRows(10, this._sCurrentStorageBin)
      });
      // Attach model to Component (persist between navigations)
      oComponent.setModel(oEntryModel, "entryModel");
      // }
      // Attach same model to the view
      this.getView().setModel(oEntryModel, "entryModel");
      this._oEntryModel = this.getView().getModel("entryModel");
      // this._initialiseSelects();//No need of Batch and Bin laoding
      //Clearing all error  message after fresh entry created -message manager
      sap.ui.getCore().getMessageManager().removeAllMessages();
    },
    // Optionally, define a navigation function if you want to route to another page
    _navigateToMain: function () {
      var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
      oRouter.navTo("Main");
    },
    // onAfterRendering: function () {
    //   var oInput = this.byId("idInputScanner");
    //   if (oInput) {
    //     oInput.focus();
    //   }
    // },
    // Create N empty rows
    _getInitialRows(count, stgBin) {
      const blank = {
        Matnr: "", Werks: "", LGORT: "", Batch: "",
        Lgtyp: "", Lgpla: stgBin, CountedQty: null, Meins: "",
        ISEIT: null, GrDate: "",
        ERROR: false,
        MESSAGE: ""
      };
      return Array.from({ length: count }, () => ({ ...blank }));
    },
    /** -------------------------------------------------------
     * ADD ROW BUTTON
     * -------------------------------------------------------*/
    onAddRow() {
      const stgBin = this._sCurrentStorageBin;
      const oModel = this.getView().getModel("entryModel");
      const items = oModel.getProperty("/Items");
      items.push({
        Matnr: "", Werks: "", LGORT: "", Batch: "",
        Lgtyp: "", Lgpla: stgBin, CountedQty: null, Meins: "",
        ISEIT: null, GrDate: "",
        ERROR: false,
        MESSAGE: ""
      });
      oModel.refresh();
    },
    /** -------------------------------------------------------
     * DELETE ROW
     * -------------------------------------------------------*/
    onDeleteRow(oEvent) {
      const oEntryModel = this.getView().getModel("entryModel");
      const index = oEvent.getSource().getBindingContext("entryModel").getPath().split("/")[2];
      const items = oEntryModel.getProperty("/Items");
      items.splice(index, 1);
      oEntryModel.refresh();
    },
    /** -------------------------------------------------------
     * VALIDATE QUANTITY
     * -------------------------------------------------------*/
    validateQty(oEvent) {
      let value = oEvent.getParameter("value");
      let input = oEvent.getSource();
      // input.setValueState(/^\d+$/.test(value) ? "None" : "Error");
      // input.setValueState(Number.isInteger(value) && (value) >= 0 ? "None" : "Error");
      input.setValueState(this.formatter.valueStateInteger(value));

    },
    /** -------------------------------------------------------
     * SUBMIT
     * -------------------------------------------------------*/
    async onSubmit() {

      const oEntryModel = this.getView().getModel("entryModel");
      const allItems = oEntryModel.getProperty("/Items");

      // Only submit rows that passed error check
      const itemsToSubmit = allItems.filter(item => !item.ERROR && item.CountedQty !== null && item.CountedQty !== "");

      let success = 0, error = 0;

      // Reset messages before submission
      itemsToSubmit.forEach(item => { item.MESSAGE = ""; });
      console.log(itemsToSubmit);
      itemsToSubmit.forEach(item => {
        item.Whse = this._oAppModel.getProperty("/selectedWarehouse");
        item.Ivnum = this._sCurrentDocument.Ivnum;
      });
      console.log(itemsToSubmit);

      var aOriginalData = itemsToSubmit;
      // Assuming aOriginalData is your array of objects
      var aPayload = aOriginalData.map(function (oItem) {
        return {
          Matnr: oItem.Matnr,
          Werks: oItem.Werks,
          Batch: oItem.Batch,
          Lgtyp: oItem.Lgtyp,
          Lgpla: oItem.Lgpla,
          CountedQty: oItem.CountedQty,
          Uom: oItem.Meins, // Mapping Meins to Uom
          // GrDate: oItem.GrDate,
          Whse: oItem.Whse,
          Ivnum: oItem.Ivnum
        };
      });


      const deepEntityDataPayload = {
        Whse: this._oAppModel.getProperty("/selectedWarehouse"),
        Ivnum: this._sCurrentDocument.Ivnum,
        Action: "NEW_ITEM",
        AddPiItemSet: aPayload
      };

      try {
        await this._saveToBackend(deepEntityDataPayload); // Submit to backend
        // for (let item of itemsToSubmit) {
        //   try {
        //     await this._saveToBackend(item); // Submit to backend
        //     item._DELETE = true;             // Mark as successfully submitted
        //     success++;
        //   } catch (err) {
        //     item.ERROR = true;               // Mark as failed
        //     item.MESSAGE = err.message;
        //     error++;
        //   }
        // }

        // Keep only rows that were not successfully submitted
        const remainingRows = allItems.filter(item => !item._DELETE);
        oEntryModel.setProperty("/Items", remainingRows);
        oEntryModel.refresh(true);

        MessageBox.information(
          `${success} items submitted successfully.\n${error} failed.`
        );
      } catch (err) {
        // item.ERROR = true;               // Mark as failed
        // item.MESSAGE = err.message;
        // error++;
        MessageBox.error(
          `${err.message.value}`
        );
      }
    },

    _saveToBackend(oPayload) {
      return new Promise((resolve, reject) => {
        this._oModel.create("/PhyInvInfoSet", oPayload, {
          success: resolve,
          error: (oError) => {
            this.stopBusyIndicatorManually();
            reject(oError);
          }
        });
      });
    },

    /* =======================================================
     * DRAFT & SUBMIT
     * ======================================================= */
    _openConfirmDialog() {

      const oEntryModel = this.getView().getModel("entryModel");
      const allItems = oEntryModel.getProperty("/Items");

      // Only submit rows that passed error check
      const itemsToSubmit = allItems.filter(item => !item.ERROR && item.CountedQty !== null && item.CountedQty !== "");

      const oConfirmModel = new sap.ui.model.json.JSONModel({ items: itemsToSubmit });
      this.getView().setModel(oConfirmModel, "confirmModel");

      if (!this._oConfirmDialog) {
        Fragment.load({
          id: this.getView().getId(),
          name: "com.triumph.pistockcount.view.fragment.NewEntryConfirmDialog",
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
      this.onSubmit();
    },

    onConfirmCancel() {
      this._oConfirmDialog.close();
      return false;
    },
    /**
     * Validate if all mandatory information is set and valid before and store item 
     * in prModel in case. Afterwards navigate back to line item overview
     * @param {*} oEvent 
     */

    /* =======================================================
     * ERROR CHECK BEFORE SUBMIT - AGGREGATED ERRORS PER ROW
     * ======================================================= */
    onErrorCheckForSubmit() {

      sap.ui.getCore().getMessageManager().removeAllMessages();
      const oEntryModel = this.getView().getModel("entryModel");
      const allItems = oEntryModel.getProperty("/Items");

      // Filter out rows where quantity is not entered
      const countedItems = allItems.filter(item => item.CountedQty !== null && item.CountedQty !== "");

      if (countedItems.length === 0) {
        this.createErrorMessage("Please fill in at least one row before submitting.", "");
        this.refreshMessagePopover();
        return false; // Stop submission
      }

      let errors = 0;

      countedItems.forEach(item => {
        // Reset previous error info
        item.ERROR = false;
        item.MESSAGE = "";

        // Collect all errors for this row
        let rowErrors = [];


        // Quantity check
        const qty = Number(item.CountedQty);
        if (!/^[0-9]+$/.test(item.CountedQty)) {
          rowErrors.push("Only integer numbers allowed for quantity");
        } else if (qty <= 0) {
          rowErrors.push("Quantity must be greater than 0");
        } else if (qty >= 999999999999999) {
          rowErrors.push("Quantity exceeds maximum limit");
        }

        // Other required fields
        // if (!item.Matnr) rowErrors.push("Material");
        // if (!item.Matnr) rowErrors.push("Plant");
        // if (!item.LGORT) rowErrors.push("Storage Loc.");
        if (!item.Batch) rowErrors.push("Batch");
        if (!item.Lgpla) rowErrors.push("Bin");
        if (!item.Lgpla) rowErrors.push("Stor Type");
        if (!item.Meins) rowErrors.push("UOM");
        // if (!item.ISEIT) rowErrors.push("Inventory Page");
        // if (!item.GrDate) rowErrors.push("GR Date");
        if (rowErrors.length !== 0) rowErrors.push("should not be Empty.");

        // If any errors found, mark row and create aggregated message
        if (rowErrors.length > 0) {
          item.ERROR = true;
          errors++;
          const title = item.Matnr || "New Row";
          const description = rowErrors.join(", ");
          this.createErrorMessage(title, description);
        }
      });

      // oEntryModel.refresh(true);

      if (errors > 0) {
        this.refreshMessagePopover();
        return false; // Prevent submit
      }

      this._openConfirmDialog();
      return true; // All validations passed
    },


    /** -------------------------------------------------------
     * BACK / CANCEL
     * -------------------------------------------------------*/
    onPressNavigateBack() {
      MessageBox.confirm("Are you sure you want to cancel creation?", {
        onClose: action => {
          if (action === "OK") {
            window.history.go(-1);
            //clear  message while moving back -message manager
            sap.ui.getCore().getMessageManager().removeAllMessages();
          }
        }
      });
    },
    onPressButtonCancelCreation: async function (oEvent) {
      await this.getRouter().navTo("LineItemOverview");
      sap.ui.getCore().getMessageManager().removeAllMessages();
    },




















    /** -------------------------------------------------------
     * VALUE HELP EVENTS & Utils
     * -------------------------------------------------------*/




    //Loading Data for all Value Helps
    _initialiseSelects: function () {
      // Initialise Batch Input value Help
      this._oModel.read("/InvNewEntryBatchSet", {
        method: "GET",
        success: (oData) => {
          var oResponseModel = new JSONModel(oData.results);
          this.getView().setModel(oResponseModel, "batchModel");
        },
        error: (oError) => {
          MessageBox.error("Error during request of Batch. Please contact an application administrator.");
        }
      });
      // Initialise material Input value Help
      this._oModel.read("/InvNewEntryBinSet", {
        method: "GET",
        success: (oData) => {
          var oResponseModel = new JSONModel(oData.results);
          this.getView().setModel(oResponseModel, "binModel");
        },
        error: (oError) => {
          MessageBox.error("Error during request of Bin. Please contact an application administrator.");
        }
      });
    },
    onSubmitMaterial: function (oEvent) {
      var sSelectedKey = oEvent.getSource().getValue();
      if (!this._oVHInput || !this._sVHPath) return;
      var oModel = this.getView().getModel("entryModel");
      if (sSelectedKey) {
        // Write Matnr to the correct row
        oModel.setProperty(this._sVHPath + "/Matnr", sSelectedKey);
        // Update input field UI
        this._oVHInput.setValue(sSelectedKey);
      }
      // Cleanup
      this._oVHInput = null;
      this._sVHPath = null;








      // var sSelectedKey = oEvent.getSource().getValue();
      // const oModel = this.getView().getModel("entryModel");
      // // const items = oModel.getProperty("/Items");
      // oModel.setProperty("/Items/0/Matnr", sSelectedKey);
      // MessageBox.information(
      //   "Selected materia is : " + sSelectedKey
      // );
    },
    //////Old onSubmitBatch
    // onSubmitBatch: function (oEvent) {
    //   var oInput = oEvent.getSource();
    //   var oContext = oInput.getBindingContext("entryModel");
    //   var sPath = oContext.getPath();
    //   var iIndex = parseInt(sPath.split("/").pop());
    //   console.log("Row index:", iIndex);
    //   console.log("Binding path:", sPath);
    //   var sValue = oInput.getValue();
    //   var oTableModel = this.getView().getModel("entryModel");
    //   var aItems = oTableModel.getProperty("/Items");

    //   var _isBatchSelected = this.isBatchSelected(sValue);
    //   if (_isBatchSelected !== -1) {
    //     sap.m.MessageToast.show("Batch already used in another row.");
    //     // Reset input + model value
    //     oInput.setValue("");
    //     aItems[iIndex].Batch = "";
    //     oTableModel.setProperty("/Items", aItems);
    //     oTableModel.refresh(true);
    //     return;
    //   }
    //   aItems[iIndex].Batch = sValue;
    //   oTableModel.setProperty("/Items", aItems);
    //   oTableModel.refresh(true);
    // },
    onSubmitBatch: function (oEvent) {
      const oInput = oEvent.getSource();
      const oContext = oInput.getBindingContext("entryModel");
      if (!oContext) return;  // safety
      const sPath = oContext.getPath();   // "/Items/3"
      const iIndex = parseInt(sPath.split("/").pop());
      const oEntryModel = this.getView().getModel("entryModel");
      const aItems = oEntryModel.getProperty("/Items");
      const sValue = oInput.getValue();
      // 👉 Check if any object in batchModel has Batch equal to newValue
      var batchModel = this.getView().getModel("batchModel").getData();
      var oSelecteBatchData = batchModel.filter(function (item) {
        return item.Batch === sValue;
      });
      if (!oSelecteBatchData) {
        MessageToast("Unable to find batch");
        return;
      }
      // ✔️ Set batch to this row
      // oEntryModel.setProperty("/Items/" + iIndex + "/Batch", sValue);
      // ✔️ Example: update additional fields in the same row
      oEntryModel.setProperty("/Items/" + iIndex + "/Matnr", oSelecteBatchData[0].Matnr);
      oEntryModel.setProperty("/Items/" + iIndex + "/Werks", oSelecteBatchData[0].Werks);
      oEntryModel.setProperty("/Items/" + iIndex + "/LGORT", oSelecteBatchData[0].Lgort);
      oEntryModel.setProperty("/Items/" + iIndex + "/Meins", oSelecteBatchData[0].Meins);
      oEntryModel.setProperty("/Items/" + iIndex + "/CountedQty", 1);
      oEntryModel.refresh(true);
      this.successSound.play();
    },
    isBatchSelected: function (sValueBatchTitle) {
      var oTableModel = this.getView().getModel("entryModel");
      var aItems = oTableModel.getProperty("/Items");
      var idx = aItems.findIndex(function (item) {
        return item.Batch === sValueBatchTitle;
      });
      return idx; // -1 means not found, 0/1/2.. are valid indices
    },
    onClearRowBySubmitBatch: function (_oInput) {
      const oInput = _oInput;
      const oContext = oInput.getBindingContext("entryModel");
      if (!oContext) return;  // safety
      const sPath = oContext.getPath();   // "/Items/3"
      const iIndex = parseInt(sPath.split("/").pop());
      const oEntryModel = this.getView().getModel("entryModel");
      const aItems = oEntryModel.getProperty("/Items");
      // ✔️ Set batch to this row
      // oEntryModel.setProperty("/Items/" + iIndex + "/Batch", sValue);
      // ✔️ Example: update additional fields in the same row
      oEntryModel.setProperty("/Items/" + iIndex + "/Matnr", "");
      oEntryModel.setProperty("/Items/" + iIndex + "/Werks", "");
      oEntryModel.setProperty("/Items/" + iIndex + "/LGORT", "");
      oEntryModel.setProperty("/Items/" + iIndex + "/Meins", "");
      oEntryModel.setProperty("/Items/" + iIndex + "/CountedQty", null);
      oEntryModel.refresh(true);
      this.errorSound.play();
    },
    onSubmitBin: function (oEvent) {
      const oInput = oEvent.getSource();
      const oContext = oInput.getBindingContext("entryModel");
      const _oSelectedBin = oInput.getValue();
      if (!oContext) return;  // safety
      const oBinModel = this.getView().getModel("binModel");
      const oBinData = oBinModel.getData();
      if (Array.isArray(oBinData)) {
        var StgTypofBin = oBinData.filter(item => item.Text == _oSelectedBin);
      }
      const sPath = oContext.getPath();   // "/Items/3"
      const iIndex = parseInt(sPath.split("/").pop());
      const oEntryModel = this.getView().getModel("entryModel");
      oEntryModel.setProperty("/Items/" + iIndex + "/Lgtyp", StgTypofBin[0].StorageTyp);
      oEntryModel.refresh(true);
    },
    /* =========================================================== */
    /* Value Helps                                                 */
    /* =========================================================== */
    //Batch
    onValueHelpRequestedBatch: function (oEvent) {
      // Store the field and its binding context path
      this._oVHInputBatch = oEvent.getSource();
      this._sVHPath = this._oVHInputBatch.getBindingContext("entryModel").getPath();
      var oDialog = sap.ui.xmlfragment("com.triumph.pistockcount.view.fragment.ValueHelpBatch", this);
      oDialog.setTitle(this.getResourceBundle().getText("lineItemCreationTitleDialogBatch"));
      this.getView().addDependent(oDialog);
      oDialog.bindAggregation("items", {
        path: "batchModel>/",
        template: new sap.m.StandardListItem({ title: "{batchModel>Batch}" })
      });
      oDialog.open();
    },
    onSearchValueHelpBatch: function (oEvent) {
      var sValue = oEvent.getParameter("value");
      var oFilter = new Filter([
        new sap.ui.model.Filter("Text", FilterOperator.Contains, sValue),
        new sap.ui.model.Filter("id", FilterOperator.Contains, sValue)],
        false);
      var oBinding = oEvent.getParameter("itemsBinding");
      oBinding.filter([oFilter]);
    },
    onCloseValueHelpBatch: function (oEvent) {
      var oSelectedItem = oEvent.getParameter("selectedItem");
      var oInput = this._oVHInputBatch;
      if (!oSelectedItem) {
        oInput.resetProperty("value");
        this.onClearRowBySubmitBatch(oInput);
      } else if (this.isBatchSelected(oSelectedItem.getTitle()) !== -1) {
        sap.m.MessageToast.show("Batch already used in another row.");
        this.onClearRowBySubmitBatch(oInput);
        oInput.resetProperty("value");
      } else {
        oInput.setValue(oSelectedItem.getTitle());
        oInput.fireSubmit();
      }
    },
    //Bin
    onValueHelpRequestedBin: function (oEvent) {
      // Store the field and its binding context path
      this._oVHInputBin = oEvent.getSource();
      var oDialog = sap.ui.xmlfragment("com.triumph.pistockcount.view.fragment.ValueHelpBin", this);
      oDialog.setTitle(this.getResourceBundle().getText("lineItemCreationTitleDialogBin"));
      this.getView().addDependent(oDialog);
      oDialog.bindAggregation("items", {
        path: "binModel>/",
        template: new sap.m.StandardListItem({ title: "{binModel>Text}", description: "{binModel>id}" })
      });
      oDialog.open();
    },
    onSearchValueHelpBin: function (oEvent) {
      var sValue = oEvent.getParameter("value");
      var oFilter = new Filter([
        new sap.ui.model.Filter("Text", FilterOperator.Contains, sValue),
        new sap.ui.model.Filter("id", FilterOperator.Contains, sValue)],
        false);
      var oBinding = oEvent.getParameter("itemsBinding");
      oBinding.filter([oFilter]);
    },
    onCloseValueHelpBin: function (oEvent) {
      var oSelectedItem = oEvent.getParameter("selectedItem");
      var oInput = this._oVHInputBin;
      if (!oSelectedItem) {
        oInput.resetProperty("value");
        // this._itemModel.setProperty("/Anln1", null);
      } else {
        oInput.setValue(oSelectedItem.getTitle());
      }
      oInput.fireSubmit(oSelectedItem);
    },
    /* =========================================================== */
    /* Scanning Section                                            */
    /* =========================================================== */
    onScannerIconPress() {
      const oInput = this.byId("idInputScanner");
      oInput.setValue("");
      setTimeout(() => oInput.focus(), 100);
      MessageToast.show("Scan...");
    },
    validateScannedBatch: function (oEvent) {
      var newValue = oEvent.mParameters.newValue;
      if (newValue == null || newValue == "") {
        return;
      }
      if (!newValue) {
        return;
      }
      // 👉 Check if any object in batchModel has Batch equal to newValue
      var batchModel = this.getView().getModel("batchModel").getData();
      var exists = batchModel.some(function (item) {
        return item.Batch === newValue;
      });
      if (exists) {
        console.log("Value exists in batchModel");
        // Check local EAN array
        if (this.checkInEANArray(oEvent.mParameters.newValue)) {
          return;
        } else {
          sap.m.MessageToast.show("Please Add new row first.");
        }
      } else {
        //Sound Error
        this.errorSound.play();
        this.refreshInput();
      }
    },
    checkInEANArray: function (scanned_batch) {
      var that = this;
      let allItemsforcheck = this._oEntryModel.getProperty("/Items");
      if (!Array.isArray(allItemsforcheck)) {
        console.error("allItemsforcheck is not an array");
        return false;
      }
      let updated = false;
      // Loop through the array
      allItemsforcheck.forEach((item, index) => {
        if (item.Batch === scanned_batch) {
          // Safely convert CountedQty to a number, default to 0 if NaN
          const currentMenge = Number(item.CountedQty);
          const safeMenge = isNaN(currentMenge) ? 0 : currentMenge;
          // Increase CountedQty by 1
          item.CountedQty = safeMenge + 1;
          updated = true;
        }
      });
      // Update the model back
      if (updated) {
        this.successSound.play();
        this._oEntryModel.setProperty("/Items", allItemsforcheck);
        this.refreshInput();
      } else {
        const index = allItemsforcheck.findIndex(item => item.Batch === "");
        if (index !== -1 && this.isBatchSelected(scanned_batch) == -1) {
          const oTable = that.byId("invTable");
          const oItem = oTable.getItems()[index];
          const oInput = oItem.getCells()[3];
          oInput.setValue(scanned_batch);
          this.checkInEANArray(scanned_batch);//for adding count if added in the new row
          oInput.fireSubmit();
          updated = true;
        }
      }
      return updated;
    },
    refreshInput: function () {
      var txtId = "idInputScanner";
      this.getView().byId(txtId).setValue("");
      this.getView().byId(txtId).focus();
    },

  });
});
