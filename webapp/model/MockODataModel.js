sap.ui.define([
  "sap/ui/model/json/JSONModel"
], function (JSONModel) {
  "use strict";

  return JSONModel.extend("com.triumph.pistockcount.model.MockODataModel", {
    constructor: function (sMockDataPath) {
      JSONModel.prototype.constructor.call(this, sMockDataPath);
    },

    /**
     * Helper to simulate a realistic OData error response
     */
    _createODataError: function (statusCode, message) {
      return {
        statusCode: statusCode,
        statusText: "Error",
        responseText: JSON.stringify({
          error: {
            code: statusCode,
            message: {
              lang: "en",
              value: message
            }
          }
        })
      };
    },

    read: function (sPath, mParameters) {
      let aData = this.getProperty(sPath);

      if (!Array.isArray(aData)) {
        const oError = this._createODataError(404, `Resource not found for path: ${sPath}`);
        mParameters?.error && mParameters.error(oError);
        return;
      }

      // Handle filters (real sap.ui.model.Filter instances)
      if (mParameters?.filters && mParameters.filters.length > 0) {
        aData = aData.filter(item => {
          return mParameters.filters.every(filter => {
            // Determine values from Filter object
            const value = item[filter.getPath()];
            const operator = filter.getOperator();
            const filterValue = filter.getValue1();

            switch (operator) {
              case "EQ": return value === filterValue;
              case "NE": return value !== filterValue;
              case "GT": return value > filterValue;
              case "LT": return value < filterValue;
              case "GE": return value >= filterValue;
              case "LE": return value <= filterValue;
              case "Contains": return typeof value === "string" && value.includes(filterValue);
              default: return true;
            }
          });
        });
      }

      mParameters?.success && mParameters.success({ results: aData });
    }
    ,


    create: function (sPath, oPayload, mParameters) {
      if (!oPayload || typeof oPayload !== "object") {
        const oError = this._createODataError(400, "Invalid payload for create operation");
        mParameters?.error && mParameters.error(oError);
        return;
      }

      const aData = this.getProperty(sPath) || [];
      aData.push(oPayload);
      this.setProperty(sPath, aData);
      mParameters?.success && mParameters.success(oPayload);
    },

    // update: function (sPath, oPayload, mParameters) {
    //   const aData = this.getProperty(sPath);

    //   if (!aData) {
    //     const oError = this._createODataError(404, `Cannot update — no data found at ${sPath}`);
    //     mParameters?.error && mParameters.error(oError);
    //     return;
    //   }

    //   this.setProperty(sPath, oPayload);
    //   mParameters?.success && mParameters.success(oPayload);
    // },
    update: function (sPath, oPayload, mParameters) {
      const aData = this.getProperty(sPath); // should be /Products or similar

      if (!Array.isArray(aData)) {
        const oError = this._createODataError(400, `Invalid path: ${sPath}`);
        mParameters?.error && mParameters.error(oError);
        return;
      }

      // Assume key property is "ID"
      const iIndex = aData.findIndex(item => item.ID === oPayload.ID);

      if (iIndex !== -1) {
        // Update existing entry (merge fields)
        aData[iIndex] = { ...aData[iIndex], ...oPayload };
        console.log("Updated existing entry:", aData[iIndex]);
      } else {
        // Create new entry
        aData.push(oPayload);
        console.log("Created new entry:", oPayload);
      }

      this.setProperty(sPath, aData);
      mParameters?.success && mParameters.success(oPayload);
    },



    remove: function (sPath, mParameters) {
      const aData = this.getProperty(sPath);

      if (!aData) {
        const oError = this._createODataError(404, `Cannot delete — no data found at ${sPath}`);
        mParameters?.error && mParameters.error(oError);
        return;
      }

      this.setProperty(sPath, null);
      mParameters?.success && mParameters.success({ results: aData });
    }
  });
});
