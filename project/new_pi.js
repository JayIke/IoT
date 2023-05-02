const { buf } = require('node:buffer');
const { createBluetooth } = require('node-ble');

///////////FIREBASE THINGS////////////

var firebase = require('firebase/app');

const { getDatabase, ref, onValue, set, update, child, get } = require('firebase/database');
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

const USER = 'CjREE7dyUPa6o2Mj35X5pu3Y9xS2';

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
    //const txChar = await uartService.getCharacteristic( TX_CHARACTERISTIC_UUID.toLowerCase() );
    const rxChar = await uartService.getCharacteristic( RX_CHARACTERISTIC_UUID.toLowerCase() );

    // Get references to the desired ESS service and its temparature, humidity, and time characteristic.
    // TODO
   // const essService = await gattServer.getPrimaryService( EES_SERVICE_UUID.toLowerCase() );
    //const tempChar = await essService.getCharacteristic( TEMP_CHAR_UUID.toLowerCase() );    
	//const humChar = await essService.getCharacteristic( HUM_CHAR_UUID.toLowerCase());
	//const timeChar = await essService.getCharacteristic( DATETIME_CHAR_UUID.toLowerCase());
	//const batChar = await essService.getCharacteristic( BAT_CHAR_UUID.toLowerCase());
  let duration = 0;
  let endStamp = '';
  let startStamp = '';
  let temperature = 0;
  let humidity = 0;
 
    // Register for notifications on the RX characteristic
    await rxChar.startNotifications( );
   
// Callback for when data is received on RX characteristic
rxChar.on('valuechanged', buffer => {
  let dat = buffer.toString().trim();
  console.log('Buffer: ' + dat);
  const [metric, sessionID, measurement] = dat.split('/');
  const sessionRef = ref(database,'users/' + USER + '/showers');
  /*let duration = 0;
  let endStamp = '';
  let startStamp = '';
  let temperature = 0;
  let humidity = 0;*/
 
  
  
  //let day = new Date().getDay();
  //let dateArr = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  //let day = datArr[day];
  switch (metric) {
    case 'D':
        endStamp = new Date(Date.now());
        
        duration = Number(measurement); //duration in seconds
        let dur = duration * 1000; //duration in milliseconds
        startStamp = new Date(endStamp.valueOf() - dur); 
        startStamp = startStamp.toISOString();
        console.log('startStamp: ' + startStamp);
        endStamp = endStamp.toISOString(); 
        console.log('endStamp: ' + endStamp);
        console.log('sessionRef: ' + sessionRef);
        update(sessionRef,{
          [`/${sessionID}`]:{
          'end': endStamp,
          'start': startStamp,
          'duration': duration,
          'temperature': temperature,
          'humidity': humidity,
          }
        });
        break;
    
    case 'T':
        temperature = parseFloat(measurement);
        update(sessionRef,{
          [`/${sessionID}`]:{
            'end': endStamp,
            'start': startStamp,
            'duration': duration,
            'temperature': temperature,
            'humidity': humidity,
          }
        });
        break;
    
    case 'H':
        humidity = parseFloat(measurement);
        update(sessionRef,{
          [`/${sessionID}`]:{
            'end': endStamp,
            'start': startStamp,
            'duration': duration,
            'temperature': temperature,
            'humidity': humidity,
          }
        });
        endStamp = '';
        startStamp = '';
        duration = 0;
        temperature = 0;
        humidity = 0;
        break;
    
    default:
         console.log('Unkown metric: ' + metric);
         break;

  }
  
});

const stdin = process.openStdin( );
  stdin.addListener( 'data', async function( d )
    {
        let inStr = d.toString( ).trim( );

        // Disconnect and exit if user types 'exit'
        if (inStr === 'exit')
        {
            console.log( 'disconnecting...' );
            await device.disconnect();
            console.log( 'disconnected.' );
            destroy();
            process.exit();
        }

        // Specification limits packets to 20 bytes; truncate string if too long.
        inStr = (inStr.length > 20) ? inStr.slice(0,20) : inStr;

        // Attempt to write/send value to TX characteristic
        await txChar.writeValue(Buffer.from(inStr)).then(() =>
        {
            console.log('Sent: ' + inStr);
        });
    });
}

main().then((ret) =>
{
    if (ret) console.log( ret );
}).catch((err) =>
{
    if (err) console.error( err );
});


const stdin = process.openStdin( );
    stdin.addListener( 'data', async function( d )
    {
        let inStr = d.toString( ).trim( );

        // Disconnect and exit if user types 'exit'
        if (inStr === 'exit')
        {
            console.log( 'disconnecting...' );
            await device.disconnect();
            console.log( 'disconnected.' );
            destroy();
            process.exit();
        }

        // Specification limits packets to 20 bytes; truncate string if too long.
        inStr = (inStr.length > 20) ? inStr.slice(0,20) : inStr;

        // Attempt to write/send value to TX characteristic
        await txChar.writeValue(Buffer.from(inStr)).then(() =>
        {
            console.log('Sent: ' + inStr);
        });
    });

