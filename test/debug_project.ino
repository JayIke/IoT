

#include <Arduino_HTS221.h>
#include <Arduino_LSM9DS1.h>
#include <PDM.h>
#include <ArduinoBLE.h>
//#include "TimeoutTimer.h"
#define BUFSIZE 20
#define DURATION 10000
#define THRESHOLD 300

bool LED_SWITCH;

enum STATE {OFF, MAYBE, ON};

BLEService uartService("6E400001-B5A3-F393-E0A9-E50E24DCCA9E");
BLEStringCharacteristic txChar("6E400002-B5A3-F393-E0A9-E50E24DCCA9E", BLEWrite, 20);
BLEStringCharacteristic rxChar("6E400003-B5A3-F393-E0A9-E50E24DCCA9E", BLERead | BLENotify, 20);

const static char channels = 1;
const static int frequency = 16000;
int sleep_time = 1;
int last_check = 0;
short sampleBuffer[256];
volatile int samplesRead;
STATE state = OFF;
int timer = 0;
int highest_temp = 0;
int highest_hum = 0;
int polls = 0;

void setup() {
  Serial.begin(9600);
  while (!Serial)
    ;

  if (!BLE.begin()) {
    Serial.println("Starting BLE failed!");
    while (1)
      ;
  }

  PDM.onReceive(onPDMdata);
  if (!PDM.begin(channels, frequency)) {
    Serial.println("Failed to start PDM!");
    while (1)
      ;
  }

  if (!HTS.begin()) {
    Serial.println("Failed to initialize humidity temperature sensor!");
    while (1)
      ;
  }

  // Get the Arduino's BT address
  String deviceAddress = BLE.address();
  BLE.setLocalName("Shower monitor");

  // UART service
  BLE.setAdvertisedService(uartService);
  uartService.addCharacteristic(txChar);
  uartService.addCharacteristic(rxChar);
  BLE.addService(uartService);

  // Start advertising
  BLE.advertise();
  Serial.println("Bluetooth device (" + deviceAddress + ") active, waiting for connections...");

  LED_SWITCH = false;

  
  Serial.println("Registered callback");
}

void loop() {
  BLEDevice central = BLE.central();
  // Wait for samples to be read
  if (central) {
    // Print the central's BT address.
    Serial.print("Connected to central: ");
    Serial.println(central.address());

    // While the central device is connected...
    while (central.connected()) {
      if (samplesRead) {
        Serial.println("Read");
        int maxAbs = 0;
        // Print samples to the serial monitor or plotter
        for (int i = 0; i < samplesRead; i++) {
          Serial.println(sampleBuffer[i]);
          if (abs(sampleBuffer[i]) > maxAbs) maxAbs = abs(sampleBuffer[i]);//added index for abs
        }
        if (maxAbs > THRESHOLD) {
          Serial.println("High signal");
          handleHigh();
        }
          handleLow();
        }
        // Clear the read count
        samplesRead = 0;
      }
      Serial.print("Disconnected from central: ");
      Serial.println(central.address());
      }
    
  }
    
  

void handleHigh() {
  polls += 1;
  int tmp = HTS.readTemperature();
  int hum = HTS.readHumidity();
  if (hum > highest_hum) highest_hum = hum;
  if (tmp > highest_temp) highest_temp = tmp;

  switch (state) {
    case OFF: {
      state = MAYBE;
      timer = millis();
      highest_temp = 0;
      highest_hum = 0;
      polls = 0;
    }
      break;
    case MAYBE: 
      if ((millis() - timer) > (DURATION)) {
        state = ON;
      } break;
    case ON: 
      break;    
    default: break;
  }
}

void handleLow() {
  switch (state) {
    case OFF: 
      break;
    case MAYBE: 
      state = OFF;
      break;
    case ON: {
      char bufferTime[BUFSIZE+1];
      char bufferTemp[BUFSIZE+1];
      char bufferHum[BUFSIZE+1];
      
      int seed = random(100000,999999);
      float time = (millis() - timer) / 1000.0; // convert to seconds
      String timeString = String("D/") + String(seed) + String("/") + String(time);
      snprintf(bufferTime, BUFSIZE, "D/%d/%d", seed, time);
      Serial.println(bufferTime);
      rxChar.writeValue(timeString);

      String tempString = String("T/") + String(seed) + String("/") + String(highest_temp);
      snprintf(bufferTemp, BUFSIZE, "T/%d/%.1f", seed, highest_temp);      
      Serial.println(bufferTemp);
      rxChar.writeValue(tempString);

      String humString = String("H/") + String(seed) + String("/") + String(highest_hum);
      snprintf(bufferHum, BUFSIZE, "H/%d/%.1f", seed, highest_hum);   
      Serial.println(bufferHum);
      rxChar.writeValue(humString);
      state = OFF;
    }
      break;
    default: break;
  }
}

void onPDMdata() {
  // query the number of bytes available
  int bytesAvailable = PDM.available();

  // read into the sample buffer
  int bytesRead = PDM.read(sampleBuffer, bytesAvailable);

  // 16-bit, 2 bytes per sample
  samplesRead = bytesRead / 2;
}

void loop2() {
  // Wait for a BLE central device.
  BLEDevice central = BLE.central();

  // If a central device is connected to the peripheral...
  if (central) {
    // Print the central's BT address.
    Serial.print("Connected to central: ");
    Serial.println(central.address());

    // While the central device is connected...
    while (central.connected()) {
      // Receive data from central (if written is true)

      if (txChar.written()) {
        Serial.print("[Recv new interval] ");
        arduino::String new_interval = txChar.value();
        Serial.println(new_interval);
        sleep_time = new_interval.toInt();
        last_check = 0;
      }

      if (millis() > last_check + sleep_time * 1000) {
        //float temp = HTS.readTemperature();
       // Serial.print("Temp: ");
       // Serial.println(temp);

        // Cast to desired format; multiply by 100 to keep desired precision.
        //short shortTemp = (short)(temp * 100);

        // Send data to centeral for temperature characteristic.
        //txChar.writeValue(shortTemp);
        last_check = millis();
      }
    }
    Serial.print("Disconnected from central: ");
    Serial.println(central.address());
  }
}
