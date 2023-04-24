const { buf } = require( 'node:buffer' );
const { createBluetooth } = require( 'node-ble' );

// TODO: Replace this with your Arduino's Bluetooth address
// as found by running the 'scan on' command in bluetoothctl
const ARDUINO_BLUETOOTH_ADDR = '53:92:09:13:4b:52';

const UART_SERVICE_UUID      = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
const TX_CHARACTERISTIC_UUID = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E';
const RX_CHARACTERISTIC_UUID = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E';

const EES_SERVICE_UUID       = '0000181a-0000-1000-8000-00805f9b34fb';
const TEMP_CHAR_UUID         = '00002a6e-0000-1000-8000-00805f9b34fb';
const HUM_CHAR_UUID	= '00002a6f-0000-1000-8000-00805f9b34fb';
const DATE_CHAR_UUID = '00002aed-0000-1000-8000-00805f9b34fb';
const DATETIME_CHAR_UUID = '00002a08-0000-1000-8000-00805f9b34fb';
const BAT_CHAR_UUID = '00002a19-0000-1000-8000-00805f9b34fb';

async function callParseData(x){
    parseSensorData(x);
}

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
    const tempChar = await essService.getCharacteristic( TEMP_CHAR_UUID.toLowerCase() );    
	//const humChar = await essService.getCharacteristic( HUM_CHAR_UUID.toLowerCase());
	//const timeChar = await essService.getCharacteristic( DATETIME_CHAR_UUID.toLowerCase());
	//const batChar = await essService.getCharacteristic( BAT_CHAR_UUID.toLowerCase());
    let metric = '';
    let sessionID = '';
    let measurement = '';
    let startStamp = '';
	let endStamp = '';
    // Register for notifications on the RX characteristic
    await rxChar.startNotifications( );

    // Callback for when data is received on RX characteristic
    rxChar.on( 'valuechanged', buffer =>
    {
        let dat = buffer.toString();
        let datArray = dat.split(":");
        metric = datArray[0];
        sessionID = datArray[1];
        measurement = datArray[2];
        
        if (datArray[0] == 'D'){
            let curTime = new Date(Date.now());
            endStamp = curTime.toISOString();
            let dur = datArray[2];
            dur = parInt(dur)/1000;
            let beginTime = curTime-dur;
            let start = new Date(beginTime);
            startStamp = start.toISOString();
            endStamp = curTime.toISOString();
            console.log('Received Duration: ' + dur);
            console.log('ISO 8601: Start = ' + startStamp + ' End = ' + endStamp);
        }
        else {
            console.log('Metric: ' + metric + ', sessionID: ' + sessionID + ', measurement: ' + measurement);
        }
        
            console.log('After if/else.');
        //call Isaac's database function
    });

    // Register for notifications on the temperature characteristic
    // TODO
    await tempChar.startNotifications();

    // Callback for when data is received on the temp characteristic
    // TODO

   /* tempChar.on( 'valuechanged', buffer => {	
        const updates = {};
	    var temp = buffer.readInt16LE(0)/100;
    	updates['lab2data/temperature'] = temp;
	    console.log('Received: ' + temp);	
        update(ref(database), updates).then(() => {
            console.log('updated temp: ' + temp);
            }).catch((error) => {
                console.error(error);
        });
    });*/

    // Set up listener for console input.
    // When console input is received, write it to TX characteristic
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
    
    // intervalValue.addListener('data', async function(d){
      /* 	onValue(updateInterval, (snapshot) => {
	const d = snapshot.val();
	if(d){
	d = d*1000;
	intervalValue = d.toString(); 
	txChar.writeValue(Buffer.from(intervalValue)).then(()=>{console.log("Send interval value "+intervalValue);});}});
	
    // })*/
	
}

/*function parseSensorData(dat){
    const datArray = dat.split(":");
    let metric = datArray[0];
    let uid = datArray[1];
    let measurement = dataArray[2];
}*/

main().then((ret) =>
{
    if (ret) console.log( ret );
}).catch((err) =>
{
    if (err) console.error( err );
});



///////////FIREBASE THINGS////////////

/*var firebase = require('firebase/app');
var nodeimu = require('@trbll/nodeimu');
var IMU = new nodeimu.IMU();
var sense = require('@trbll/sense-hat-led');
const {getDatabase, ref, onValue, set, update, child,  get} = require('firebase/database');
const firebaseConfig = {
  apiKey: "AIzaSyAG531TgboHybc--e78Ivnu_JxULGoDH4I",
  authDomain: "iot-lab2-91485.firebaseapp.com",
  projectId: "iot-lab2-91485",
  storageBucket: "iot-lab2-91485.appspot.com",
  messagingSenderId: "1025996988986",
  appId: "1:1025996988986:web:b6f52ff55995ae52554b03"
};

firebase.initializeApp(firebaseConfig);
const database = getDatabase();

sense.clear();

set(ref(database, 'lab2data'), {
	temperature: 0,
	humidity: 0,
	interval: 5,
	light_row: '0',
	light_col: '0',
	light_r: '0',
	light_g: '0',
	light_b: '0',
	update_light: false,});

const updateLightRef = ref(database, 'lab2data/update_light');
const updateInterval = ref(database, 'lab2data/interval');

onValue(updateLightRef, (snapshot) => {
	const data = snapshot.val();
	if(data){
		updateLight();
	}
});

let interval = setInterval(updateDB, 5000);
let intervalValue = 5000;
onValue(updateInterval, async (snapshot) => {
	const dat = snapshot.val();
	if(dat){
        console.log(dat);
        clearInterval(interval);
        interval = setInterval(updateDB, dat*1000);
        intervalValue = dat * 1000;
        //process.stdout.write(dat.toString() + "/n")
//        await txUart.writeValue(Buffer.from(intervalValue.toString()));
}});

function getInterval(val){
return val;
}

function updateLight(){
	get(ref(database), 'lab2data/').then((snapshot) => {
		if (snapshot.exists()) {
			const d = snapshot.val();
			var rgb = [Number(d.lab2data.light_r), Number(d.lab2data.light_g), Number(d.lab2data.light_b)];
			sense.setPixel(Number(d.lab2data.light_row), Number(d.lab2data.light_col), rgb, (err) => {console.log('light updated '+rgb);});
		} else {
			console.log('no data available');
		}
	}).catch((error) => {
		console.log('hi from catch');
		console.error(error);
	});
}

function updateDB(){
    	var data = IMU.getValueSync();
    	const updates = {};
    	updates['lab2data/humidity'] = data.humidity;
   	update(ref(database), updates).then(() => {
    	console.log('updated humidity: ' + data.humidity);
    	}).catch((error) => {
    		console.error(error);
	});
}*/
