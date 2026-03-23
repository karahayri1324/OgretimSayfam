# OgretimSayfam - Dijital Egitim Yonetim Sistemi

Okul yonetimi, ogretmen, ogrenci ve veli isbirligini tek platformda birlestiren kapsamli bir egitim yonetim sistemi.

## Teknoloji Stack'i

| Katman | Teknoloji |
|--------|-----------|
| **Backend** | Node.js 20 + NestJS 10 + TypeScript 5 |
| **Frontend** | Next.js 14 (App Router) + React 18 + TypeScript 5 |
| **Veritabani** | PostgreSQL 16 + Prisma ORM 5 |
| **Onbellek** | Redis 7 |
| **State Yonetimi** | Zustand |
| **Stil** | Tailwind CSS 3 |
| **Kimlik Dogrulama** | JWT (Access + Refresh Token) + Passport.js |
| **Ders Programi Uretici** | FET (Free Timetable) Entegrasyonu |
| **Konteyner** | Docker + Docker Compose |

## Proje Yapisi

```
ogretimsayfam/
├── packages/
│   ├── backend/          # NestJS API sunucusu (Port: 3001)
│   ├── frontend/         # Next.js web uygulamasi (Port: 3000)
│   └── shared/           # Paylasilan tipler ve sabitler
├── services/
│   └── fet-service/      # FET ders programi servisi (Port: 3002)
├── docker-compose.yml    # Tum stack orkestrasyonu
├── tsconfig.base.json    # Ortak TypeScript ayarlari
└── package.json          # Monorepo workspace ayarlari
```

## Ozellikler

### Coklu Kiracili Mimari (Multi-Tenancy)
- Tek veritabaninda birden fazla okul destegi
- Subdomain veya `X-School-Slug` header'i ile okul izolasyonu
- Satir seviyesinde veri ayirimi (`schoolId` foreign key)

### Kullanici Rolleri (5 Rol)

| Rol | Erisim |
|-----|--------|
| **Super Admin** | Tum okullari ve sistemi yonetir |
| **Okul Admini** | Kendi okulunun tum islemlerini yonetir |
| **Ogretmen** | Dersler, notlar, yoklama, odevler |
| **Ogrenci** | Kendi notlari, devamsizligi, odevleri |
| **Veli** | Cocuklarinin durumunu takip eder |

### Moduller

| Modul | Aciklama |
|-------|----------|
| **Kimlik Dogrulama** | JWT tabanlı giris, token yenileme, sifre sifirlama |
| **Kullanici Yonetimi** | Rol bazli CRUD islemleri |
| **Okul Yonetimi** | Okul olusturma, guncelleme, slug bazli erisim |
| **Sinif Yonetimi** | Sinif/sube olusturma, ogrenci atama |
| **Ders Yonetimi** | Ders tanimlama, renk kodlama |
| **Derslik Yonetimi** | Fiziksel mekan yonetimi (Normal, Lab, Spor Salonu, Konferans) |
| **Ders Programi** | Manuel ve FET ile otomatik program olusturma |
| **Akademik Yil** | Donem ve yil yonetimi |
| **Yoklama** | Ogrenci ve ogretmen devamsizlik takibi, istatistikler |
| **Not Sistemi** | Agirlikli kategoriler (Yazili, Sozlu, Odev, Performans), toplu not girisi |
| **Odevler** | Odev olusturma, teslim takibi, notlandirma |
| **Sinif Defteri** | Gunluk ders konulari, admin onayi |
| **Duyurular** | Sinif/ogrenci bazli hedefleme, okundu takibi |
| **Etkinlikler** | Gezi, toren, spor, kultur etkinlikleri, katilim takibi |
| **Ders Degisikligi** | Devamsiz ogretmenler icin vekil atama |
| **Bildirimler** | Kullanici bildirimleri, okunmamis sayaci |
| **Dashboard** | Rol bazli ozet paneller |

### FET Ders Programi Entegrasyonu
- FET acik kaynak yazilimi ile otomatik ders programi olusturma
- Ogretmen musaitlik kisitlamalari
- Derslik kapasite ve tip uyumu
- Asenkron is tabanli uretim sistemi
- XML bazli veri aktarimi

## Hizli Baslangic

### On Kosullar
- Node.js 20+
- PostgreSQL 16
- Redis 7
- npm veya yarn

### Kurulum

```bash
# Repoyu klonlayin
git clone <repo-url>
cd ogretimsayfam

# Bagimliliklari yukleyin
npm install

# Ortam degiskenlerini ayarlayin
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env

# Veritabanini olusturun ve migrate edin
npm run db:migrate

# Demo verileri yukleyin
npm run db:seed

# Gelistirme sunucusunu baslatin
npm run dev
```

### Docker ile Calistirma

```bash
docker-compose up -d
```

Bu komut asagidaki servisleri baslatir:
- **PostgreSQL** - `localhost:5432`
- **Redis** - `localhost:6379`
- **Backend API** - `http://localhost:3001`
- **Frontend** - `http://localhost:3000`

### Ortam Degiskenleri

**Backend** (`packages/backend/.env`):
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ogretimsayfam?schema=public
JWT_SECRET=change-this-to-a-random-32-char-string
JWT_REFRESH_SECRET=change-this-to-another-random-32-char-string
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
FET_SERVICE_URL=http://localhost:3002
```

**Frontend** (`packages/frontend/.env`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Demo Hesaplari

Seed verileri yuklendikten sonra asagidaki hesaplarla giris yapabilirsiniz:

| Rol | E-posta | Sifre | Okul Slug |
|-----|---------|-------|-----------|
| Super Admin | admin@ogretimsayfam.com | 123456 | ataturk-anadolu |

> Diger ogretmen, ogrenci ve veli hesaplari seed dosyasindan olusturulur. Tum varsayilan sifre: `123456`

## API Dokumantasyonu

Gelistirme modunda Swagger dokumantasyonuna erisebilirsiniz:

```
http://localhost:3001/api/docs
```

### Temel API Endpointleri

| Grup | Yol | Aciklama |
|------|-----|----------|
| Auth | `POST /api/auth/login` | Kullanici girisi |
| Auth | `POST /api/auth/register` | Kullanici kaydi (Admin) |
| Auth | `POST /api/auth/refresh` | Token yenileme |
| Users | `GET /api/users` | Kullanici listesi |
| Schools | `GET /api/schools` | Okul listesi |
| Classes | `GET /api/classes` | Sinif listesi |
| Subjects | `GET /api/subjects` | Ders listesi |
| Timetable | `GET /api/timetable/class/:id` | Sinif ders programi |
| Timetable | `POST /api/timetable/fet/generate` | Otomatik program uretimi |
| Attendance | `POST /api/attendance` | Yoklama alma |
| Grades | `POST /api/grades/bulk` | Toplu not girisi |
| Assignments | `POST /api/assignments` | Odev olusturma |
| Announcements | `GET /api/announcements` | Duyuru listesi |
| Dashboard | `GET /api/dashboard/admin` | Admin paneli |
| Notifications | `GET /api/notifications` | Bildirimler |

> Tum korunmali endpointler `Authorization: Bearer <token>` header'i gerektirir.

## Veritabani Semasi

### Ana Modeller

```
School ─┬── User ──── TeacherProfile
        │             StudentProfile
        │             ParentProfile
        │
        ├── Class ─── StudentProfile (many-to-one)
        │             TimetableEntry
        │             Attendance
        │
        ├── Subject ── TimetableEntry
        │              TeacherAssignment
        │              Grade
        │
        ├── Classroom ── TimetableEntry
        │
        ├── AcademicYear ── Term ── Grade
        │                          Attendance
        │
        ├── Announcement ── AnnouncementRead
        │                   AnnouncementClass
        │                   AnnouncementStudent
        │
        ├── Event ── EventParticipant
        │            EventClass
        │
        └── GradeCategory ── Grade
```

### Prisma Komutlari

```bash
npm run db:migrate        # Migrasyon olustur ve calistir
npm run db:migrate:prod   # Uretim migrasyonu
npm run db:seed           # Demo verileri yukle
npm run db:studio         # Prisma Studio gorsel editoru
npm run db:generate       # Prisma Client olustur
```

## Guvenlik

- **Helmet** - HTTP guvenlik header'lari
- **bcrypt** - Sifre hashleme (10 round)
- **Rate Limiting** - Global: 60 istek/dakika, Giris: 5 istek/dakika
- **CORS** - Yapilandirilabilir origin kontrolu
- **JWT** - Access token (15dk) + Refresh token (7 gun, DB'de sakli)
- **Validation Pipe** - Whitelist modu, fazla alan reddi
- **Rol Tabanli Erisim** - Guard ve decorator bazli yetkilendirme
- **Content Security Policy** - Frontend guvenlik basliклari

## Gelistirme Komutlari

```bash
# Tum servisleri baslat (backend + frontend)
npm run dev

# Sadece backend
npm run dev:backend

# Sadece frontend
npm run dev:frontend

# FET servisi
npm run dev:fet

# Tum projeyi derle
npm run build

# Veritabani islemleri
npm run db:migrate
npm run db:seed
npm run db:studio
```

## Mimari Kararlar

- **Monorepo**: npm workspaces ile yonetilen coklu paket yapisi
- **Multi-Tenancy**: `schoolId` bazli satir seviyesi izolasyon
- **FET Servisi**: Bagimsiz Express mikro servis olarak calisir
- **JWT Refresh Token**: Veritabaninda saklanir (uretimde Redis onerilir)
- **Swagger**: Sadece gelistirme ortaminda aktif
- **Docker Multi-Stage Build**: Optimize edilmis uretim imajlari
- **Global Exception Filter**: Standartlastirilmis hata yanıtları

## Lisans

Bu proje ozel bir projedir.
