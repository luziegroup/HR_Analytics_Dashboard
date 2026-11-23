# Luzie KPI & Performance Analytics

Dedicated platform for KPI target tracking, weighted attainment scoring, 9-box talent & performance analysis, and appraisal calibration.

## Concept & Scoring Model

- **KPI Attainment (%)**: Calculated per metric (`actual / target * 100`, or `target / actual * 100` for inverse metrics such as cycle time and defects), capped at `130%`.
- **Status Thresholds**: `Exceeded` ($\ge 105\%$), `On Track` ($85\text{--}104.9\%$), `At Risk` ($70\text{--}84.9\%$), `Off Track` ($< 70\%$).
- **Composite Performance Index (0–100)**: `70%` Weighted KPI Attainment + `30%` Behavioral Competency Score (`1.0–5.0`), mapped to a calibrated `1.0–5.0` Final Rating.
- **9-Box Matrix**: Maps Weighted KPI Attainment (X-axis) against Competency Score (Y-axis) for coaching and succession decisions.

## Project Structure

```text
src/
├── components/
│   ├── employee/          # PerformanceDrawer (per-owner KPI editor & calibration)
│   ├── layout/            # Sidebar, TopBar, FilterBar
│   └── ui/                # SectionCard, EmptyState, KpiStatusLabel
├── config/
│   └── navigation.ts      # Central navigation registry
├── data/
│   └── kpiDataset.ts      # Baseline employee reviews, KPI targets & quarterly history
├── features/
│   ├── calibration/       # Appraisal calibration & sign-off ledger
│   ├── import/            # Client-side KPI CSV upload & template export
│   ├── matrix/            # Interactive 9-Box matrix & rating distribution
│   ├── overview/          # Executive KPIs, quarterly trajectory & coaching queue
│   └── scorecard/         # Full KPI scorecard, live actual updates & target creation
├── hooks/
│   └── useKpiDashboard.ts # Central state, live KPI updates & filtering
├── types/
│   └── kpi.ts             # Domain TypeScript types
└── utils/
    ├── kpiAnalytics.ts    # Attainment, weighting & 9-box calculations
    └── kpiCsv.ts          # KPI CSV parser & exporter
```

## Isi KPI Mandiri & Validasi Leader

Model: **satu nilai final per orang per bulan + file KPI rinci sebagai pengecek**. Karyawan memilih nama dan bulan,
mengisi *Nilai final (%)* gabungan semua KPI, dan melampirkan **link file KPI rinci** (wajib). Leader membuka file itu,
mencocokkannya dengan daftar KPI dan bobot, lalu **Setujui**, **koreksi nilai** (alasan wajib), atau **Kembalikan**
(alasan wajib). Nilai resmi hanya dari kiriman berstatus *Tervalidasi* (maksimum 120%). Rekap bisa diunduh sebagai CSV.

Tahap sekarang memakai penyimpanan **localStorage** (`src/services/submissionStore.ts`) dan pilihan nama sebagai
pengganti login, jadi hanya untuk menyempurnakan sistem. Data belum dibagikan antar perangkat. Firebase hanya dipakai
konektor Google Drive dan dibiarkan kosong (`firebase-applet-config.json`).

Daftar KPI, bobot, dan apa yang dicek di file ada di `src/config/kpiDefinitions.ts` (rujukan saja, bukan isian);
tim dan leader di `src/config/team.ts`.
