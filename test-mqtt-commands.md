# Hướng dẫn Test MQTT Server

## Cách 1: Sử dụng Script Test (Khuyên dùng)

### Bước 1: Cài đặt dependencies (nếu chưa có)
```bash
cd smart_plant_monitoring_and_watering_system
npm install mqtt
```

### Bước 2: Chạy server NestJS
```bash
npm run start:dev
```

### Bước 3: Chạy script test trong terminal khác
```bash
node test-mqtt-publisher.js
```

Script sẽ tự động:
- Kết nối đến HiveMQ
- Gửi dữ liệu sensor giả lập mỗi 3 giây
- Hiển thị dữ liệu đã gửi trên console

Bạn sẽ thấy output trên server console như:
```
════════════════════════════════════════════════════════════
📊 DỮ LIỆU CẢM BIẾN - VƯỜN #1
⏰ Thời gian: 27/01/2025, 14:30:25
────────────────────────────────────────────────────────────
🌡️  Nhiệt độ:        25.5°C
💧 Độ ẩm không khí:  60.0%
🌱 Độ ẩm đất:        45.0%
════════════════════════════════════════════════════════════
✅ Đã lưu vào database
```

---

## Cách 2: Sử dụng MQTTX (Desktop App)

### Bước 1: Tải MQTTX
- Windows/Mac/Linux: https://mqttx.app/
- Hoặc cài qua: `npm install -g @emqx/mqttx-cli`

### Bước 2: Tạo connection trong MQTTX
1. Mở MQTTX
2. Click "New Connection"
3. Điền thông tin:
   - **Name**: Test HiveMQ
   - **Host**: `6dbb453c749b4a2a9f84d544ee9cad40.s1.eu.hivemq.cloud`
   - **Port**: `8883`
   - **Protocol**: `mqtts` hoặc `mqtt over TLS/SSL`
   - **Username**: `sang2004`
   - **Password**: `Sang01032004`

### Bước 3: Publish message
1. Click "New Message"
2. **Topic**: `iot/sensor/1` (thay 1 bằng gardenId của bạn)
3. **Payload**: Chọn JSON và nhập:
```json
{
  "temperature": 25.5,
  "airHumidity": 60.0,
  "soilMoisture": 45.0
}
```
4. Click "Send"

---

## Cách 3: Sử dụng mosquitto_pub (Command Line)

### Cài đặt Mosquitto:
```bash
# Windows (choco)
choco install mosquitto

# Linux
sudo apt-get install mosquitto-clients

# Mac
brew install mosquitto
```

### Gửi message:
```bash
mosquitto_pub -h 6dbb453c749b4a2a9f84d544ee9cad40.s1.eu.hivemq.cloud \
  -p 8883 \
  --cafile /path/to/ca.crt \
  --username sang2004 \
  --pw Sang01032004 \
  -t iot/sensor/1 \
  -m '{"temperature":25.5,"airHumidity":60.0,"soilMoisture":45.0}'
```

---

## Cách 4: Sử dụng Online MQTT Client

1. Truy cập: https://www.hivemq.com/try-out/
2. Click "WebSocket Client"
3. Kết nối với thông tin broker của bạn
4. Subscribe topic: `iot/sensor/+`
5. Publish message với format JSON

---

## Test Gửi Lệnh Điều Khiển

### Sử dụng MQTTX:
1. **Topic**: `iot/control/1`
2. **Payload** (JSON):
```json
{
  "action": "start",
  "duration": 3
}
```

### Sử dụng Script:
Tạo file `test-control.js`:
```javascript
const mqtt = require('mqtt');

const client = mqtt.connect({
  host: '6dbb453c749b4a2a9f84d544ee9cad40.s1.eu.hivemq.cloud',
  port: 8883,
  protocol: 'mqtts',
  username: 'sang2004',
  password: 'Sang01032004',
});

client.on('connect', () => {
  const command = {
    action: 'start',
    duration: 3
  };
  
  client.publish('iot/control/1', JSON.stringify(command));
  console.log('Đã gửi lệnh:', command);
  client.end();
});
```

---

## Kiểm tra Database

Sau khi nhận dữ liệu, bạn có thể kiểm tra database:
```bash
# Sử dụng Prisma Studio
npx prisma studio
```

Hoặc query trực tiếp:
```sql
SELECT * FROM "Sensor" ORDER BY timestamp DESC LIMIT 10;
```

---

## Troubleshooting

### Lỗi kết nối MQTT:
- Kiểm tra internet connection
- Kiểm tra username/password
- Kiểm tra firewall/port 8883

### Không nhận được dữ liệu:
- Kiểm tra server đã chạy chưa
- Kiểm tra topic format: `iot/sensor/{gardenId}`
- Kiểm tra JSON format phải đúng
- Kiểm tra logs của server

### Dữ liệu không lưu vào database:
- Kiểm tra database connection
- Kiểm tra gardenId có tồn tại trong database không
- Kiểm tra logs lỗi trên server

