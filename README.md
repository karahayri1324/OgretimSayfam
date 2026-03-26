# OgretimSayfam - Dijital Egitim Yonetim Sistemi

Okul yonetimi, ogretmen, ogrenci ve veli isbirligini tek platformda birlestiren kapsamli bir egitim yonetim sistemi. Coklu kiracili (multi-tenant) mimari ile birden fazla okul tek sistemde yonetilebilir.

## Teknoloji Stack'i

| Katman | Teknoloji |
|--------|-----------|
| **Backend** | Node.js 20 + NestJS 10 + TypeScript 5 |
| **Frontend** | Next.js 14 (App Router) + React 18 + TypeScript 5 |
| **Veritabani** | PostgreSQL 16 + Prisma ORM 5 |
| **Onbellek** | Redis 7 |
| **State Yonetimi** | Zustand 4.5 |
| **Stil** | Tailwind CSS 3 |
| **Kimlik Dogrulama** | JWT (Access + Refresh Token) + Passport.js |
| **API Dokumantasyonu** | Swagger / OpenAPI |
| **Ders Programi Uretici** | FET (Free Timetable) Entegrasyonu |
| **Konteyner** | Docker + Docker Compose (Multi-Stage Build) |

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
└── package.json          # Monorepo workspace ayarlari (npm workspaces)
```

## Ozellikler

### Coklu Kiracili Mimari (Multi-Tenancy)
- Tek veritabaninda birden fazla okul destegi
- Subdomain (`okul.ogretimsayfam.com`) veya `X-School-Slug` header'i ile okul izolasyonu
- Satir seviyesinde veri ayirimi (`schoolId` foreign key)
- Middleware tabanli kiracili baglamı cozumlemesi

### Kullanici Rolleri (5 Rol)

| Rol | Erisim |
|-----|--------|
| **Super Admin** | Tum okullari ve sistemi yonetir |
| **Okul Admini** | Kendi okulunun tum islemlerini yonetir |
| **Ogretmen** | Dersler, notlar, yoklama, odevler, sinif defteri, duyurular |
| **Ogrenci** | Kendi notlari, devamsizligi, odevleri, ders programi |
| **Veli** | Cocuklarinin not ve odev durumunu takip eder |

### Moduller (18 Backend Modulu)

| Modul | Aciklama |
|-------|----------|
| **Kimlik Dogrulama** | JWT tabanli giris, token yenileme, refresh token (DB'de sakli) |
| **Kullanici Yonetimi** | Rol bazli CRUD, profil olusturma (ogretmen/ogrenci/veli) |
| **Okul Yonetimi** | Okul olusturma, guncelleme, slug bazli erisim |
| **Sinif Yonetimi** | Sinif/sube olusturma, ogrenci atama, kapasite takibi |
| **Ders Yonetimi** | Ders tanimlama, renk kodlama, ogretmen-ders eslemesi |
| **Derslik Yonetimi** | Fiziksel mekan yonetimi (Normal, Lab, Spor Salonu, Konferans) |
| **Ders Programi** | Manuel ve FET ile otomatik program olusturma |
| **Akademik Yil** | Donem (term) ve yil yonetimi, tarih araliklari |
| **Yoklama** | Ogrenci ve ogretmen devamsizlik takibi (Geldi, Gelmedi, Gec, Izinli) |
| **Not Sistemi** | Agirlikli kategoriler (Yazili %40, Sozlu %15, Odev %15, Performans %15, Proje %15) |
| **Odevler** | Odev olusturma, teslim takibi, notlandirma, geri bildirim |
| **Sinif Defteri** | Gunluk ders konulari kaydi, admin onayi sistemi |
| **Duyurular** | Sinif/ogrenci bazli hedefleme, okundu takibi, kategoriler (Genel, Acil, Etkinlik, Sinav) |
| **Etkinlikler** | Gezi, toren, spor, kultur etkinlikleri, katilim takibi |
| **Ders Degisikligi** | Devamsiz ogretmenler icin vekil atama, bos ders isaretleme |
| **Bildirimler** | Kullanici bildirimleri (yoklama, not, duyuru, odev), okunmamis sayaci |
| **Dashboard** | Rol bazli ozet paneller ve istatistikler |
| **Saglik Kontrolu** | Health check endpoint'i |

### Frontend Sayfalari (20+ Sayfa)

| Sayfa Grubu | Sayfalar |
|-------------|----------|
| **Kimlik Dogrulama** | Giris, Sifremi Unuttum |
| **Yonetim** | Okul Yonetimi, Kullanici Yonetimi, Sinif Yonetimi, Derslik Yonetimi, Ders Yonetimi, Akademik Yillar |
| **Egitim** | Ders Programi (3 sekme: Goruntule / Atamalar / FET), Not Yonetimi, Odev Yonetimi, Sinif Defteri |
| **Takip** | Yoklama, Yoklama Raporu, Devamsizlik Takibi |
| **Iletisim** | Duyurular, Bildirimler, Etkinlikler |
| **Diger** | Dashboard, Profil, Vekil Ogretmen |

### FET Ders Programi Entegrasyonu

FET (Free Timetable) acik kaynak yazilimi ile butunlesik otomatik ders programi olusturma:

- **XML Builder**: Okul verilerini (ogretmenler, dersler, siniflar, derslikler) FET uyumlu XML'e donusturur
- **FET Runner**: `fet-cl` komut satiri aracini calistirir
- **Output Parser**: FET ciktisini parse edip veritabanina aktarir
- **Kisitlama Destegi**: Ogretmen musaitligi, derslik kapasitesi, gun/saat kisitlamalari
- **Asenkron Uretim**: Job tabanlı kuyruk sistemi (status, result endpoint'leri)
- **HTTP API**: Express mikroservis olarak calisir (Port: 3002)

## Hizli Baslangic

### On Kosullar
- Node.js 20+
- PostgreSQL 16
- Redis 7 (opsiyonel, cache icin)
- FET (`sudo apt install fet`) - otomatik ders programi icin
- npm

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

# Veritabanini migrate edin
npm run db:migrate

# Demo verileri yukleyin
npm run db:seed

# Gelistirme sunucusunu baslatin (backend + frontend)
npm run dev
```

### Docker ile Calistirma

```bash
# Tum servisleri baslat
docker-compose up -d
```

Bu komut asagidaki servisleri baslatir:

| Servis | Adres |
|--------|-------|
| **Frontend** | `http://localhost:3000` |
| **Backend API** | `http://localhost:3001/api` |
| **Swagger Docs** | `http://localhost:3001/api/docs` (sadece development) |
| **FET Servisi** | `http://localhost:3002` |
| **PostgreSQL** | `localhost:5432` |
| **Redis** | `localhost:6379` |

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

Seed verileri yuklendikten sonra asagidaki hesaplarla giris yapabilirsiniz. **Tum sifreler: `123456`**

### Admin
| Rol | E-posta | Okul Slug |
|-----|---------|-----------|
| Super Admin | `admin@ogretimsayfam.com` | ataturk-anadolu |
| Okul Muduru (Admin) | `mudur@ataturk-anadolu.com` | ataturk-anadolu |

### Ogretmenler (8 Ogretmen)
| Ad Soyad | Brans | E-posta |
|-----------|-------|---------|
| Mehmet Kaya | Matematik | `ogretmen1@ataturk-anadolu.com` |
| Ayse Demir | Fizik | `ogretmen2@ataturk-anadolu.com` |
| Fatma Celik | Turk Dili ve Edebiyati | `ogretmen3@ataturk-anadolu.com` |
| Huseyin Yildiz | Kimya | `ogretmen4@ataturk-anadolu.com` |
| Zehra Aksoy | Biyoloji | `ogretmen5@ataturk-anadolu.com` |
| Mustafa Ozkan | Tarih | `ogretmen6@ataturk-anadolu.com` |
| Seda Korkmaz | Cografya | `ogretmen7@ataturk-anadolu.com` |
| Emre Tan | Ingilizce | `ogretmen8@ataturk-anadolu.com` |

### Ogrenciler (5 Ogrenci)
| Ad Soyad | E-posta |
|-----------|---------|
| Ali Ozturk | `ogrenci1@ataturk-anadolu.com` |
| Zeynep Arslan | `ogrenci2@ataturk-anadolu.com` |
| Burak Sahin | `ogrenci3@ataturk-anadolu.com` |
| Elif Koc | `ogrenci4@ataturk-anadolu.com` |
| Can Aydin | `ogrenci5@ataturk-anadolu.com` |

### Seed Veri Ozeti
| Veri Turu | Adet |
|-----------|------|
| Okul | 1 (Ataturk Anadolu Lisesi) |
| Ogretmen | 8 |
| Ogretmen Atamasi | 24 |
| Ogrenci | 5 |
| Veli | 2 |
| Duyuru | 6 |
| Etkinlik | 6 |
| Not | 75 |
| Odev | 7 |

## API Dokumantasyonu

Gelistirme modunda Swagger dokumantasyonuna erisebilirsiniz:

```
http://localhost:3001/api/docs
```

### Temel API Endpointleri

| Grup | Yol | Aciklama |
|------|-----|----------|
| **Auth** | `POST /api/auth/login` | Kullanici girisi |
| **Auth** | `POST /api/auth/register` | Kullanici kaydi (Admin) |
| **Auth** | `POST /api/auth/refresh` | Token yenileme |
| **Users** | `GET /api/users` | Kullanici listesi |
| **Schools** | `GET /api/schools` | Okul listesi |
| **Classes** | `GET /api/classes` | Sinif listesi |
| **Subjects** | `GET /api/subjects` | Ders listesi |
| **Classrooms** | `GET /api/classrooms` | Derslik listesi |
| **Timetable** | `GET /api/timetable/class/:id` | Sinif ders programi |
| **Timetable** | `POST /api/timetable/fet/generate` | Otomatik program uretimi (FET) |
| **Attendance** | `POST /api/attendance` | Yoklama alma |
| **Grades** | `POST /api/grades/bulk` | Toplu not girisi |
| **Assignments** | `POST /api/assignments` | Odev olusturma |
| **Announcements** | `GET /api/announcements` | Duyuru listesi |
| **Events** | `GET /api/events` | Etkinlik listesi |
| **Class Diary** | `GET /api/class-diary` | Sinif defteri kayitlari |
| **Substitutions** | `GET /api/substitutions` | Ders degisiklikleri |
| **Dashboard** | `GET /api/dashboard/admin` | Admin paneli |
| **Notifications** | `GET /api/notifications` | Bildirimler |
| **Health** | `GET /api/health` | Saglik kontrolu |

> Tum korunmali endpointler `Authorization: Bearer <token>` header'i gerektirir.
> Multi-tenant endpointler `X-School-Slug` header'i gerektirir.

### FET Servisi API (Port: 3002)

| Yol | Aciklama |
|-----|----------|
| `GET /health` | Servis durumu, FET erisimi, aktif is sayisi |
| `POST /api/fet/preview-xml` | FET XML onizleme (dosya indirme) |
| `POST /api/fet/generate` | Asenkron ders programi uretimi (jobId doner) |
| `POST /api/fet/generate-sync` | Senkron ders programi uretimi |
| `GET /api/fet/status/:jobId` | Is durumu sorgulama |
| `GET /api/fet/result/:jobId` | Tamamlanan sonucu alma |
| `DELETE /api/fet/job/:jobId` | Isi silme |

## Veritabani Semasi

### Ana Modeller (31 Tablo)

```
School ─┬── User ──┬── TeacherProfile
        │          ├── StudentProfile
        │          ├── ParentProfile
        │          └── RefreshToken
        │
        ├── Class ─┬── StudentProfile (many-to-one)
        │          ├── TimetableEntry
        │          └── Attendance
        │
        ├── Subject ─┬── TimetableEntry
        │            ├── TeacherAssignment
        │            ├── Grade
        │            └── ClassDiaryEntry
        │
        ├── Classroom ── TimetableEntry
        │
        ├── AcademicYear ── Term ─┬── Grade
        │                         └── Attendance
        │
        ├── Assignment ── AssignmentSubmission
        │
        ├── Announcement ─┬── AnnouncementRead
        │                 ├── AnnouncementClass
        │                 └── AnnouncementStudent
        │
        ├── Event ─┬── EventParticipant
        │          └── EventClass
        │
        ├── Substitution
        ├── Notification
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

| Onlem | Detay |
|-------|-------|
| **Helmet** | HTTP guvenlik header'lari (CSP, HSTS, X-Frame-Options) |
| **bcrypt** | Sifre hashleme (10 round) |
| **Rate Limiting** | Global: 60 istek/dakika, Giris: 5 istek/dakika |
| **CORS** | Yapilandirilabilir origin kontrolu |
| **JWT** | Access token (15dk) + Refresh token (7 gun, DB'de sakli) |
| **Validation Pipe** | Whitelist modu, tanimlanmamis alan reddi |
| **Rol Tabanli Erisim** | Guard ve decorator bazli yetkilendirme (RBAC) |
| **CSP** | Content Security Policy header'lari (Frontend) |
| **X-Frame-Options** | DENY - iframe icinde yukleme engeli |
| **HSTS** | Strict-Transport-Security |

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

## Paylasilan Sabitler (Shared Package)

| Sabit | Deger |
|-------|-------|
| **Varsayilan Ders Saatleri** | 8 ders (08:30 - 15:30) |
| **Not Agirliklari** | Sinav %40, Sozlu %15, Odev %15, Performans %15, Proje %15 |
| **Sayfalama** | Varsayilan: 20, Maksimum: 100 |
| **Token Suresi** | Access: 15 dakika, Refresh: 7 gun |

## Mimari Kararlar

- **Monorepo**: npm workspaces ile yonetilen coklu paket yapisi
- **Multi-Tenancy**: `schoolId` bazli satir seviyesi izolasyon, middleware ile zorlanan
- **FET Servisi**: Bagimsiz Express mikro servis olarak calisir, ana backend'den ayri
- **JWT Refresh Token**: Veritabaninda saklanir (uretimde Redis onerilir)
- **Swagger**: Sadece gelistirme ortaminda aktif (`NODE_ENV !== production`)
- **Docker Multi-Stage Build**: Optimize edilmis uretim imajlari, non-root kullanici
- **Global Exception Filter**: Standartlastirilmis hata yanitlari, stack trace gizleme (production)
- **Sidebar Navigasyonu**: Rol bazli dinamik menu (Super Admin 16, Admin 15, Ogretmen 8, Ogrenci 4, Veli 3 menu)

## Lisans

Bu proje ozel bir projedir.
