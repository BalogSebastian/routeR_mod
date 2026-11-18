# routeR by tesotter

Kamion-útvonaltervező és fuvarköltség-kalkulátor, saját belépéssel és irányítópulttal.
Regisztráció után az admin jóváhagyja a hozzáférést; a jóváhagyott felhasználó saját fiókban tervez, ment és kezeli a járműveit.

## Funkciók
- **Belépés / regisztráció** (e-mail + jelszó, `iron-session` süti, bcrypt), **admin jóváhagyással**
- **Irányítópult**: statisztikák, legutóbbi fuvarok, járművek
- **Útvonaltervező**: kamion-routing (Valhalla), útdíj (2026-os hivatalos tarifák), komp/vasút, No-Go zónák, feltételes határátkelők, EU 561/2006 menetrend, tilalmak, útszakasz-idővonal (melyik úton, mikor)
- **Fuvarok mentése** a fiókba, újranyitás, átnevezés, törlés
- Beállítások (jármű, költségek, flotta, No-Go, átkelők) **fiókhoz kötve**, bármely eszközön elérhető
- **Admin felület**: új regisztrációk jóváhagyása / tiltása, admin jog
- Sofőr-oldal (`/sofor`): nyilvános link, belépés nélkül nyitható

## Adatbázis
MongoDB, **külön adatbázis** (`ROUTER_DB_NAME`, alapból `routeR`) saját kollekciókkal – a tesotterdev klaszter használható, az adatok elszigeteltek:

| kollekció | tartalom |
|---|---|
| `users` | fiókok (státusz: `pending` / `active` / `blocked`, szerep: `user` / `admin`) |
| `settings` | felhasználónkénti tervező-beállítások |
| `trips` | mentett fuvarok + összegzés |
| `ratelimits` | belépés / regisztráció korlátozás (TTL) |

## Indítás
```bash
cp .env.example .env.local   # töltsd ki
npm install
npm run dev
```

### Első admin
1. Regisztrálj az oldalon.
2. `npm run make-admin -- te@ceged.hu` – aktiválja és adminná teszi a fiókot.

Ezután a **Felhasználók** menüben (`/app/admin`) hagyhatod jóvá a további regisztrációkat. Ha az `EMAIL_USER` / `EMAIL_PASS` be van állítva, új regisztrációkor értesítést kapsz, jóváhagyáskor a felhasználó is.

## Környezeti változók
Lásd `.env.example`. Kötelező: `ROUTER_MONGODB_URI`, `ROUTER_SESSION_SECRET` (min. 32 karakter).

## Biztonság
Az összes `/api/*` végpont (routing, geokódolás, térkép-csempék stb.) aktív, jóváhagyott munkamenetet kér. A `/app` és `/planner` oldalak süti nélkül a belépőre irányítanak (`src/proxy.ts`), az adatbázisos ellenőrzés az oldalakban és az API-kban történik.
