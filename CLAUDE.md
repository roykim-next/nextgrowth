# Growth Projection - Project Instructions

## Setup

```bash
npm install -g uipro-cli
pip install -r requirements.txt
```

## Environment

Copy `.env.example` to `.env` and fill in your Supabase credentials:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase anon key
- `FLASK_SECRET_KEY`: Any random secret string

## Running Locally

```bash
python app.py
```

App runs at `http://localhost:5000`. Default admin: `admin` / `password123`

## Deployment

```bash
vercel login   # first time only
vercel --prod --yes
```

## Key Notes

- **Supabase free tier**: Project auto-pauses after inactivity. If login fails with DNS error, go to Supabase dashboard and click "Resume project".
- **Retention model**: Two-segment Shifted Power Law anchored to D1 RR and D180 RR. Decay exponent b = -log(r180/r1) / log(180).
- **LT calculation**: LT = 1 + Σ(t=1 to N-1) r1 * t^(-b), where r1 = D1 RR / 100.
- All calculation logic is in `static/script.js`.
