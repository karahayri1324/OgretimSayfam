# ÖğretimSayfam - Master Plan

## Proje Özeti
**ÖğretimSayfam**, birden fazla okulu destekleyen kapsamlı bir dijital eğitim yönetim sistemidir.
Her okul kendi alt alan adı (subdomain) üzerinden izole bir şekilde yönetilir.

---

## Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| **Backend** | Node.js + NestJS + TypeScript |
| **Frontend** | Next.js 14 (App Router) + React + TypeScript |
| **Veritabanı** | PostgreSQL + Prisma ORM |
| **Auth** | JWT (Access + Refresh Token) |
| **Cache** | Redis (session, cache) |
| **Ders Programı** | FET entegrasyonu (HTTP API) |
| **Styling** | Tailwind CSS |
| **State** | Zustand |
| **API İletişimi** | REST + Axios |
| **Container** | Docker + Docker Compose |

---

## Mimari Kararlar

### Multi-Tenant (Çoklu Okul)
- **Strateji:** Tek veritabanı, `schoolId` ile izolasyon
- **Routing:** Production'da subdomain bazlı (`okul1.ogretimsayfam.com`), localhost'ta query/header bazlı
- **Middleware:** Her request'te tenant (okul) belirlenir ve tüm query'ler filtrelenir

### Kullanıcı Rolleri
| Rol | Açıklama |
|-----|----------|
| `SUPER_ADMIN` | Platform yöneticisi, tüm okullara erişim |
| `SCHOOL_ADMIN` | Okul müdürü/yöneticisi, kendi okulunu yönetir |
| `TEACHER` | Öğretmen, kendi derslerini yönetir |
| `STUDENT` | Öğrenci, kendi verilerini görüntüler |
| `PARENT` | Veli, çocuğunun verilerini görüntüler |

### Subdomain Yapısı
```
platform.ogretimsayfam.com  → Super Admin paneli
okul1.ogretimsayfam.com     → Okul 1 arayüzü
okul2.ogretimsayfam.com     → Okul 2 arayüzü
```

---

## Modüller ve Özellikler

### 1. Auth & Kullanıcı Yönetimi
- [x] Planlama
- [ ] JWT tabanlı kimlik doğrulama (access + refresh token)
- [ ] Rol bazlı yetkilendirme (RBAC)
- [ ] Kullanıcı CRUD (oluştur, oku, güncelle, sil)
- [ ] Şifre sıfırlama
- [ ] Profil yönetimi
- [ ] Oturum yönetimi

### 2. Okul Yönetimi
- [ ] Okul kaydı ve profili
- [ ] Okul ayarları (ders saatleri, dönemler, tatiller)
- [ ] Akademik yıl ve dönem yönetimi
- [ ] Sınıf/Şube oluşturma ve yönetimi
- [ ] Ders tanımları
- [ ] Ders-Öğretmen-Sınıf eşleştirmeleri

### 3. Ders Programı & FET Entegrasyonu
- [ ] FET yazılımı HTTP API servisi
- [ ] Ders programı verilerini FET'e gönderme
- [ ] FET'ten oluşturulan programı alma
- [ ] Ders programı görüntüleme (sınıf/öğretmen/derslik bazlı)
- [ ] Manuel düzenleme imkanı
- [ ] Kısıtlama tanımlama (öğretmen müsaitlik, derslik kapasitesi)

### 4. Yoklama Sistemi
- [ ] Ders bazlı yoklama alma
- [ ] Yoklama durumları: Geldi, Gelmedi, Geç Kaldı, İzinli
- [ ] Günlük/haftalık/aylık yoklama raporları
- [ ] Öğretmen yoklaması (gelmeyen öğretmen takibi)
- [ ] Veliye otomatik bildirim (çocuk gelmedi)
- [ ] Yoklama istatistikleri ve grafikler

### 5. Not & Puanlama Sistemi
- [ ] Sınav notu girme
- [ ] Ders içi performans puanı
- [ ] Ödev notu
- [ ] Sözlü notu
- [ ] Not ağırlıkları (yazılı %60, sözlü %40 vs.)
- [ ] Karne notu hesaplama
- [ ] Not çizelgesi ve istatistikler
- [ ] Veliye not bildirimi

### 6. Ödev Sistemi
- [ ] Ödev oluşturma (başlık, açıklama, dosya eki)
- [ ] Ödev teslim tarihi belirleme
- [ ] Öğrenci ödev teslimi
- [ ] Öğretmen ödev değerlendirme
- [ ] Geç teslim takibi
- [ ] Ödev istatistikleri

### 7. Duyuru Sistemi
- [ ] Admin duyuruları (okul geneli)
- [ ] Öğretmen duyuruları (sınıf/ders bazlı)
- [ ] Duyuru kategorileri (genel, acil, etkinlik, sınav)
- [ ] Duyuru hedef kitlesi seçimi (tüm okul, sınıf, veli, öğretmen)
- [ ] Okundu takibi
- [ ] Sabitlenmiş duyurular

### 8. Sınıf Defteri
- [ ] Günlük ders işleme kaydı
- [ ] İşlenen konu girişi
- [ ] Ders saati bazlı kayıt
- [ ] Öğretmen imzası (onay)
- [ ] Müfettiş/yönetici görüntüleme
- [ ] Yıllık/dönemlik rapor

### 9. Vekil Öğretmen (İkame) Sistemi
- [ ] Öğretmen devamsızlık bildirimi
- [ ] Boş ders işaretleme
- [ ] Uygun vekil öğretmen listesi (o saatte boş olanlar)
- [ ] Vekil atama
- [ ] Vekil ders kaydı
- [ ] İkame raporu

### 10. Etkinlik Yönetimi
- [ ] Etkinlik oluşturma (gezi, tören, toplantı, sportif vs.)
- [ ] Etkinlik takvimi
- [ ] Katılımcı listesi
- [ ] Etkinlik duyurusu
- [ ] Etkinlik raporu

### 11. Veli Paneli
- [ ] Çocuğun yoklama durumu
- [ ] Not ve puanlar
- [ ] Ödevler
- [ ] Ders programı
- [ ] Duyurular
- [ ] Öğretmenle mesajlaşma
- [ ] Etkinlik takvimi

### 12. Dashboard & Raporlar
- [ ] Admin dashboard (okul genel görünümü)
- [ ] Öğretmen dashboard
- [ ] Öğrenci dashboard
- [ ] Veli dashboard
- [ ] Yoklama raporları
- [ ] Not raporları
- [ ] Devamsızlık raporları

---

## Veritabanı Tabloları (Ana)

```
schools              - Okullar
users                - Kullanıcılar (tüm roller)
academic_years       - Akademik yıllar
terms                - Dönemler
classes              - Sınıflar/Şubeler
subjects             - Dersler
classrooms           - Derslikler
class_subjects       - Sınıf-Ders eşleştirmeleri
teacher_assignments  - Öğretmen-Ders-Sınıf atamaları
students             - Öğrenci profilleri
parents              - Veli profilleri
parent_students      - Veli-Öğrenci ilişkisi
timetable_slots      - Ders programı slotları
timetable_entries    - Ders programı kayıtları
attendances          - Yoklama kayıtları
teacher_attendances  - Öğretmen yoklama
grades               - Notlar
grade_categories     - Not kategorileri
assignments          - Ödevler
assignment_submissions - Ödev teslimleri
announcements        - Duyurular
announcement_targets - Duyuru hedef kitleleri
class_diary          - Sınıf defteri kayıtları
substitutions        - Vekil öğretmen atamaları
events               - Etkinlikler
event_participants   - Etkinlik katılımcıları
notifications        - Bildirimler
```

---

## Dosya Yapısı

```
OgretimSayfamv2/
├── PLAN.md
├── PROGRESS.md
├── docker-compose.yml
├── packages/
│   ├── backend/                 # NestJS API
│   │   ├── src/
│   │   │   ├── common/          # Ortak utility, guard, decorator, filter
│   │   │   ├── config/          # Konfigürasyon
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── schools/
│   │   │   │   ├── classes/
│   │   │   │   ├── subjects/
│   │   │   │   ├── timetable/
│   │   │   │   ├── attendance/
│   │   │   │   ├── grades/
│   │   │   │   ├── assignments/
│   │   │   │   ├── announcements/
│   │   │   │   ├── class-diary/
│   │   │   │   ├── substitutions/
│   │   │   │   ├── events/
│   │   │   │   └── notifications/
│   │   │   ├── prisma/
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── package.json
│   ├── frontend/                # Next.js App
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/      # Login, register sayfaları
│   │   │   │   ├── (dashboard)/ # Rol bazlı dashboard'lar
│   │   │   │   ├── admin/
│   │   │   │   ├── teacher/
│   │   │   │   ├── student/
│   │   │   │   └── parent/
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   ├── hooks/
│   │   │   ├── stores/
│   │   │   └── styles/
│   │   └── package.json
│   └── shared/                  # Paylaşılan tipler ve utils
│       ├── src/
│       │   ├── types/
│       │   └── constants/
│       └── package.json
├── services/
│   └── fet-service/             # FET entegrasyon servisi
│       ├── src/
│       └── package.json
└── assets/
    └── logo/
        └── ogretimsayfam.png
```

---

## İlerleme Durumu
Detaylı ilerleme için [PROGRESS.md](PROGRESS.md) dosyasına bakınız.
