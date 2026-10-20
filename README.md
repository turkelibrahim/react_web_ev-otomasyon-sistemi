# 🏠 SmartHome Dashboard & Automation Hub
### Akıllı Ev Yönetim ve Otomasyon Sistemi

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/JSON_Server-Mock_API-blue?style=for-the-badge&logo=json" alt="JSON Server" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=for-the-badge" alt="PRs Welcome" />
</p>

---

## 🌐 Language / Dil
- [English](#-english)
- [Türkçe](#-t%C3%BCrk%C3%A7e)

---

# 🇬🇧 English

## 📖 Overview
**SmartHome Dashboard** is an advanced, responsive IoT smart home management platform built with modern **React 19** and **Vite**. It delivers an intuitive interface for monitoring and controlling smart devices, visual floor plans, automated rule execution, CCTV camera simulations, and role-based administrative control.

---

## ✨ Key Features

- **🎛️ Interactive Device Controls:**
  - Real-time control over smart lighting (dimmer, brightness, color, on/off).
  - Smart thermostats (current vs. target temperature adjustment).
  - Smart curtains/blinds, smart plugs, locks, and appliances.
  - Optimistic UI updates with debounced API synchronization.

- **🏡 Dynamic Room Visualizer & Floor Plan:**
  - Interactive 2D floor plan view and room-by-room studio visualizer.
  - Dynamic image state switching reflecting lighting, curtain positions, and room activity (Living Room, Bedroom, Kitchen, Bathroom, Balcony).

- **📹 CCTV Security Monitoring:**
  - Real-time simulated CCTV camera modal.
  - Night vision simulation, motion detection alerts, snapshot capture, and multi-camera feeds.

- **⚡ Automation Engine & Rule Builder:**
  - Client-side event-driven automation engine (`automationEngine.js`).
  - Create conditional triggers (e.g., *IF temperature > 26°C THEN turn on AC*, *IF motion detected THEN switch on lights*).
  - Real-time rule evaluation and automated action execution.

- **👥 Authentication & Role-Based Access Control (RBAC):**
  - Multi-user authentication system (Admin vs. Standard User).
  - Route guards protecting restricted dashboards and settings.
  - Admin management panel for user provisioning, room assignment, and system logs.

- **📱 QR Code Sharing & Device Pairing:**
  - Built-in QR code generator for sharing room access and device pairing.

- **🔔 Toast & Notification System:**
  - Centralized toast notification system alerting on threshold violations, security events, and rule executions.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, JavaScript (ESNext), HTML5, Vanilla CSS3 (Custom Design System, Glassmorphism, Micro-interactions)
- **Bundler & Dev Server:** Vite 8
- **Mock Backend API:** `json-server` (port 5000)
- **Utility Libraries:** `qrcode`, `concurrently`
- **Linting & Code Quality:** Oxlint

---

## 🚀 Quick Start

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/turkelibrahim/react_web_ev-otomasyon-sistemi.git
cd react_web_ev-otomasyon-sistemi
npm install
```

### 3. Running the Application
Launch both the **JSON-Server backend** and the **Vite frontend server** concurrently:
```bash
npm start
```

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)

---

## 🔑 Demo Credentials

| Role | Username | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `123` | Full Access (Dashboard, Rules, Admin Panel) |
| **User** | `ahmet` | `123` | Dashboard & Personal Rules |
| **User** | `melike` | `1234567` | Dashboard & Personal Rules |

---

## 📂 Project Structure

```text
├── public/                 # Static assets, SVG icons, and room state visuals
│   └── rooms/              # Room state images (on/off, day/night)
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── CCTVModal.jsx       # CCTV camera live preview modal
│   │   ├── DeviceCard.jsx      # Device controller cards
│   │   ├── FloorPlan.jsx       # 2D Floor plan visualizer
│   │   ├── Navbar.jsx          # Top navigation & user status
│   │   └── RoomVisualizer.jsx  # Interactive studio room visualizer
│   ├── context/            # React Context providers (Auth, Toast)
│   ├── pages/              # Application views (Dashboard, Login, Rules, Admin)
│   ├── services/           # API handlers and Automation Engine
│   ├── utils/              # Helper utilities & room visual mappings
│   ├── App.jsx             # Root layout & route guards
│   └── index.css           # Global CSS design system
├── db.json                 # Mock database (Users, Devices, Rules, Notifications)
└── package.json            # Project dependencies and npm scripts
```

---
---

# 🇹🇷 Türkçe

## 📖 Genel Bakış
**SmartHome Dashboard**, modern **React 19** ve **Vite** mimarisiyle geliştirilmiş zengin ve duyarlı bir Akıllı Ev / IoT yönetim merkezidir. Akıllı cihazların anlık kontrolü, interaktif 2D kat planı ve oda görselleştiricisi, kural tabanlı otomasyon motoru, CCTV güvenlik kamerası simülasyonu ve yetki seviyeli yönetim paneli sunar.

---

## ✨ Öne Çıkan Özellikler

- **🎛️ İnteraktif Cihaz Kontrolü:**
  - Akıllı aydınlatmalar (parlaklık, renk sıcaklığı, açma/kapatma).
  - Termostat kontrolü (hedef sıcaklık ayarı ve anlık ortam derecesi).
  - Akıllı prizler, kilitler, panjurlar ve perdeler.
  - Debounce korumalı anlık API senkronizasyonu ve iyimser arayüz (optimistic UI).

- **🏡 İnteraktif Oda ve Kat Görselleştirici:**
  - 2D interaktif kat planı (Floor Plan).
  - Cihaz durumlarına (ışıklar açık/kapalı, panjur durumu vb.) anında tepki veren dinamik oda görselleştirici (Salon, Yatak Odası, Mutfak, Banyo, Balkon).

- **📹 CCTV Canlı Güvenlik İzleme:**
  - Gerçekçi güvenlik kamerası izleme penceresi (CCTV Modal).
  - Gece görüş simülasyonu, hareket algılama uyarıları, anlık fotoğraf çekimi ve çoklu kamera geçişi.

- **⚡ Otomasyon ve Kural Motoru:**
  - İstemci taraflı çalışan olay güdümlü kural motoru (`automationEngine.js`).
  - Koşullu kurallar oluşturma (*Örn: Sıcaklık > 25°C ise Klimayı çalıştır*, *Hareket algılandığında ışıkları yak*).
  - Otomasyon tetiklemelerinde anlık bildirim sistemi.

- **👥 Rol Tabanlı Yetkilendirme (RBAC):**
  - Yönetici (Admin) ve Standart Kullanıcı oturum sistemi.
  - Yetkisiz girişleri engelleyen rota koruyucuları (Route Guards).
  - Admin paneli ile kullanıcı ekleme/düzenleme, oda yetkileri atama ve sistem loglarını inceleme.

- **📱 QR Kod Paylaşımı:**
  - Odaları ve cihaz yetkilerini kolayca paylaşmak için entegre QR kod üretici.

- **🔔 Bildirim ve Toast Sistemi:**
  - Kritik sıcaklık alarmları, kural tetiklemeleri ve güvenlik uyarıları için dinamik toast bildirimleri.

---

## 🛠️ Kullanılan Teknolojiler

- **Ön Yüz (Frontend):** React 19, JavaScript (ESNext), HTML5, Özel CSS3 Tasarım Sistemi (Glassmorphism, Akıcı Animasyonlar)
- **Derleyici & Sunucu:** Vite 8
- **Sahte Sunucu (Mock API):** `json-server` (Port: 5000)
- **Yardımcı Kütüphaneler:** `qrcode`, `concurrently`
- **Kod Denetimi:** Oxlint

---

## 🚀 Kurulum ve Çalıştırma

### 1. Gereksinimler
Bilgisayarınızda [Node.js](https://nodejs.org/) kurulu olmalıdır (v18 veya üzeri önerilir).

### 2. Projeyi Klonlayın ve Bağımlılıkları Yükleyin:
```bash
git clone https://github.com/turkelibrahim/react_web_ev-otomasyon-sistemi.git
cd react_web_ev-otomasyon-sistemi
npm install
```

### 3. Uygulamayı Başlatın:
Hem frontend (Vite) hem de backend (JSON Server) sunucularını aynı anda başlatmak için:
```bash
npm start
```

- **Ön Yüz (Frontend):** [http://localhost:5173](http://localhost:5173)
- **Arka Yüz (JSON Server):** [http://localhost:5000](http://localhost:5000)

---

## 🔑 Test Kullanıcı Bilgileri

| Rol | Kullanıcı Adı | Şifre | Yetki Seviyesi |
| :--- | :--- | :--- | :--- |
| **Yönetici (Admin)** | `admin` | `123` | Tam Yetki (Dashboard, Kurallar, Admin Paneli) |
| **Kullanıcı** | `ahmet` | `123` | Dashboard ve Kendi Kuralları |
| **Kullanıcı** | `melike` | `1234567` | Dashboard ve Kendi Kuralları |

---

## 📄 Lisans
Bu proje [MIT](LICENSE) lisansı ile lisanslanmıştır.
