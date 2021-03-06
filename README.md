# miIO Device Library

Control Mi Home devices that implement the miIO protocol, such as the
Mi Air Purifier, Mi Robot Vacuum and Mi Smart Socket. These devices are commonly
part of what Xiaomi calls the Mi Ecosystem which is branded as MiJia.

`miio` is [MIT-licensed](LICENSE.md) and requires at least Node 6.6.0.

**Note:** The master branch contains a larger rewrite of how devices are mapped.
This library now uses [abstract-things](https://github.com/tinkerhub/abstract-things)
as its base. The API of devices will have changed, and some bugs are to be
expected. The documentation is currently out of date, but documentation for
types and capabilities is [available for abstract-things](http://abstract-things.readthedocs.io/).

Testing and feedback on the new API is welcome. Please open an issue if you
find any issues with new mapping.

## Devices types

The intent of this library is to support all miIO-compatible devices and to
provide an easy to use API for them. The library maps specific device models to
generic device types with well defined capabilities to simplify interacting with
them.

Currently supported devices are:

* Air Purifiers (1, 2 and Pro)
* Mi Humidifier
* Mi Smart Socket Plug and Power Strips
* Mi Robot Vacuum
* Mi Smart Home Gateway (Aqara) and accessories
* Yeelights

See [documentation for devices](docs/devices/README.md) for information about
the types, their API and supported device models. You can also check
[Missing devices](docs/missing-devices.md) if you want to know what you can do
to help this library with support for your device.

## Installation

```
npm install --save miio
```

## Usage

```javascript
const miio = require('miio');
```

Resolve a handle to the device:

```javascript
// Resolve a device, resolving the token automatically if possible
miio.device({ address: '192.168.100.8' })
  .then(console.log)
  .catch(console.error);

// Resolve a device, specifying the token (see below for how to get the token)
miio.device({ address: '192.168.100.8', token: 'token-as-hex' })
  .then(console.log)
  .catch(console.error);
```

Call methods to interact with the device:

```javascript
// Switch the power of the device
device.setPower(! device.power)
  .then(on => console.log('Power is now', on));
```

Listen to events such as property changes and actions:

```javascript
// All devices have a propertyChanged event
device.on('propertyChanged', e => console.log(e.property, e.oldValue, e.value));

// Some devices have custom events
device.on('action', e => console.log('Action performed:', e.id));
```

Use capabilities if you want to support different models easily:

```javascript
if(device.hasCapability('temperature')) {
  console.log(device.temperature);
}

if(device.hasCapability('power')) {
  device.setPower(false)
    .then(console.log)
    .catch(console.error);
}
```

If you are done with the device call `destroy` to stop all network traffic:

```javascript
device.destroy();
```

Check [documentation for devices](docs/devices/README.md) for details about
the API for supported devices.

## Tokens and device management

A few miIO devices send back their token during a handshake and can be used
without figuring out the token. Most devices hide their token, such as
Yeelights and the Mi Robot Vacuum.

There is a command line tool named `miio` that helps with finding and storing
tokens. See [Device management](docs/management.md) for details
and common use cases.

## Discovering devices

Use `miio.devices()` to look for and connect to devices on the local network.
This method of discovery will tell you directly if a device reveals its token
and can be auto-connected to. If you do not want to automatically connect to
devices you can use `miio.browse()` instead.

Example using `miio.devices()`:

```javascript
const devices = miio.devices({
  cacheTime: 300 // 5 minutes. Default is 1800 seconds (30 minutes)
});

devices.on('available', reg => {
  if(! reg.token) {
    console.log(reg.id, 'hides its token');
    return;
  }

  const device = reg.device;
  if(! device) {
    console.log(reg.id, 'could not be connected to');
    return;
  }

  // Do something useful with the device
});

devices.on('unavailable', reg => {
  if(! reg.device) return;

  // Do whatever you need here
});

devices.on('error', err => {
  // err.device points to info about the device
  console.log('Something went wrong connecting to device', err);
});
```

`miio.devices()` supports these options:

* `cacheTime`, the maximum amount of seconds a device can be unreachable before it becomes unavailable. Default: `1800`
* `filter`, function used to filter what devices are connected to. Default: `reg => true`
* `skipSubDevices`, if sub devices on Aqara gateways should be skipped. Default: `false`
* `useTokenStorage`, if tokens should be fetched from storage (see device management). Default: `true`
* `tokens`, object with manual mapping between ids and tokens (advanced, use [Device management](docs/management.md) if possible)

Example using `miio.browse()`:

```javascript
const browser = miio.browse({
  cacheTime: 300 // 5 minutes. Default is 1800 seconds (30 minutes)
});

const devices = {};
browser.on('available', reg => {
  if(! reg.token) {
    console.log(reg.id, 'hides its token');
    return;
  }

  miio.device(reg)
    .then(device => {
      devices[reg.id] = device;

      // Do something useful with the device
    })
    .catch(handleErrorProperlyHere);
});

browser.on('unavailable', reg => {
  const device = devices[reg.id];
  if(! device) return;

  device.destroy();
  delete devices[reg.id];
})
```

You can also use mDNS for discovery, but this library does not contain a mDNS
implementation. You can choose a mDNS-implementation suitable for your
needs. Devices announce themselves via `_miio._udp` and should work for most
devices, in certain cases you might need to restart your device to make it
announce itself.

## Library versioning and API stability

This library uses [semantic versioning](http://semver.org/) with an exception
being that the API for devices is based on their type and capabilities and not
their model.

This means that a device can have methods removed if its type or capabilities
change, which can happen if a better implementation is made available for the
model. When working with the library implement checks against type and
capabilities for future compatibility within the same major version of `miio`.

Capabilities can be considered stable in across major versions, if a device
supports `power` no minor or patch version will introduce `power-mega` and
replace `power`. If new functionality is needed the new capability will be
added along side the older one.

## Reporting issues

[Reporting issues](docs/reporting-issues.md) contains information that is
useful for making any issue you want to report easier to fix.

## Advanced: Skip model and token checks

The `miio.device` function will return a promise that checks that we can
communicate with the device and what model it is. If you wish to skip this
step and just create a reference to a device use `miio.createDevice`:

```javascript
const device = miio.createDevice({
  address: '192.168.100.8',
  token: 'token-as-hex',
  model: 'zhimi.airpurifier.m1'
});
```

You will need to call `device.init()` manually to initialize the device:

```javascript
device.init()
  .then(() => /* device is ready for commands */)
  .catch(console.error);
```

## Advanced: Call a miIO-method directly

It's possible to call any method directly on a device without using the
top-level API. This is useful if some aspect of your device is not yet
supported by the library.

```javascript
// Call any method via call
device.call('set_mode', [ 'silent' ])
  .then(console.log)
  .catch(console.error);
```

## Advanced: Define custom properties

If you want to define some custom properties to fetch for a device or if your
device is not yet supported you can easily do so:

```javascript
// Define a property that should be monitored
device.defineProperty('mode');

// Define that a certain property should be run through a custom conversion
device.defineProperty('temp_dec', v => v / 10.0);

// Listen for changes to properties
device.on('propertyChanged', e => console.log(e.property, e.oldValue, e.value));

// Activate automatic property monitoring (activated by default for most devices)
device.monitor();

// Stop automatic property monitoring
device.stopMonitoring();

// Fetch the last value of a monitored property
const value = device.property('temp_dec');
```

## Advanced: Device management

Get information and update the wireless settings of devices via the management
API.

Discover the token of a device:
```javascript
device.discover()
  .then(info => console.log(info.token));
```

Get internal information about the device:
```javascript
device.management.info()
  .then(console.log);
```

Update the wireless settings:
```javascript
device.management.updateWireless({
  ssid: 'SSID of network',
  passwd: 'Password of network'
}).then(console.log);
```

Warning: The device will either connect to the new network or it will get stuck
without being able to connect. If that happens the device needs to be reset.

## Protocol documentation

This library is based on the documentation provided by OpenMiHome. See https://github.com/OpenMiHome/mihome-binary-protocol for details. For details
about how to figure out the commands for new devices look at the
[documentation for protocol and commands](docs/protocol.md).
