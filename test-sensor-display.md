# Hướng dẫn Test Hiển thị Dữ liệu Sensor

## Bước 1: Chạy Server

Mở terminal và chạy server:
```bash
cd smart_plant_monitoring_and_watering_system
npm run start:dev
```

Đợi đến khi thấy log:
```
[MqttService]  Đã kết nối đến HiveMQ!
[MqttService]  Đã subscribe tất cả topics (#) - để test
[MqttService]  Đã subscribe topic: iot/sensor/+
```

---

## Bước 2: Gửi Dữ liệu Sensor từ HiveMQ Cloud

### Trong HiveMQ Cloud Web Client:

1. **Vào tab "Web Client"**

2. **Trong phần "Send Message"**:
   - **Topic**: `iot/sensor/1` (thay 1 bằng gardenId của bạn)
   - **Message**: Chọn format **JSON** và nhập:
   ```json
   {
     "temperature": 25.5,
     "airHumidity": 60.0,
     "soilMoisture": 45.0
   }
   ```
   - **QoS**: Chọn `QoS: 0`

3. **Click nút "Send Message"** (màu vàng)

---

## Bước 3: Xem Kết quả trên Console

Sau khi gửi, bạn sẽ thấy trên **server console**:

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

## Test với Dữ liệu Khác

### Test 1: Nhiệt độ cao
```json
{
  "temperature": 35.0,
  "airHumidity": 80.0,
  "soilMoisture": 30.0
}
```

### Test 2: Độ ẩm đất thấp (cần tưới)
```json
{
  "temperature": 28.0,
  "airHumidity": 55.0,
  "soilMoisture": 20.0
}
```

### Test 3: Điều kiện lý tưởng
```json
{
  "temperature": 22.0,
  "airHumidity": 65.0,
  "soilMoisture": 50.0
}
```

---

## Test Tự động (Gửi mỗi 3 giây)

Nếu bạn muốn test tự động gửi mỗi 3 giây, bạn có thể:

1. **Sử dụng MQTTX Desktop App**:
   - Tạo connection đến HiveMQ
   - Publish message với topic `iot/sensor/1`
   - Sử dụng tính năng "Auto Send" (nếu có)

2. **Hoặc sử dụng script Node.js** (nếu có):
   ```bash
   node test-mqtt-publisher.js
   ```

---

## Lưu ý

1. **GardenId phải tồn tại**: Đảm bảo có vườn với ID tương ứng trong database
2. **JSON format phải đúng**: Phải có 3 trường: temperature, airHumidity, soilMoisture
3. **Giá trị hợp lệ**:
   - temperature: -50 đến 60 (°C)
   - airHumidity: 0 đến 100 (%)
   - soilMoisture: 0 đến 100 (%)

---

## Troubleshooting

### ❌ Không thấy hiển thị đẹp trên console

**Kiểm tra:**
1. Server đã chạy chưa?
2. Server đã kết nối đến HiveMQ chưa?
3. Topic có đúng format `iot/sensor/{gardenId}` không?
4. JSON format có đúng không?
5. GardenId có tồn tại trong database không?

### ❌ Lỗi "Vườn không tồn tại"

Tạo vườn trước:
- Sử dụng API hoặc Prisma Studio để tạo vườn với ID tương ứng

### ✅ Thành công

Nếu thấy bảng đẹp với dữ liệu sensor, nghĩa là test thành công! 🎉

