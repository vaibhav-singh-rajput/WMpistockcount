sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessagePopover",
    "sap/m/MessageItem",
    "sap/ui/core/Core",
    "sap/ui/core/MessageType",
    "sap/ui/core/message/Message",
    "sap/m/MessageBox",
], function (Controller, MessagePopover, MessageItem, Core, MessageType, Message, MessageBox) {
    "use strict";

    return Controller.extend("com.triumph.pistockcount.controller.BaseController", {

        /* =========================================================== */
        /* Utils                                                       */
        /* =========================================================== */

        getRouter: function () {
            return sap.ui.core.UIComponent.getRouterFor(this);
        },

        getModel: function (sName) {
            return this.getView().getModel(sName);
        },

        setModel: function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        /**
         * Read error object and extract SAP backend error message
         * @param {Object} oErrorEventParam
         * @returns {String}
        */
        getSapErrorMessage: function (oErrorEventParam) {
            var msg;
            console.log(oErrorEventParam);
            try {
                var sError = oErrorEventParam.responseText || oErrorEventParam.body;
                var oError = JSON.parse(sError);
                var errorArr = oError.error.innererror.errordetails;
                var aMsg = [];
                if (errorArr.length > 0) {
                    errorArr.reverse();
                }
                $.each(errorArr, function (index, error) {
                    aMsg.push(error.message);
                });
                msg = aMsg.join("\n");
            } catch (exc) {
                console.log(exc);
                return "Unknown Server Error";
            }
            return msg;
        },

        /**
         * Initialize busy indicator
         */
        initBusyIndicator: function () {
            var oODataModel = this.getOwnerComponent().getModel();
            var oADoDataModel = this.getOwnerComponent().getModel("adModel");
            var oView = this.getView();
            oView.setBusyIndicatorDelay(0);

            $.sap.openODataRequests = 0;

            // Event handler for SAP backend
            oODataModel.attachRequestSent(function () {
                console.assert($.sap.openODataRequests >= 0, "Open oData request counter >= 0");
                if ($.sap.openODataRequests === 0) {
                    oView.setBusy(true);
                }
                ++$.sap.openODataRequests;
            });
            oODataModel.attachRequestCompleted(function () {
                --$.sap.openODataRequests;
                if ($.sap.openODataRequests === 0) {
                    oView.setBusy(false);
                }

                if ($.sap.openODataRequests < 0) {
                    console.error("Open oData request counter was set to -1");
                    $.sap.openODataRequests = 0;
                }
            });
            oODataModel.attachRequestFailed(function () {
                --$.sap.openODataRequests;
                if ($.sap.openODataRequests === 0) {
                    oView.setBusy(false);
                }

                if ($.sap.openODataRequests < 0) {
                    console.error("Open oData request counter was set to -1");
                    $.sap.openODataRequests = 0;
                }
            });

            // Event handler for Boomi oData service for AD
            oADoDataModel.attachRequestSent(function () {
                console.assert($.sap.openODataRequests >= 0, "Open oData request counter >= 0");
                if ($.sap.openODataRequests === 0) {
                    oView.setBusy(true);
                }
                ++$.sap.openODataRequests;
            });
            oADoDataModel.attachRequestCompleted(function () {
                --$.sap.openODataRequests;
                if ($.sap.openODataRequests === 0) {
                    oView.setBusy(false);
                }

                if ($.sap.openODataRequests < 0) {
                    console.error("Open oData request counter was set to -1");
                    $.sap.openODataRequests = 0;
                }
            });
            oADoDataModel.attachRequestFailed(function () {
                --$.sap.openODataRequests;
                if ($.sap.openODataRequests === 0) {
                    oView.setBusy(false);
                }

                if ($.sap.openODataRequests < 0) {
                    console.error("Open oData request counter was set to -1");
                    $.sap.openODataRequests = 0;
                }
            });
        },

        startBusyIndicatorManually: function () {
            this.getView().setBusyIndicatorDelay(0);

            console.assert($.sap.openODataRequests >= 0, "Open oData request counter >= 0");
            if ($.sap.openODataRequests === 0) {
                this.getView().setBusy(true);
            }
            ++$.sap.openODataRequests;
        },

        stopBusyIndicatorManually: function () {
            this.getView().setBusyIndicatorDelay(0);

            --$.sap.openODataRequests;
            if ($.sap.openODataRequests === 0) {
                this.getView().setBusy(false);
            }

            if ($.sap.openODataRequests < 0) {
                console.error("Open oData request counter was set to -1");
                $.sap.openODataRequests = 0;
            }
        },

        /** 
         * Get base url of application
         */
        getBaseURL: function () {
            var appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
            var appPath = appId.replaceAll(".", "/");
            var appModulePath = jQuery.sap.getModulePath(appPath);
            return appModulePath;
        },

        /**
         * Navigate user back to launchpad
         */
        navigateBackToLaunchpad: function () {
            var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
            oCrossAppNavigator.toExternal({
                target: { semanticObject: "#" }
            });
        },

        /**
         * User log out confirmation
         */
        onPressButtonLogout: function () {
            MessageBox.confirm(this.getResourceBundle().getText("Logout.ConfirmMessage"), {
                onClose: (oAction) => {
                    if (oAction === MessageBox.Action.OK) {
                        this.navigateBackToLaunchpad();
                    }
                }
            });
        },

        /**
         * User Help
         */
        onPressButtonHelp: function () {
            // const sURLHelpPortal = this.getView().getModel("settingsModel").getProperty("/HELP_LINK");
            const sURLHelpPortal = "https://www.google.com/";
            if (sURLHelpPortal) {
                sap.m.URLHelper.redirect(sURLHelpPortal, true);
            } else {
                MessageBox.error("Link to help page could not be loaded. Please contact an application administrator.", {
                    emphasizedAction: MessageBox.Action.CLOSE
                });
            }
        },

        /* =========================================================== */
        /* Message Manager Popover                                     */
        /* =========================================================== */

        initializeMessageManager: function () {
            this.oMessageManager = Core.getMessageManager();

            // Clear the old messages
            this.oMessageManager.removeAllMessages();

            this.oMessageManager.registerObject(this.getView(), true);
            this.getView().setModel(this.oMessageManager.getMessageModel(), "message");
        },

        createMessagePopover: function () {
            this._oMessagePopover = new MessagePopover({
                activeTitlePress: (oEvent) => {
                    var oItem = oEvent.getParameter("item"),
                        oPage = this.getView().byId("messageHandlingPage"),
                        oMessage = oItem.getBindingContext("message").getObject(),
                        oControl = Element.registry.get(oMessage.getControlId());

                    if (oControl) {
                        oPage.scrollToElement(oControl.getDomRef(), 200, [0, -100]);
                        setTimeout(() => {
                            oControl.focus();
                        }, 300);
                    }
                },
                items: {
                    path: "message>/",
                    template: new MessageItem(
                        {
                            type: "{message>type}",
                            title: "{message>message}",
                            subtitle: "{message>additionalText}",
                            activeTitle: false,
                            //description: "{message>additionalText}",
                            groupName: "{message>id}"
                        })
                },
                groupItems: false
            });

            this.getView().byId("buttonMessagePopover").addDependent(this._oMessagePopover);

            this.refreshMessagePopover();
        },

        clearMessageManager: function () {
            this.oMessageManager.removeAllMessages();
            this.refreshMessagePopover();
        },

        handleMessagePopoverPress: function (oEvent) {
            if (!this._oMessagePopover) {
                this.createMessagePopover();
            }
            this._oMessagePopover.toggle(oEvent.getSource());
        },

        refreshMessagePopover: function () {
            var oButton = this.getView().byId("buttonMessagePopover");

            this._oMessagePopover.getBinding("items").attachChange(function (oEvent) {
                this._oMessagePopover.navigateBack();
                oButton.setType(this.buttonTypeFormatter());
                oButton.setIcon(this.buttonIconFormatter());
                oButton.setText(this.highestSeverityMessages());
            }.bind(this));

            if (this.getModel("message").oData.length > 0) {
                setTimeout(function () {
                    this._oMessagePopover.openBy(oButton);
                }.bind(this), 100);
            }
        },

        // Display the button type according to the message with the highest severity
        // The priority of the message types are as follows: Error > Warning > Success > Info
        buttonTypeFormatter: function () {
            var sHighestSeverity;
            var aMessages = this.oMessageManager.getMessageModel().oData;
            aMessages.forEach(function (sMessage) {
                switch (sMessage.type) {
                    case "Error":
                        sHighestSeverity = "Negative";
                        break;
                    case "Warning":
                        sHighestSeverity = sHighestSeverity !== "Negative" ? "Critical" : sHighestSeverity;
                        break;
                    case "Success":
                        sHighestSeverity = sHighestSeverity !== "Negative" && sHighestSeverity !== "Critical" ? "Success" : sHighestSeverity;
                        break;
                    default:
                        sHighestSeverity = !sHighestSeverity ? "Neutral" : sHighestSeverity;
                        break;
                }
            });

            return sHighestSeverity;
        },

        // Display the number of messages with the highest severity
        highestSeverityMessages: function () {
            var sHighestSeverityIconType = this.buttonTypeFormatter();
            var sHighestSeverityMessageType;

            switch (sHighestSeverityIconType) {
                case "Negative":
                    sHighestSeverityMessageType = "Error";
                    break;
                case "Critical":
                    sHighestSeverityMessageType = "Warning";
                    break;
                case "Success":
                    sHighestSeverityMessageType = "Success";
                    break;
                default:
                    sHighestSeverityMessageType = !sHighestSeverityMessageType ? "Information" : sHighestSeverityMessageType;
                    break;
            }

            return this.oMessageManager.getMessageModel().oData.reduce(function (iNumberOfMessages, oMessageItem) {
                return oMessageItem.type === sHighestSeverityMessageType ? ++iNumberOfMessages : iNumberOfMessages;
            }, 0) || "";
        },

        // Set the button icon according to the message with the highest severity
        buttonIconFormatter: function () {
            var sIcon;
            var aMessages = this.oMessageManager.getMessageModel().oData;

            aMessages.forEach(function (sMessage) {
                switch (sMessage.type) {
                    case "Error":
                        sIcon = "sap-icon://error";
                        break;
                    case "Warning":
                        sIcon = sIcon !== "sap-icon://error" ? "sap-icon://alert" : sIcon;
                        break;
                    case "Success":
                        sIcon = "sap-icon://error" && sIcon !== "sap-icon://alert" ? "sap-icon://sys-enter-2" : sIcon;
                        break;
                    default:
                        sIcon = !sIcon ? "sap-icon://information" : sIcon;
                        break;
                }
            });

            return sIcon;
        },

        /**
         * Creates new error message and adds it to message manager
         */
        createErrorMessage: function (sMessage, sAdditionalText, sTarget) {
            var oMessage = new Message({
                message: sMessage,
                additionalText: sAdditionalText,
                type: MessageType.Error,
                target: sTarget || "",
                processor: this.getView().getModel()
            });
            sap.ui.getCore().getMessageManager().addMessages(oMessage);
        },

        /**
         * Creates new error message and adds it to message manager
         */
        createWarningMessage: function (sMessage, sAdditionalText, sTarget) {
            var oMessage = new Message({
                message: sMessage,
                additionalText: sAdditionalText,
                type: MessageType.Warning,
                target: sTarget || "",
                processor: this.getView().getModel()
            });
            sap.ui.getCore().getMessageManager().addMessages(oMessage);
        },

        /* =========================================================== */
        /* Validations                                                 */
        /* =========================================================== */

        /**
         * Validate if email is in valid shape and return true if valid, else false
         * @param {*} sInput 
         */
        validateEmailAddress: function (sInput) {
            var rexMail = /^\w+[\w-+\.]*\@\w+([-\.]\w+)*\.[a-zA-Z]{2,}$/;
            return sInput.match(rexMail)
        },

        /**
         * Set control value state to error and value state text
         * @param {*} oControl 
         * @param {*} sMessage 
         */
        setCustomInputError: function (oControl, sMessage) {
            oControl.setValueState("Error");
            oControl.setValueStateText(sMessage);
        },

        resetCustomInputState: function (oControl) {
            oControl.setValueState("None");
        }
    });
});