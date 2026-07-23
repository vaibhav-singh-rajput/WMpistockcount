sap.ui.define([
    "sap/ui/core/UIComponent",
    "com/triumph/pistockcount/model/models",
    "sap/ui/model/json/JSONModel",
    "com/triumph/pistockcount/model/MockODataModel",
], (UIComponent, models, JSONModel, MockODataModel) => {
    "use strict";

    return UIComponent.extend("com.triumph.pistockcount.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);
            
            // Always load root view on browser refresh
            // sap.ui.core.routing.HashChanger.getInstance().replaceHash("");

            // enable routing
            this.getRouter().initialize();

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            /* =========================================================== */
            /* JSON Models                                                 */
            /* =========================================================== */
            // set image model
            var oRootPath = jQuery.sap.getModulePath("com.triumph.pistockcount");
            var oImageModel = new sap.ui.model.json.JSONModel({
                path: oRootPath,
            });
            this.setModel(oImageModel, "imageModel");

            // set document model
            this.setModel(new JSONModel(), "documentModel");

            // set item model
            var _oItemModel = new JSONModel({
                allItems: [],
                items: [],
                currentPage: 1,
                totalPages: 0,
                itemsPerPage: 5
            });
            _oItemModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
            this.setModel(_oItemModel, "itemModel");

            // set app root path
            var oRootPath = jQuery.sap.getModulePath("com.triumph.pistockcount");
            this.getModel("appModel").setProperty("/appRootPath", oRootPath);

            /* =========================================================== */
            /* Temporary JSON mock model                                    */
            /* =========================================================== */
            // Temporary JSON mock model - Should be reomoved when actual odata is ready(22-24)
            //const oMockModel = new JSONModel(sap.ui.require.toUrl("com/triumph/pistockcount/model/MockData.json"));
            //this.setModel(oMockModel); // <--- no name → becomes the default model

            const bUseMock = true; // or from config/env flag
            const oModel = bUseMock
                ? new MockODataModel(sap.ui.require.toUrl("com/triumph/pistockcount/model/MockData.json"))
                : new ODataModel("/sap/opu/odata/sap/YOUR_SERVICE");//future odata

            this.setModel(oModel);


        }
    });
});