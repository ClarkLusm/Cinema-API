# Run Without XAMPP

Backend nay da duoc chuan bi de chay voi MySQL/MariaDB bang Docker, khong can XAMPP.

## 1. Kiem tra file env

Neu chua co `.env`, copy tu `.env.example`.

Gia tri local mac dinh:

- `PORT=5000`
- `FRONTEND_URL=http://localhost:3000`
- `BACKEND_PUBLIC_URL=http://localhost:5000`
- `DB_HOST=127.0.0.1`
- `DB_PORT=3307`
- `DB_USER=root`
- `DB_PASSWORD=`
- `DB_NAME=db_cinema`

## 2. Khoi dong database

```bash
npm run docker:up
```

Du lieu MySQL se nam trong thu muc `D:\Cinema-API\.data\mysql`.

## 3. Tao database, chay migration va seed

```bash
npm run db:setup
```

Lenh nay se:

- doi MySQL san sang
- tao database neu chua co
- chay migration
- seed du lieu ban dau

## 4. Chay backend

```bash
npm run dev
```

Neu muon chay mot lenh tu dau:

```bash
npm run dev:full
```

## 5. Reset database khi can

```bash
npm run db:reset
```

Canh bao: lenh nay xoa database hien tai va seed lai tu dau.
