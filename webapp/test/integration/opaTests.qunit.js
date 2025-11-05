/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["com/triumph/pistockcount/test/integration/AllJourneys"
], function () {
	QUnit.start();
});
