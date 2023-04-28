const { buf } = require( 'node:buffer' );
const { createBluetooth } = require( 'node-ble' );

///////////FIREBASE THINGS////////////

var firebase = require('firebase/app');
var nodeimu = require('@trbll/nodeimu');
//var IMU = new nodeimu.IMU();
//var sense = require('@trbll/sense-hat-led');
const {getDatabase, ref, onValue, set, update, child,  get} = require('firebase/database');
const firebaseConfig = {
  apiKey: "AIzaSyCuJwJ8np2Bcim-ECWnqi6TE-CxbogMCNk",
  authDomain: "showertracker-44ce2.firebaseapp.com",
  databaseURL: "https://showertracker-44ce2-default-rtdb.firebaseio.com",
  projectId: "showertracker-44ce2",
  storageBucket: "showertracker-44ce2.appspot.com",
  messagingSenderId: "125138892507",
  appId: "1:125138892507:web:651fdd3cf5e6daab133efe",
  measurementId: "G-KMD7EQTCC2"
};

firebase.initializeApp(firebaseConfig);
const database = getDatabase();
const user = 'CjREE7dyUPa6o2Mj35X5pu3Y9xS2';

// TODO: Replace this with your Arduino's Bluetooth address
// as found by running the 'scan on' command in bluetoothctl
const ARDUINO_BLUETOOTH_ADDR = '53:92:09:13:4b:52';

const UART_SERVICE_UUID      = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
const TX_CHARACTERISTIC_UUID = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E';
const RX_CHARACTERISTIC_UUID = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E';

const EES_SERVICE_UUID       = '0000181a-0000-1000-8000-00805f9b34fb';

async function main( )
{
    // Reference the BLE adapter and begin device discovery...
    const { bluetooth, destroy } = createBluetooth();
    const adapter = await bluetooth.defaultAdapter();
    const discovery =  await adapter.startDiscovery();
    console.log( 'discovering...' );

    // Attempt to connect to the device with specified BT address
    const device = await adapter.waitDevice( ARDUINO_BLUETOOTH_ADDR.toUpperCase() );
    console.log( 'found device. attempting connection...' );
    await device.connect();
    console.log( 'connected to device!' );

    // Get references to the desired UART service and its characteristics
    const gattServer = await device.gatt();
    const uartService = await gattServer.getPrimaryService( UART_SERVICE_UUID.toLowerCase() );
    const txChar = await uartService.getCharacteristic( TX_CHARACTERISTIC_UUID.toLowerCase() );
    const rxChar = await uartService.getCharacteristic( RX_CHARACTERISTIC_UUID.toLowerCase() );

    // Get references to the desired ESS service and its temparature, humidity, and time characteristic.
    // TODO
    const essService = await gattServer.getPrimaryService( EES_SERVICE_UUID.toLowerCase() );
    //const tempChar = await essService.getCharacteristic( TEMP_CHAR_UUID.toLowerCase() );    
	//const humChar = await essService.getCharacteristic( HUM_CHAR_UUID.toLowerCase());
	//const timeChar = await essService.getCharacteristic( DATETIME_CHAR_UUID.toLowerCase());
	//const batChar = await essService.getCharacteristic( BAT_CHAR_UUID.toLowerCase());
  
    // Register for notifications on the RX characteristic
    await rxChar.startNotifications( );

// Callback for when data is received on RX characteristic
rxChar.on('valuechanged', buffer => {
  let dat = buffer.toString().trim();
  console.log('Buffer: ' + dat);

  let datArray = dat.split(':');
  let metric = datArray[0];
  let sessionID = datArray[1];
  let measurement = datArray[2];

  
  

  switch (metric) {
    // Duration tag
    case 'D':
      let endStamp = new Date(Date.now()); //get current date/time 
      console.log('endStamp: ' + endStamp.toISOString());

      let dur = Number(measurement); //duration in seconds
      let duration = dur * 1000; //duration in milliseconds
      let startStamp = new Date(endStamp.valueOf() - duration); 
      console.log('startStamp: ' + startStamp.toISOString);

      // Write time info to Firebase database
      set(database, 'users/' + user + '/showers/' + sessionID), {
        duration: dur,
        end: endStamp.toISOString(),
        start: startStamp.toISOString(),
      };
      console.log('Posted duration (' + measurement + ' s) for session: ' + sessionID);
      /*set(ref(database, 'users/' + user + '/'))
      firebase
        .database()
        .ref('users/' + user + '/showers' + sessionID)
        .update(showerUpdates)
        .then(() => {
          console.log('Updated shower information for session: ' + sessionID);
        })
        .catch(error => {
          console.error('Error updating shower information: ' + error);
        });*/
      break;

      // Humidity tag
    case 'H':
      // Write humidity info to Firebase database
      set(database, 'users/' + user + '/showers/' + sessionID), {
        humidity: measurement,
      };
      console.log('Posted humidity (' + measurement + ') for session: ' + sessionID);
      /*firebase
        .database()
        .ref('users/' + user + '/humidity')
        .update(humidityUpdates)
        .then(() => {
          console.log('Updated humidity (' + measurement + ') information for session: ' + sessionID);
        })
        .catch(error => {
          console.error('Error updating humidity information: ' + error);
        });*/
      break;

      // Temperature tag
    case 'T':
      // Write temperature info to Firebase database
      set(database, 'users/' + user + '/showers/' + sessionID), {
        temperature: measurement,
      };
      console.log('Posted temperature (' + measurement + ') for session: ' + sessionID);
      /*firebase
        .database()
        .ref('users/' + user + '/' + sessionID + '/temperature')
        .update(temperatureUpdates)
        .then(() => {
          console.log('Updated temperature (' + measurement + ') information for session: ' + sessionID);
        })
        .catch(error => {
          console.error('Error updating temperature information: ' + error);
        });*/
      break;

    default:
      console.log('Unknown metric: ' + metric);
      break;
  }
});
}

main().then((ret) =>
{
    if (ret) console.log( ret );
}).catch((err) =>
{
    if (err) console.error( err );
});




