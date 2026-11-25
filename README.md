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

## Levélküldés: Microsoft Graph (tesotter.com)

A routeR a `MAIL_FROM` postafiók nevében küld a Microsoft Graph `sendMail` hívásával, jelszó nélkül.
Ha a Graph nincs beállítva, tartalékként SMTP-n megy (`EMAIL_USER` / `EMAIL_PASS`, opcionálisan `EMAIL_HOST` / `EMAIL_PORT`).

**1. Entra-alkalmazás** (entra.microsoft.com → Alkalmazásregisztrációk → Új regisztráció)
- Név: `routeR mail`, egyetlen tenant, átirányítási URI nem kell.
- Áttekintés: másold ki az **Alkalmazás (ügyfél) azonosítóját** → `MS_CLIENT_ID` és a **Címtár (bérlő) azonosítóját** → `MS_TENANT_ID`.
- Tanúsítványok és titkos kódok → Új titkos ügyfélkód (24 hónap) → az **Érték** oszlop → `MS_CLIENT_SECRET` (nem a „Titkos kód azonosítója”!).
- API-engedélyekhez **ne** adj `Mail.Send`-et: az az egész cég nevében engedne küldeni. A jogot a 2. lépés adja, egy postafiókra szűkítve.

**2. Jog csak egy postafiókra** (Exchange Online PowerShell, Exchange-rendszergazdaként)
```powershell
Install-Module ExchangeOnlineManagement   # egyszer
Connect-ExchangeOnline
# ObjectId: Entra → Vállalati alkalmazások → routeR mail → Objektumazonosító (NEM az app-regisztrációé)
New-ServicePrincipal -AppId <MS_CLIENT_ID> -ObjectId <vállalati alkalmazás objektumazonosító> -DisplayName "routeR mail"
New-ManagementScope -Name "routeR kuldo" -RecipientRestrictionFilter "PrimarySmtpAddress -eq 'sebastian.balog@tesotter.com'"
New-ManagementRoleAssignment -App <MS_CLIENT_ID> -Role "Application Mail.Send" -CustomResourceScope "routeR kuldo"
Test-ServicePrincipalAuthorization -Identity <MS_CLIENT_ID> -Resource sebastian.balog@tesotter.com   # InScope: True
```
A jogosultság érvénybe lépése 30 perc–2 óra lehet; addig a küldés 403-at ad.

**3. Ellenőrzés és élesítés**
- `.env.local`: `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MAIL_FROM` → `npm run mail:check -- cimzett@pelda.hu`
- Vercel: ugyanez a 4 változó Production környezetbe (`vercel env add …`), majd új deploy. Az admin felület „Teszt e-mail küldése” gombja kiírja a csatornát és a hibát.
- A titok lejárta előtt újat kell készíteni (az Entra figyelmeztet); lejárt titoknál a hibaüzenet ezt jelzi.
