'use strict';

const SubDevice = require('./subdevice');
const { Controller } = require('abstract-things/controllers');

module.xports = class Switch2 extends SubDevice.with(Controller) {
	constructor(parent, info) {
		super(parent, info);

		this.type = 'controller';
		this.model = 'lumi.86sw2';

		this.updateActions([
			'btn0-click',
			'btn0-double_click',
			'btn1-click',
			'btn1-double_click',
			'both_click'
		]);
	}

	_report(data) {
		super._report(data);

		if(typeof data['channel_0'] !== 'undefined') {
			const action = 'btn0-' + data['channel_0'];
			this.debug('Action performed:', action);
			this.emitAction(action);
		}

		if(typeof data['channel_1'] !== 'undefined') {
			const action = 'btn1-' + data['channel_1'];
			this.debug('Action performed:', action);
			this.emitAction(action);
		}

		if(typeof data['dual_channel'] !== 'undefined') {
			const action = data['dual_channel'];

			this.debug('Action performed:', action);
			this.emitAction(action);
		}
	}
};
